// GET /api/cron/daily — runs the hourly daily jobs (backend/daily.ts) plus the privacy
// sweep. Call every hour with header  Authorization: Bearer $CRON_SECRET
// Not needed when Redis is set up: the background worker runs both every hour.
import { NextResponse } from "next/server";
import { baseUrl } from "@backend/oauth";
import { runDaily } from "@backend/daily";
import { privacySweep } from "@backend/privacy";

export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const out = await runDaily(baseUrl(req));
  const privacy = await privacySweep();
  return NextResponse.json({ ...out, privacy });
}
