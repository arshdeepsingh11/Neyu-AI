// POST /api/assess — { kind, answers, computed } → an Neyu write-up for the
// Longevity, Genomics and Longevity Lab assessments. Scores are computed on
// the client from published guidelines; the AI only explains them and picks
// relevant BioAro tests from the real catalog. Without AI, a rules-based
// summary is returned so the tools always work.
import { NextResponse } from "next/server";
import { LAB_TESTS, money } from "@/data/bioaroCatalog";
import { gemini } from "@backend/ai";
import { rateLimit } from "@backend/rateLimit";
import { clientMeta } from "@backend/patientAuth";
import { detectEmergencyKeywords, detectCrisisKeywords, CRISIS_MESSAGE, EMERGENCY_MESSAGE } from "@/lib/emergencyDetection";

type Kind = "longevity" | "genomics" | "lab";
const FOCUS: Record<Kind, string> = {
  longevity: "a healthy-aging lifestyle check (activity, sleep, nutrition, alcohol, smoking, stress, social connection, metabolic numbers)",
  genomics: "choosing which genetic or advanced lab test fits the person's goals, family history and medications",
  lab: "the NEYU Longevity Lab: intervention responsiveness, GDF-15 and telomeres, pace of aging, pharmacogenomic medication safety and longevity genetics",
};

export async function POST(req: Request) {
  const { ip } = await clientMeta();
  if (!(await rateLimit(`assess:${ip}`, 10, 60_000))) return NextResponse.json({ error: "Too many requests — try again in a minute." }, { status: 429 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const kind: Kind = ["longevity", "genomics", "lab"].includes(body?.kind) ? body.kind : "longevity";
  const answers = body?.answers && typeof body.answers === "object" ? body.answers : null;
  const computed = body?.computed && typeof body.computed === "object" ? body.computed : {};
  if (!answers) return NextResponse.json({ error: "Missing answers" }, { status: 400 });

  const text = JSON.stringify(answers).slice(0, 4000);
  if (detectCrisisKeywords(text)) return NextResponse.json({ emergency: CRISIS_MESSAGE });
  if (detectEmergencyKeywords(text)) return NextResponse.json({ emergency: EMERGENCY_MESSAGE });

  const suggested: string[] = Array.isArray(computed.tests) ? computed.tests.filter((s: unknown) => typeof s === "string").slice(0, 6) : [];
  const catalog = LAB_TESTS.map((t) => `- ${t.id.replace(/^labs-/, "")}: ${t.name} (${t.cat}, ${money(t.price)}) — ${t.why}`).join("\n");
  const system = `You are Neyu, NEYU Health's AI health educator (Calgary). You explain ${FOCUS[kind]} in warm, plain, accurate language.
Rules: never diagnose, never give a risk percentage, never recommend starting, stopping or dosing medication. Base comments on mainstream evidence (Canadian guidelines where relevant). Scores given to you were computed from published guideline thresholds — explain them, don't recompute.
Choose 1-3 BioAro Labs tests ONLY from this catalog (use the slug before the colon). Prefer the pre-ranked suggestions when they fit:
${catalog}
Reply with ONLY JSON: {"summary":"2-3 sentences","focus":[{"title":"2-4 words","note":"one sentence"}],"tests":[{"id":"slug","why":"one sentence"}],"next":"one sentence next step (e.g. book an NEYU consultation to interpret results)"}. 2-4 focus items.`;
  const user = `Answers: ${text}\nComputed scores and flags: ${JSON.stringify(computed).slice(0, 2500)}\nPre-ranked test suggestions: ${suggested.join(", ") || "none"}`;
  const raw = await gemini(system, user, { maxTokens: 700, temperature: 0.3 });
  const valid = (id: string) => LAB_TESTS.some((t) => t.id === "labs-" + id);
  if (raw) {
    try {
      const j = JSON.parse(raw.replace(/^```(json)?|```$/g, "").trim());
      const tests = (Array.isArray(j.tests) ? j.tests : []).filter((t: any) => valid(String(t?.id))).slice(0, 3).map((t: any) => ({ id: String(t.id), why: String(t.why || "").slice(0, 220) }));
      return NextResponse.json({
        byAlba: true,
        summary: String(j.summary || "").slice(0, 700),
        focus: (Array.isArray(j.focus) ? j.focus : []).slice(0, 4).map((f: any) => ({ title: String(f?.title || "").slice(0, 60), note: String(f?.note || "").slice(0, 240) })),
        tests: tests.length ? tests : suggested.filter(valid).slice(0, 3).map((id) => ({ id, why: "" })),
        next: String(j.next || "").slice(0, 240),
      });
    } catch { /* fall through */ }
  }
  // Rules-based fallback: the client's computed focus areas + suggested tests.
  const focus = Array.isArray(computed.focus) ? computed.focus.slice(0, 4) : [];
  return NextResponse.json({
    byAlba: false,
    summary: String(computed.summary || "Here is what your answers show, based on published guideline thresholds."),
    focus: focus.map((f: any) => ({ title: String(f?.title || ""), note: String(f?.note || "") })),
    tests: suggested.filter(valid).slice(0, 3).map((id) => ({ id, why: LAB_TESTS.find((t) => t.id === "labs-" + id)!.why })),
    next: "Book an NEYU consultation to review your answers — and any test results — with a physician.",
  });
}
