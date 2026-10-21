// Unsubscribe without signing in (link in every reminder / news email).
// GET  /api/unsubscribe?t=TOKEN                → current preferences (masked email)
// POST /api/unsubscribe?t=TOKEN { scope }      → scope: all | news | reminders
//      Mail apps' one-click button (RFC 8058) POSTs "List-Unsubscribe=One-Click" → all.
import { NextResponse } from "next/server";
import { unsubscribe, unsubscribeInfo } from "@backend/privacy";
import { clientMeta } from "@backend/patientAuth";
import { rateLimit } from "@backend/rateLimit";
import { toResponse, HttpError, NO_STORE } from "@backend/apiHelpers";

export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t") || "";
  const info = await unsubscribeInfo(t);
  return info ? NextResponse.json(info, { headers: NO_STORE }) : NextResponse.json({ error: "This link isn't valid any more." }, { status: 404, headers: NO_STORE });
}

export async function POST(req: Request) {
  try {
    const { ip } = await clientMeta();
    if (!(await rateLimit(`unsub:${ip}`, 30, 10 * 60_000))) throw new HttpError(429, "Please wait a few minutes.");
    const t = new URL(req.url).searchParams.get("t") || "";
    const raw = await req.text();
    let scope: "all" | "news" | "reminders" = "all";
    if (raw && !raw.includes("List-Unsubscribe=One-Click")) {
      try { const b = JSON.parse(raw); if (b.scope === "news" || b.scope === "reminders") scope = b.scope; } catch { /* default all */ }
    }
    return NextResponse.json({ ok: true, ...(await unsubscribe(t, scope, { ip })) }, { headers: NO_STORE });
  } catch (e) {
    return toResponse(e);
  }
}
