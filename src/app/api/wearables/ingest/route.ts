// POST /api/wearables/ingest — wearable data in (Apple Watch via iOS Shortcuts
// today; the same endpoint serves a native companion app later).
//
// Auth: "Authorization: Bearer anra_dev_…", or the private sync link from QR
// pairing (…/api/wearables/ingest?k=anra_dev_…). Only the SHA-256 is stored.
// Every call is logged on the device (lastAttemptAt/lastResult) so the
// patient can see what arrived; the device only turns "connected" once
// real data has been stored.
// Body: see backend/wearables.ts (structured or flat Shortcuts object).
// Only metrics the patient allows for that device are stored; the rest are
// reported back as rejected. Re-sending the same day overwrites (idempotent).
import { NextResponse } from "next/server";
import { prisma } from "@backend/db";
import { sha256, clientMeta } from "@backend/patientAuth";
import { rateLimit } from "@backend/rateLimit";
import { audit } from "@backend/audit";
import { parseIngest } from "@backend/wearables";
import { storeReadings, storeBp } from "@backend/health";
import { allowedMetrics } from "@/lib/portal/devices";
import { readJson, toResponse, HttpError } from "@backend/apiHelpers";
import type { ProviderId } from "@/lib/portal/types";

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    // The key in the sync link wins, so an old Authorization header left in a shortcut can't break it.
    const token = (new URL(req.url).searchParams.get("k") || "").trim() || (auth.startsWith("Bearer ") ? auth.slice(7).trim() : "");
    if (!token.startsWith("anra_dev_") || token.length > 80) throw new HttpError(401, "Missing or invalid device token.");
    const { ip } = await clientMeta();
    if (!(await rateLimit(`ingest:${sha256(token).slice(0, 16)}`, 60, 60_000))) throw new HttpError(429, "Too many requests.");

    const conn = await prisma.deviceConnection.findUnique({
      where: { tokenHash: sha256(token) },
      select: { id: true, provider: true, status: true, dataTypes: true, patient: { select: { id: true, timezone: true, settings: { select: { shareWearables: true } } } } },
    });
    if (!conn || conn.status === "disconnected") throw new HttpError(401, "Missing or invalid device token.");
    const log = (stored: number, metrics: string[], rejected: { field: string; reason: string }[], extra: object = {}) =>
      prisma.deviceConnection.update({ where: { id: conn.id }, data: { lastAttemptAt: new Date(), lastResult: JSON.stringify({ stored, metrics, rejected: rejected.slice(0, 8) }), ...extra } });
    if (conn.patient.settings && !conn.patient.settings.shareWearables) {
      await log(0, [], [{ field: "all", reason: "Wearable sharing is turned off in Privacy & Data" }]);
      throw new HttpError(403, "Wearable sharing is turned off in Privacy & Data.");
    }

    let body: unknown;
    try { body = await readJson(req, 2_000_000); }
    catch (e) { await log(0, [], [{ field: "body", reason: "not valid JSON — set Request Body to JSON" }]); throw e; }
    const { readings, rejected } = parseIngest(body, conn.patient.timezone);
    const allowed = allowedMetrics(conn.provider as ProviderId, JSON.parse(conn.dataTypes || "[]"));
    const accepted = readings.filter((r) => allowed.has(r.metric));
    readings.filter((r) => !allowed.has(r.metric)).forEach((r) => rejected.push({ field: r.metric, reason: "not shared for this device (Devices → Manage)" }));

    const patientId = conn.patient.id, source = conn.provider;
    // Blood pressure also goes to the home-BP log (Heart screen).
    const bp = accepted.filter((r) => r.metric === "bp" && r.valueText).map((r) => { const [sys, dia] = r.valueText!.split("/").map(Number); return { sys, dia, takenAt: new Date(Math.floor(r.recordedAt.getTime() / 1000) * 1000) }; });
    await storeReadings(patientId, source, accepted.filter((r) => r.metric !== "bp"));
    if (bp.length) await storeBp({ id: patientId, timezone: conn.patient.timezone }, source, bp);
    const now = new Date();
    const metrics = [...new Set(accepted.map((r) => r.metric))];
    await log(accepted.length, metrics, rejected, accepted.length ? { status: "connected", lastSyncAt: now, ...(conn.status === "pending" ? { connectedAt: now } : {}) } : {});
    audit(patientId, "device", "create", `readings:${source}:${accepted.length}`, ip);
    const message = accepted.length ? `NEYU received ${metrics.length} kind${metrics.length === 1 ? "" : "s"} of data.` : rejected.length ? "Nothing stored — see rejected." : "Nothing stored — Apple Health had no samples for today yet.";
    return NextResponse.json({ ok: true, stored: accepted.length, metrics, rejected, message }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return toResponse(e);
  }
}
