import { NextRequest, NextResponse } from "next/server";
import { getOrCreateSessionId } from "@backend/session";
import { logPageVisit, logOutboundClick } from "@backend/logging";
import { rateLimit } from "@backend/rateLimit";

// POST { path, referrer }            — a page view
// POST { outbound: url, from: path } — a click to another site (partner links etc.)
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = JSON.parse((await req.text()) || "{}");
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { path, referrer, outbound, from } = body || {};
  const isOutbound = typeof outbound === "string" && outbound.length < 2000;
  if (!isOutbound && (!path || typeof path !== "string")) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }
  // Staff pages are not visitor activity.
  if (!isOutbound && (path.startsWith("/admin") || path.startsWith("/share/"))) return NextResponse.json({ ok: true });

  try {
    const sessionId = await getOrCreateSessionId();
    if (!(await rateLimit(`visit:${sessionId}`, 120, 60 * 1000))) return NextResponse.json({ ok: false });
    const userAgent = req.headers.get("user-agent") || undefined;

    if (isOutbound) {
      await logOutboundClick({ sessionId, url: outbound, fromPath: typeof from === "string" ? from : undefined });
    } else {
      await logPageVisit({
        path: path.slice(0, 300),
        sessionId,
        userAgent,
        referrer: typeof referrer === "string" ? referrer.slice(0, 300) : undefined,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to log page visit:", err);
    // Never let logging failures surface as a broken experience.
    return NextResponse.json({ ok: false });
  }
}
