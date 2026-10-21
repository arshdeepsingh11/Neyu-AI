// GET /api/portal/oauth/{withings|oura|whoop}/start — one-time connection.
// Sets a short-lived, signed state cookie and sends the patient to the maker's sign-in.
// ?h=… is the one-time link from the NEYU app (the phone's browser has no sign-in).
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCurrentPatient } from "@backend/patientAuth";
import { authorizeUrl, isOAuthProvider, oauthConfigured, baseUrl } from "@backend/oauth";
import { takeHandoff, stateCookie, backToAppPage } from "@backend/oauthHandoff";

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const base = baseUrl(req);
  const h = new URL(req.url).searchParams.get("h");
  const fromApp = !!h;
  const patientId = h ? await takeHandoff(h, provider) : (await getCurrentPatient())?.id;
  if (!patientId) return fromApp ? backToAppPage(`oauth=expired&p=${encodeURIComponent(provider)}`) : NextResponse.redirect(`${base}/my-health/sign-in?next=${encodeURIComponent("/my-health?s=devices")}`);
  if (!isOAuthProvider(provider) || !oauthConfigured(provider)) return fromApp ? backToAppPage("oauth=unavailable") : NextResponse.redirect(`${base}/my-health?s=devices&oauth=unavailable`);
  const state = randomBytes(18).toString("base64url");
  const res = NextResponse.redirect(authorizeUrl(provider, state, req));
  res.cookies.set("anra_oauth", stateCookie(provider, state, patientId, fromApp ? "app" : "web"), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/portal/oauth", maxAge: 600 });
  return res;
}
