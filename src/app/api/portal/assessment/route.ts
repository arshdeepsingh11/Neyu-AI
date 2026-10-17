// GET /api/portal/assessment?days=90 — Doctor Assessment preview: the patient's
// data for the period + Neyu's observations and suggested questions (AI).
import { getAssessment, getSpace } from "@backend/space";
import { geminiJSON, unsafeAiText } from "@backend/ai";
import { rateLimit } from "@backend/rateLimit";
import { audit } from "@backend/audit";
import { withPatient } from "@backend/apiHelpers";

const DAYS = [30, 90, 180, 365, 3650];

export const GET = (req: Request) => withPatient(async ({ patient, ip }) => {
  const q = Number(new URL(req.url).searchParams.get("days"));
  const days = DAYS.includes(q) ? q : 90;
  const [a, space] = await Promise.all([getAssessment(patient, days), getSpace(patient)]);
  let observations: string[] = [], questions: string[] = [], summary = "", byAi = false;
  if ((await rateLimit(`assess:${patient.id}`, 10, 10 * 60_000))) {
    const brief = JSON.stringify({ activity: a.activity, labs: a.labs, reports: a.reports.map((r) => `${r.date} ${r.title}: ${r.summary} ${r.flagged.join("; ")}`), eating: a.eating, physical: a.physical, checkins: a.checkins, profileChanges: a.profileChanges, newInfo: a.newInfo, changes: a.changes.map((c) => `${c.text} (${c.basis})`), conditions: a.conditions, medications: a.medications, familyHistory: a.familyHistory, nutrition: a.nutrition, lifestyle: a.lifestyle, goals: a.goals, gaps: space.gaps.map((g) => g.text) });
    const r = await geminiJSON<{ observations?: string[]; questions?: string[]; summary?: string }>(
      `You help a patient prepare a summary for their family doctor. From the JSON data only, write:
"observations": 3-6 short, neutral, factual observations a clinician would find useful (trends, out-of-range values as labelled, notable gaps). Never diagnose, never suggest treatment or medication changes. Use "the patient", not "you".
"questions": 3-5 short questions the patient could ask their doctor, written in first person.
"summary": a 30-second summary for the doctor, 3-4 sentences: who the patient is (age/sex if given), the most important recent results and reports with dates, notable changes in activity, sleep, eating or profile, and what the patient wants help with. Neutral, factual, only from the data.
Return JSON only.`, [{ text: brief }], { maxTokens: 2048, timeoutMs: 30_000, label: "assessment" });
    const ok = (xs: unknown) => (Array.isArray(xs) ? xs.map((s) => String(s).trim().slice(0, 260)).filter((s) => s && !unsafeAiText(s)) : []);
    observations = ok(r?.observations).slice(0, 6); questions = ok(r?.questions).slice(0, 5); byAi = observations.length > 0;
    const sm = String(r?.summary || "").trim().slice(0, 900); if (sm && !unsafeAiText(sm)) summary = sm;
  }
  if (!observations.length) observations = a.changes.filter((c) => c.status !== "stable").slice(0, 5).map((c) => c.text);
  if (!questions.length) questions = [
    ...a.labs.filter((l) => l.flag === "above range" || l.flag === "below range").slice(0, 2).map((l) => `My ${l.name} was ${l.flag}. What does that mean for me?`),
    ...space.gaps.map((g) => ({ Labs: "Is it time for me to have blood work done?", Heart: "Would an ECG or heart check be useful for me?", "Blood pressure": "Should I be checking my blood pressure at home?", "Family history": "Does my family history change anything I should watch for?" } as Record<string, string>)[g.area]).filter(Boolean).slice(0, 2) as string[],
    "Is there anything in my recent data you'd like me to keep an eye on?",
  ].slice(0, 4);
  if (!summary) summary = [
    `${a.patient.name}${a.patient.age != null ? `, ${a.patient.age}` : ""}${a.patient.sex ? `, ${String(a.patient.sex).toLowerCase()}` : ""}.`,
    a.reports.length ? `${a.reports.length} report${a.reports.length > 1 ? "s" : ""} in this period, most recent ${a.reports[0].title} (${a.reports[0].date}).` : "",
    a.labs.filter((l) => l.flag && l.flag !== "in range").length ? `Outside the lab's range: ${a.labs.filter((l) => l.flag && l.flag !== "in range").slice(0, 3).map((l) => `${l.name} ${l.value} ${l.unit} (${l.date})`).join(", ")}.` : "",
    a.changes[0] ? a.changes[0].text : "",
    a.goals.length ? `Goals: ${a.goals.slice(0, 3).join(", ")}.` : "",
  ].filter(Boolean).join(" ");
  audit(patient.id, "patient", "read", `assessment:${days}`, ip);
  return { assessment: a, summary, observations, questions: [...a.questions, ...questions.filter((x) => !a.questions.includes(x))].slice(0, 10), byAi, gaps: space.gaps };
});
