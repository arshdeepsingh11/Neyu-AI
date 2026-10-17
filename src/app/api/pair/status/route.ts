// GET /api/pair/status?code=… — the phone page polls this after pairing to
// show "NEYU received your data". Works for 2 hours after the code was used.
import { NextResponse } from "next/server";
import { prisma } from "@backend/db";
import { sha256, clientMeta } from "@backend/patientAuth";
import { rateLimit } from "@backend/rateLimit";
import { METRIC_DEFS, isMetricKey } from "@/lib/portal/metrics";
import { toResponse, HttpError } from "@backend/apiHelpers";

export async function GET(req: Request) {
  try {
    const { ip } = await clientMeta();
    if (!(await rateLimit(`pair-status:${ip}`, 40, 60_000))) throw new HttpError(429, "Too many requests.");
    const code = (new URL(req.url).searchParams.get("code") || "").slice(0, 64);
    const row = code ? await prisma.devicePairing.findUnique({ where: { codeHash: sha256(code) } }) : null;
    if (!row?.usedAt || Date.now() - row.usedAt.getTime() > 2 * 3_600_000) throw new HttpError(404, "Not found.");
    const c = await prisma.deviceConnection.findUnique({ where: { patientId_provider: { patientId: row.patientId, provider: row.provider } }, select: { status: true, lastAttemptAt: true, lastResult: true } });
    let r: { stored: number; metrics: string[]; rejected: { field: string; reason: string }[] } | null = null;
    try { r = c?.lastResult ? JSON.parse(c.lastResult) : null; } catch { r = null; }
    return NextResponse.json({
      connected: c?.status === "connected",
      lastAttemptAt: c?.lastAttemptAt?.toISOString() ?? null,
      stored: r?.stored ?? 0,
      metrics: (r?.metrics || []).map((m) => (isMetricKey(m) ? METRIC_DEFS[m].name : m)),
      rejected: r?.rejected || [],
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return toResponse(e); }
}
