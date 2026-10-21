// Audit log read models (Phase 3 · part 3).
// Source: AuditEvent — the platform-wide, append-only log (staff, old shared
// password, command-line tools, background jobs). Nothing here can edit or delete.

import { prisma } from "@backend/db";
import type { Prisma } from "@prisma/client";

const DAY = 86400_000;

export interface PlatformAuditRow {
  id: string; at: string; actorType: string; actor: string; role: string | null; action: string; detail: string;
  resource: string; subject: string | null; subjectPatientId: string | null; reason: string | null; result: string; ip: string | null;
}

export async function platformAudit(q: URLSearchParams): Promise<{ rows: PlatformAuditRow[]; next: string | null }> {
  const where: Prisma.AuditEventWhereInput = {};
  const text = (q.get("q") || "").trim().slice(0, 80);
  const action = q.get("action"), result = q.get("result"), actorType = q.get("actorType");
  const from = q.get("from"), to = q.get("to");
  if (action && /^[a-z_]{2,20}$/.test(action)) where.action = action;
  if (result === "denied" || result === "success" || result === "error") where.result = result;
  if (actorType && /^[a-z_]{2,20}$/.test(actorType)) where.actorType = actorType;
  if (q.get("reason") === "1") where.reason = { not: null };
  if (from || to) where.at = { ...(from ? { gte: new Date(from + "T00:00:00Z") } : {}), ...(to ? { lt: new Date(new Date(to + "T00:00:00Z").getTime() + DAY) } : {}) };
  if (text) where.OR = [
    { actorLabel: { contains: text, mode: "insensitive" } }, { resource: { contains: text, mode: "insensitive" } },
    { reason: { contains: text, mode: "insensitive" } }, { ip: { contains: text } }, { subjectPatientId: text }, { subjectId: text },
  ];
  const take = 60;
  const cursor = q.get("cursor");
  const rows = await prisma.auditEvent.findMany({
    where, orderBy: [{ at: "desc" }, { id: "desc" }], take: take + 1,
    ...(cursor ? { cursor: { id: cursor.slice(0, 40) }, skip: 1 } : {}),
  });
  const more = rows.length > take;
  return {
    rows: rows.slice(0, take).map((e) => {
      const m = (e.meta || {}) as Record<string, any>;
      return {
        id: e.id, at: e.at.toISOString(), actorType: e.actorType, actor: e.actorLabel || e.actorType, role: m.role ?? null,
        action: e.action, detail: m.action || m.change || e.action, resource: e.resource, subject: m.subject || m.email || null,
        subjectPatientId: e.subjectPatientId, reason: e.reason, result: e.result, ip: e.ip,
      };
    }),
    next: more ? rows[take - 1].id : null,
  };
}

export async function auditStats() {
  const since14 = new Date(Date.now() - 13 * DAY);
  since14.setUTCHours(0, 0, 0, 0);
  const since24 = new Date(Date.now() - DAY), since7 = new Date(Date.now() - 7 * DAY);
  const [byDay, last24, denied24, glass7, staff7, top, actions] = await Promise.all([
    prisma.$queryRaw<{ d: Date; ok: bigint; denied: bigint }[]>`
      select date_trunc('day', "at") as d,
             count(*) filter (where "result" = 'success') as ok,
             count(*) filter (where "result" <> 'success') as denied
      from "AuditEvent" where "at" >= ${since14} group by 1 order by 1`,
    prisma.auditEvent.count({ where: { at: { gte: since24 } } }),
    prisma.auditEvent.count({ where: { at: { gte: since24 }, result: { not: "success" } } }),
    prisma.auditEvent.count({ where: { at: { gte: since7 }, reason: { not: null } } }),
    prisma.auditEvent.groupBy({ by: ["actorId"], where: { at: { gte: since7 }, actorType: "staff" } }),
    prisma.auditEvent.groupBy({ by: ["actorLabel"], where: { at: { gte: since7 }, actorType: "staff" }, _count: { _all: true }, orderBy: { _count: { actorLabel: "desc" } }, take: 5 }),
    prisma.auditEvent.groupBy({ by: ["action"], where: { at: { gte: since7 } }, _count: { _all: true }, orderBy: { _count: { action: "desc" } }, take: 8 }),
  ]);
  const days: { day: string; ok: number; denied: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(since14.getTime() + i * DAY);
    const hit = byDay.find((r) => new Date(r.d).toISOString().slice(0, 10) === d.toISOString().slice(0, 10));
    days.push({ day: d.toISOString().slice(0, 10), ok: Number(hit?.ok || 0), denied: Number(hit?.denied || 0) });
  }
  return {
    days,
    last24, denied24, breakGlass7: glass7, activeStaff7: staff7.length,
    topStaff: top.map((t) => ({ who: t.actorLabel || "—", n: t._count._all })),
    actions: actions.map((a) => ({ action: a.action, n: a._count._all })),
  };
}
