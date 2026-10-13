import { NextRequest, NextResponse } from "next/server";
import { brand } from "@/data/content";
import { geminiJSON } from "@backend/ai";

const SYSTEM_PROMPT = `You write short, friendly "what to expect at your appointment" guides for patients of ${brand.name}, a clinic in Calgary, Alberta.

You are given the specialty/specialties requested, any diagnostic exams selected, the urgency level, and optional clinical notes from a referral. Write a brief, practical guide to help the patient feel prepared — logistics and general expectations only, never medical advice or diagnosis.

STRICT RULES:
1. This is purely informational/logistical — never interpret symptoms, never suggest a diagnosis, never comment on the clinical notes' medical meaning.
2. You must respond with ONLY valid JSON, no markdown, no extra text, matching exactly this shape:
{
  "whatToBring": ["short item", "short item"],
  "whatToExpect": "two to three plain-language sentences describing generally what happens during a visit for the requested specialty/exams",
  "prepTips": ["short practical tip", "short practical tip"],
  "estimatedDuration": "a general estimate, e.g. '30–60 minutes', or empty string if it varies too much to estimate"
}
3. "whatToBring" should always include Alberta Health Card and photo ID at minimum, plus anything specific to the exams selected (e.g. comfortable clothing for a stress test).
4. "prepTips" should reflect the specific exams selected where relevant (e.g. avoiding caffeine before a stress test) — general and safe, not medical instructions requiring a doctor's individualized guidance.
5. Keep tone warm and reassuring, never clinical or alarming.
6. If no specific exams were selected, keep "whatToExpect" and "prepTips" general to a first specialist consultation.`;

// Built-in guide, used whenever the AI is unavailable or slow — so patients and
// clinics always get a useful answer instead of an error.
function builtIn(specialties: string[], exams: string[], urgency: string) {
  const ex = exams.join(" ").toLowerCase();
  const bring = ["Alberta Health Card", "Photo ID", "A list of your current medications (or the bottles)", "Your referral letter, if you have a copy"];
  const tips: string[] = ["Arrive 10–15 minutes early to check in.", "Write down your symptoms, when they started and any questions you have."];
  let duration = "30–60 minutes";
  if (/stress|treadmill|exercise/.test(ex)) { bring.push("Comfortable clothes and walking or running shoes"); tips.push("Avoid caffeine and heavy meals for a few hours before a stress test, unless your clinic tells you otherwise."); tips.push("Ask your referring doctor whether to take your usual heart medicines that morning."); duration = "60–90 minutes"; }
  if (/echo|ultrasound|carotid|doppler/.test(ex)) tips.push("Wear a two-piece outfit so the sonographer can easily reach your chest or neck.");
  if (/holter|monitor|ambulatory/.test(ex)) { tips.push("Shower before your appointment — you usually can't shower while wearing a monitor."); tips.push("Wear a loose top that fits over the monitor."); }
  if (/blood|lab|bnp|lipid|glucose/.test(ex)) tips.push("Some blood tests need fasting — check the instructions that come with your requisition.");
  if (/spirometry|pulmonary|lung|breath/.test(ex)) tips.push("Avoid smoking and heavy exercise on the day of breathing tests, and ask whether to pause inhalers.");
  const spec = specialties.length ? specialties.join(" and ") : "your specialist";
  return {
    whatToBring: Array.from(new Set(bring)).slice(0, 6),
    whatToExpect: `You'll check in at reception, then a member of our team may take your vitals. ${exams.length ? `Your tests (${exams.slice(0, 3).join(", ")}) are done by our trained staff and the results go to your physician.` : `You'll meet ${spec === "your specialist" ? "the specialist" : `the ${spec} specialist`}, who will review your history and talk through next steps.`} ${/urgent|emergent/i.test(urgency) ? "Because this referral is marked urgent, the clinic will try to see you sooner." : "The clinic will call you to book a time."}`,
    prepTips: Array.from(new Set(tips)).slice(0, 6),
    estimatedDuration: duration,
    source: "built-in",
  };
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 20) : []) as string[];
  const specialties = list(body?.specialties), exams = list(body?.exams);
  const urgency = String(body?.urgency || "").slice(0, 60), clinicalNotes = String(body?.clinicalNotes || "").slice(0, 2000);
  const fallback = builtIn(specialties, exams, urgency);

  const inputText = `Specialties requested: ${specialties.length ? specialties.join(", ") : "General consultation"}
Diagnostic exams selected: ${exams.length ? exams.join(", ") : "None specified"}
Urgency: ${urgency || "Not specified"}
Clinical notes (for context only, do not interpret): ${clinicalNotes || "None provided"}`;
  const parsed = await geminiJSON<any>(SYSTEM_PROMPT, [{ text: inputText }], { maxTokens: 2048, timeoutMs: 20_000, temperature: 0.35, label: "visit-prep" });
  if (!parsed) return NextResponse.json(fallback);

  const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).map((x: string) => x.trim()).slice(0, 6) : []);
  return NextResponse.json({
    whatToBring: strs(parsed.whatToBring).length ? strs(parsed.whatToBring) : fallback.whatToBring,
    whatToExpect: typeof parsed.whatToExpect === "string" && parsed.whatToExpect.trim() ? parsed.whatToExpect.trim() : fallback.whatToExpect,
    prepTips: strs(parsed.prepTips).length ? strs(parsed.prepTips) : fallback.prepTips,
    estimatedDuration: typeof parsed.estimatedDuration === "string" ? parsed.estimatedDuration.trim() : fallback.estimatedDuration,
  });
}
