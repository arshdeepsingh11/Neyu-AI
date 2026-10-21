// POST /api/nea/ask — { question, history? } → Neyu answers questions about
// Nea Precision Skin using ONLY Nea's published information. Emergencies and
// crisis language are caught before any AI call. Without an AI key, answers
// come from Nea's FAQ and treatment descriptions (keyword match).
import { NextResponse } from "next/server";
import { NEA, NEA_TREATMENTS, NEA_PACKAGES, NEA_FAQ, matchNeaTreatments } from "@/data/nea";
import { gemini } from "@backend/ai";
import { rateLimit } from "@backend/rateLimit";
import { clientMeta } from "@backend/patientAuth";
import { detectEmergencyKeywords, detectCrisisKeywords, CRISIS_MESSAGE } from "@/lib/emergencyDetection";

const EXTRA = /chest pain|can'?t breathe|cannot breathe|trouble breathing|faint|stroke|suicid|anaphyla|throat (is )?(swelling|closing)|severe (bleeding|allergic)/i;
const EMERGENCY = "This could need urgent care. If you have chest pain, trouble breathing, a severe allergic reaction or other emergency symptoms, call 911 or go to the nearest emergency department.";

const KNOWLEDGE = [
  `Clinic: ${NEA.name} (${NEA.legal}), ${NEA.address}. Phone ${NEA.phone}. Email ${NEA.email}. Hours: ${NEA.hours}. Founder: ${NEA.founder}. Physician-managed. Booking: Nea's Jane page. Free 15-minute consultation. Prices are NOT published online.`,
  "TREATMENTS:",
  ...NEA_TREATMENTS.map((t) => `- [${t.id}] ${t.name} (${t.cat}): ${t.summary} ${t.details.join(" ")} ${t.facts.map(([k, v]) => `${k}: ${v}.`).join(" ")}${t.tech ? ` Technology: ${t.tech}.` : ""}`),
  "PACKAGES:",
  ...NEA_PACKAGES.map((p) => `- ${p.name} (${p.group}): ${p.tiers.map((t) => (t.name ? t.name + ": " : "") + t.items.join(", ")).join(" | ")}`),
  "FAQ:",
  ...NEA_FAQ.map((f) => `- ${f.q} ${f.a}`),
].join("\n");

function fallback(q: string) {
  const s = q.toLowerCase();
  const has = (k: string) => (/^\w/.test(k) ? new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(s|es|ing|ed)?\\b`, "i").test(s) : s.includes(k));
  const faq = NEA_FAQ.map((f) => ({ f, n: f.keys.filter(has).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n)[0]?.f;
  const found = matchNeaTreatments(q, 2);
  if (found.length) {
    const t = found[0];
    const facts = t.facts.map(([k, v]) => `${k}: ${v}`).join(" · ");
    const answer = `${faq ? faq.a + "\n\n" : ""}${t.name}: ${t.summary} ${t.details[0]}${facts ? `\n\n${facts}.` : ""}${found[1] ? `\n\nYou might also look at ${found[1].name}.` : ""}\n\nNea confirms what’s right for you at a free 15-minute consultation.`;
    return { answer, cites: found.map((x) => x.id) };
  }
  if (faq) return { answer: faq.a, cites: [] };
  return { answer: "I couldn’t find that in Nea’s published information. Nea’s team can answer it at a free 15-minute consultation, or call 1-403-230-8812.", cites: [] };
}

export async function POST(req: Request) {
  const { ip } = await clientMeta();
  if (!(await rateLimit(`nea-ask:${ip}`, 15, 60_000))) return NextResponse.json({ error: "Too many questions — try again in a minute." }, { status: 429 });
  let question = "";
  let history: { role: "user" | "alba"; text: string }[] = [];
  try {
    const b = await req.json();
    question = String(b?.question || "").trim().slice(0, 500);
    if (Array.isArray(b?.history)) history = b.history.slice(-6).map((h: any) => ({ role: h?.role === "alba" ? "alba" : "user", text: String(h?.text || "").slice(0, 600) }));
  } catch { /* */ }
  if (question.length < 2) return NextResponse.json({ error: "Ask a question about Nea’s treatments." }, { status: 400 });
  if (detectCrisisKeywords(question)) return NextResponse.json({ emergency: CRISIS_MESSAGE });
  if (detectEmergencyKeywords(question) || EXTRA.test(question)) return NextResponse.json({ emergency: EMERGENCY });

  const system = `You are Neyu, NEYU Health's assistant, answering questions about the partner clinic Nea Precision Skin in Calgary.
Use ONLY the facts below. If the answer isn't there, say Nea's team can answer at the free 15-minute consultation.
Rules: never diagnose; never promise results; never invent prices, doses or statistics; keep it under 110 words, warm and plain.
Reply with ONLY JSON: {"answer":"...","cites":["<treatment id>", ...]} — cite up to 3 treatment ids you referred to.

${KNOWLEDGE}`;
  const convo = history.map((h) => `${h.role === "alba" ? "Neyu" : "Person"}: ${h.text}`).join("\n");
  const raw = await gemini(system, (convo ? convo + "\n" : "") + "Person: " + question, { maxTokens: 400, temperature: 0.3 });
  if (raw) {
    try {
      const j = JSON.parse(raw.replace(/^```(json)?|```$/g, "").trim());
      const cites = (Array.isArray(j.cites) ? j.cites : []).map(String).filter((id: string) => NEA_TREATMENTS.some((t) => t.id === id)).slice(0, 3);
      const answer = String(j.answer || "").slice(0, 1200);
      if (answer) return NextResponse.json({ byAlba: true, answer, cites });
    } catch { /* fall through */ }
  }
  return NextResponse.json({ byAlba: false, ...fallback(question) });
}
