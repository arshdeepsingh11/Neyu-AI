// POST /api/log-event { type: "search"|"click", label, path, target? } — anonymous interest
// signals for Insights. Only the browser session id is stored (no name, no account).
// Ignored when the browser sends Do Not Track / Global Privacy Control, or the visitor
// turned statistics off on /cookies (cookie neyu_stats=off).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@backend/db";
import { getOrCreateSessionId } from "@backend/session";
import { rateLimit } from "@backend/rateLimit";
import { requestOptedOut } from "@/lib/statsConsent";

// Searches can contain anything people type: drop emails and long numbers (phones, health numbers).
const scrub = (s: string) => s.replace(/[^\s@]+@[^\s@]+/g, "[email]").replace(/\d[\d\s().-]{5,}\d/g, "[number]").replace(/\s+/g, " ").trim();

export async function POST(req: NextRequest) {
  try {
    if (requestOptedOut(req)) return NextResponse.json({ ok: true }); // DNT, GPC or turned off on /cookies
    const b = JSON.parse((await req.text()).slice(0, 4000) || "{}");
    const type = b.type === "search" || b.type === "click" ? b.type : null;
    const label = typeof b.label === "string" ? scrub(b.label).slice(0, 80) : "";
    const path = typeof b.path === "string" && b.path.startsWith("/") ? b.path.slice(0, 200) : "";
    if (!type || label.length < 2 || !path || /^\/(admin|share|my-health|api)(\/|$)/.test(path)) return NextResponse.json({ ok: true });
    const target = typeof b.target === "string" ? b.target.slice(0, 200) : null;
    const sessionId = await getOrCreateSessionId();
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
    // Per browser and per network: a script without cookies can't flood the table.
    if (!(await rateLimit(`event:${sessionId}`, 60, 60_000)) || !(await rateLimit(`event-ip:${ip}`, 300, 60_000))) return NextResponse.json({ ok: false });
    const ua = req.headers.get("user-agent") || "";
    await prisma.siteEvent.create({ data: { sessionId, type, label: type === "search" ? label.toLowerCase() : label, path, target, device: /Mobi|Android|iPhone|iPad/i.test(ua) ? "mobile" : "desktop" } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }); // logging never breaks the page
  }
}
