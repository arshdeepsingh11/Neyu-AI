// GET /api/portal/oauth/{provider}/callback — the maker sends the patient back
// here with a code; we swap it for tokens (encrypted), pull 30 days, and
// return to Devices.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@backend/db";
import { getCurrentPatient, clientMeta } from "@backend/patientAuth";
import { exchangeCode, saveTokens, syncConnection, isOAuthProvider, baseUrl } from "@backend/oauth";
import { DEVICE_CATALOG } from "@/lib/portal/devices";
import { audit } from "@backend/audit";
import { readStateCookie, backToAppPage } from "@backend/oauthHandoff";

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const base = baseUrl(req), url = new URL(req.url);
  const jar = await cookies();
  const c = readStateCookie(jar.get("anra_oauth")?.value);
  // Started in the NEYU app → finish in the phone's browser and hand back to the app.
  const back = (q: string) => {
    const r = c?.mode === "app" ? backToAppPage(q) : NextResponse.redirect(`${base}/my-health?s=devices&${q}`);
    if (r instanceof NextResponse) r.cookies.set("anra_oauth", "", { path: "/api/portal/oauth", maxAge: 0 });
    else r.headers.append("Set-Cookie", "anra_oauth=; Path=/api/portal/oauth; Max-Age=0; HttpOnly; SameSite=Lax");
    return r;
  };
  // Web: the patient must still be signed in as the same person. App: the signed cookie says who.
  const patientId = c?.mode === "app" ? c.patientId : (await getCurrentPatient())?.id;
  if (!patientId || !isOAuthProvider(provider)) return back("oauth=failed");
  if (url.searchParams.get("error")) return back(`oauth=cancelled&p=${provider}`);
  const code = url.searchParams.get("code"), state = url.searchParams.get("state");
  if (!code || !state || !c || c.provider !== provider || c.state !== state || c.patientId !== patientId) return back(`oauth=failed&p=${provider}`);
  const patient = { id: patientId };
  try {
    const t = await exchangeCode(provider, code, req);
    const dev = DEVICE_CATALOG.find((d) => d.id === provider)!;
    await saveTokens(patient.id, provider, t, dev.signals.map((s) => s.label));
    const conn = await prisma.deviceConnection.findUnique({ where: { patientId_provider: { patientId: patient.id, provider } }, select: { id: true } });
    if (conn) await syncConnection(conn.id, 30);
    audit(patient.id, "patient", "create", `device:${provider}:oauth`, (await clientMeta()).ip);
    return back(`connected=${provider}`);
  } catch (e: any) {
    console.error("OAuth callback failed:", e?.message);
    return back(`oauth=failed&p=${provider}`);
  }
}
