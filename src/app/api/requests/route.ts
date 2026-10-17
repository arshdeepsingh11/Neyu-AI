// POST /api/requests — a request from one of the new NEYU service pages
// (virtual care, Virtual Hypertension Clinic, packages, membership, at-home
// collection). Validated, rate-limited, emergency-checked, saved for staff.
// Nothing is booked or charged here; the team follows up.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@backend/db";
import { rateLimit } from "@backend/rateLimit";
import { clientMeta } from "@backend/patientAuth";
import { getOrCreateSessionId } from "@backend/session";
import { detectEmergencyKeywords, detectCrisisKeywords, EMERGENCY_MESSAGE, CRISIS_MESSAGE } from "@/lib/emergencyDetection";

const SERVICES = ["virtual-care", "hypertension-clinic", "package", "membership", "at-home", "contact", "careers"] as const;
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export async function POST(req: NextRequest) {
  const { ip } = await clientMeta();
  if (!(await rateLimit(`requests:${ip}`, 6, 60_000))) return NextResponse.json({ error: "Too many requests — please try again in a minute." }, { status: 429 });
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
  const service = clip(b.service, 40);
  if (!(SERVICES as readonly string[]).includes(service)) return NextResponse.json({ error: "Unknown service" }, { status: 400 });
  const name = clip(b.name, 120), email = clip(b.email, 200).toLowerCase();
  if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Please add your name and a valid email." }, { status: 400 });
  const message = clip(b.message, 1000);
  // Safety net: a request form is not where an emergency should wait.
  if (detectCrisisKeywords(message)) return NextResponse.json({ emergency: CRISIS_MESSAGE });
  if (detectEmergencyKeywords(message)) return NextResponse.json({ emergency: EMERGENCY_MESSAGE });
  try {
    const sessionId = await getOrCreateSessionId().catch(() => null);
    const r = await prisma.serviceRequest.create({
      data: { service, name, email, phone: clip(b.phone, 40) || null, choice: clip(b.choice, 160) || null, postal: clip(b.postal, 10).toUpperCase() || null, message: message || null, page: clip(b.page, 120) || null, sessionId },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: r.id });
  } catch (err) {
    console.error("Failed to save service request:", err);
    return NextResponse.json({ error: "We couldn't save your request — please call 403-475-4475." }, { status: 500 });
  }
}
