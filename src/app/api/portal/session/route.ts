// GET /api/portal/session — lightweight signed-in check for the site-wide
// account button and the NEYU phone app (id keeps each person's phone settings apart).
// Returns no health data.
import { NextResponse } from "next/server";
import { getCurrentPatient } from "@backend/patientAuth";

export async function GET() {
  const p = await getCurrentPatient().catch(() => null);
  const body = p
    ? { signedIn: true, id: p.id, verified: p.emailVerified, firstName: p.firstName, initials: (p.firstName[0] + (p.lastName[0] || "")).toUpperCase(), photoUrl: p.photoVersion > 0 ? `/api/portal/avatar?v=${p.photoVersion}` : null }
    : { signedIn: false };
  return NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } });
}
