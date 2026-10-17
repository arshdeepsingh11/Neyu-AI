// POST /api/nea/match — { concern } → up to 3 Nea treatments that fit.
// Neyu (Gemini) picks from Nea's real treatment list only; if AI is
// unavailable, a keyword match is used. Never diagnoses; emergencies are
// caught before any AI call.
import { NextResponse } from "next/server";
import { NEA_TREATMENTS, matchNeaTreatments } from "@/data/nea";
import { gemini } from "@backend/ai";
import { rateLimit } from "@backend/rateLimit";
import { clientMeta } from "@backend/patientAuth";
import { detectEmergencyKeywords, detectCrisisKeywords, CRISIS_MESSAGE } from "@/lib/emergencyDetection";

const EXTRA = /chest pain|can'?t breathe|cannot breathe|trouble breathing|faint|stroke|suicid|anaphyla|throat (is )?(swelling|closing)|severe (bleeding|allergic)/i;
const EMERGENCY = "This could need urgent care. If you have chest pain, trouble breathing, a severe allergic reaction or other emergency symptoms, call 911 or go to the nearest emergency department.";

export async function POST(req: Request) {
  const { ip } = await clientMeta();
  if (!(await rateLimit(`nea-match:${ip}`, 12, 60_000))) return NextResponse.json({ error: "Too many requests — try again in a minute." }, { status: 429 });
  let concern = "";
  try { concern = String((await req.json())?.concern || "").trim().slice(0, 400); } catch { /* */ }
  if (concern.length < 3) return NextResponse.json({ error: "Tell us a little about your concern." }, { status: 400 });
  if (detectCrisisKeywords(concern)) return NextResponse.json({ emergency: CRISIS_MESSAGE, picks: [] });
  if (detectEmergencyKeywords(concern) || EXTRA.test(concern)) return NextResponse.json({ emergency: EMERGENCY, picks: [] });

  const list = NEA_TREATMENTS.map((t) => `${t.id}: ${t.name} — ${t.summary}`).join("\n");
  const system = `You are Neyu, the assistant on NEYU Health's page for its partner clinic Nea Precision Skin (Calgary).
Given a person's skin, hair, body or wellness concern, choose 1 to 3 treatments ONLY from this list (use the exact id):
${list}
Rules: never diagnose, never promise results, never mention prices or medications/doses. Friendly, plain language.
Reply with ONLY JSON: {"intro":"one short sentence","picks":[{"id":"<id>","why":"one short sentence why it may fit"}]}
If nothing fits, return {"intro":"...suggest the free 15-minute consultation...","picks":[]}.`;
  const raw = await gemini(system, concern, { maxTokens: 350, temperature: 0.3 });
  if (raw) {
    try {
      const j = JSON.parse(raw.replace(/^```(json)?|```$/g, "").trim());
      const picks = (Array.isArray(j.picks) ? j.picks : [])
        .filter((p: any) => NEA_TREATMENTS.some((t) => t.id === p?.id))
        .slice(0, 3)
        .map((p: any) => ({ id: String(p.id), why: String(p.why || "").slice(0, 200) }));
      return NextResponse.json({ byAlba: true, intro: String(j.intro || "").slice(0, 240), picks });
    } catch { /* fall through */ }
  }
  const found = matchNeaTreatments(concern);
  return NextResponse.json({
    byAlba: false,
    intro: found.length ? "Based on what you described, these Nea treatments are a good place to start:" : "We couldn't match that to a specific treatment — Nea's free 15-minute consultation is the best next step.",
    picks: found.map((t) => ({ id: t.id, why: t.summary })),
  });
}
