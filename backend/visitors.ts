// Anonymous visitor records.
//
// Every browser gets an anra_session_id cookie (backend/session.ts). The
// first time we see it we create a Visitor row with a short public ID
// ("v_7Q2K9X") that staff see in the admin console — the cookie value itself
// never leaves the server. When the visitor signs up or signs in to My Health
// Space, linkVisitorToPatient() attaches the visitor and merges their
// anonymous activity into the patient record ("Before sign-up").

import { randomInt } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@backend/db";

const SESSION_COOKIE_NAME = "anra_session_id";
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/O/1/I

export function newVisitorId(): string {
  let s = "v_";
  for (let i = 0; i < 6; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

/** Create the visitor if new; optionally count a page view. Never throws. */
export async function touchVisitor(sessionId: string, opts: { path?: string; referrer?: string; userAgent?: string; pageView?: boolean } = {}) {
  if (!sessionId) return;
  try {
    const now = new Date();
    const existing = await prisma.visitor.findUnique({ where: { sessionId }, select: { id: true } });
    if (existing) {
      await prisma.visitor.update({
        where: { sessionId },
        data: { lastSeenAt: now, ...(opts.pageView ? { pageCount: { increment: 1 } } : {}), ...(opts.userAgent ? { userAgent: opts.userAgent.slice(0, 300) } : {}) },
      });
      return;
    }
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        await prisma.visitor.create({
          data: {
            id: newVisitorId(), sessionId, firstSeenAt: now, lastSeenAt: now, pageCount: opts.pageView ? 1 : 0,
            landingPath: opts.path?.slice(0, 300), referrer: opts.referrer?.slice(0, 300), userAgent: opts.userAgent?.slice(0, 300),
          },
        });
        return;
      } catch (e: any) {
        if (e?.code !== "P2002") throw e;
        // Unique clash: either another request created this session's row, or the random ID collided.
        if (await prisma.visitor.findUnique({ where: { sessionId }, select: { id: true } })) return;
      }
    }
  } catch (e: any) {
    console.error("Visitor tracking failed:", e?.message);
  }
}

/** The current browser's anonymous session ID, without creating one. */
export async function currentSessionId(): Promise<string | null> {
  try {
    return (await cookies()).get(SESSION_COOKIE_NAME)?.value || null;
  } catch {
    return null;
  }
}

/**
 * Attach this browser's visitor record to a patient and move its anonymous
 * activity into the patient record. A visitor already linked to a different
 * patient (shared computer) is left alone, so nobody inherits someone else's
 * history. Never throws — sign-in must not fail because of this.
 */
export async function linkVisitorToPatient(sessionId: string | null, patientId: string) {
  if (!sessionId) return;
  try {
    await touchVisitor(sessionId);
    const v = await prisma.visitor.findUnique({ where: { sessionId }, select: { id: true, patientId: true } });
    if (!v) return;
    if (v.patientId && v.patientId !== patientId) return;
    if (!v.patientId) await prisma.visitor.update({ where: { sessionId }, data: { patientId, convertedAt: new Date() } });
    const where = { sessionId, patientId: null };
    const data = { patientId };
    await prisma.$transaction([
      prisma.symptomCheckLog.updateMany({ where, data }),
      prisma.albaConversation.updateMany({ where, data }),
      prisma.longevityAssessment.updateMany({ where, data }),
      prisma.labResultCheck.updateMany({ where, data }),
      prisma.referralSubmission.updateMany({ where, data }),
    ]);
  } catch (e: any) {
    console.error("Visitor merge failed:", e?.message);
  }
}

/**
 * Activity recorded before visitor records existed has a sessionId but no Visitor row.
 * Creates the missing rows (oldest first). Everything is worked out inside PostgreSQL —
 * only the missing sessions come back — so it stays fast on millions of page views.
 * Runs in the background worker (hourly), never inside a page request.
 *   sinceDays: only look at activity this recent (null = all history, used once).
 */
export async function backfillVisitors(opts: { limit?: number; sinceDays?: number | null } = {}) {
  const limit = Math.min(Math.max(opts.limit ?? 2000, 1), 20000);
  const since = opts.sinceDays == null ? new Date(0) : new Date(Date.now() - opts.sinceDays * 86400_000);
  const acts = [
    `select "sessionId", "createdAt", path, "userAgent", referrer, 1 page from "PageVisit" where "createdAt" >= $1`,
    ...["SymptomCheckLog", "AlbaConversation", "LongevityAssessment", "LabResultCheck", "ReferralSubmission"].map(
      (t) => `select "sessionId", "createdAt", null, null, null, 0 from "${t}" where "createdAt" >= $1`),
  ].join(" union all ");
  const rows = await prisma.$queryRawUnsafe<{ sessionId: string; first: Date; last: Date; pages: number; landing: string | null; ua: string | null; ref: string | null }[]>(
    `with acts as (${acts}),
          missing as (select a.* from acts a where a."sessionId" <> '' and not exists (select 1 from "Visitor" v where v."sessionId" = a."sessionId"))
     select "sessionId", min("createdAt") first, max("createdAt") last, sum(page)::int pages,
            (array_agg(path order by "createdAt") filter (where path is not null))[1] landing,
            (array_agg("userAgent" order by "createdAt") filter (where "userAgent" is not null))[1] ua,
            (array_agg(referrer order by "createdAt") filter (where referrer is not null))[1] ref
     from missing group by "sessionId" order by min("createdAt") limit $2`, since, limit);
  if (!rows.length) return 0;
  const r = await prisma.visitor.createMany({
    data: rows.map((x) => ({ id: newVisitorId(), sessionId: x.sessionId, firstSeenAt: x.first, lastSeenAt: x.last, pageCount: x.pages, landingPath: x.landing, referrer: x.ref, userAgent: x.ua })),
    skipDuplicates: true, // a visit recorded at the same moment — picked up as normal
  });
  return r.count;
}
