// GET /api/v1/metrics — numbers for a monitoring system (Prometheus text format).
// Needs METRICS_TOKEN in .env and the header "Authorization: Bearer <METRICS_TOKEN>".
// Without METRICS_TOKEN the endpoint is off (404).
import { timingSafeEqual, createHash } from "crypto";
import { snapshot, prometheus } from "@backend/monitor";

export const dynamic = "force-dynamic";

const same = (a: string, b: string) => timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

export async function GET(req: Request) {
  const token = process.env.METRICS_TOKEN || "";
  if (token.length < 16) return new Response("Not found", { status: 404 });
  const got = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!got || !same(got, token)) return new Response("Unauthorized", { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  return new Response(prometheus(await snapshot()), { headers: { "Content-Type": "text/plain; version=0.0.4", "Cache-Control": "no-store" } });
}
