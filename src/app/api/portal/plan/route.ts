// GET  /api/portal/plan — the patient's AI Health Plan (or null)
// POST /api/portal/plan — create / refresh it from their current data
import { prisma } from "@backend/db";
import { getAssessment, getSpace } from "@backend/space";
import { geminiJSON, unsafeAiText } from "@backend/ai";
import { rateLimit } from "@backend/rateLimit";
import { withPatient, withPatientMutation, HttpError } from "@backend/apiHelpers";

type Item = { title: string; detail: string };
type Plan = { intro: string; sections: { id: "move" | "food" | "sleep" | "habits"; title: string; items: Item[] }[]; basedOn: string[]; createdAt: string; byAi: boolean };
const where = (id: string) => ({ patientId_kind_period: { patientId: id, kind: "plan", period: "current" } });

export const GET = () => withPatient(async ({ patient }) => {
  const n = await prisma.generatedNote.findUnique({ where: where(patient.id) });
  return { plan: n ? (JSON.parse(n.body) as Plan) : null };
});

export const POST = () => withPatientMutation(async ({ patient }) => {
  if (!(await rateLimit(`plan:${patient.id}`, 5, 10 * 60_000))) throw new HttpError(429, "Please wait a few minutes before refreshing your plan.");
  const [a, space] = await Promise.all([getAssessment(patient, 90), getSpace(patient)]);
  const data = { activity: a.activity, labs: a.labs.map((l) => `${l.name} ${l.value} ${l.unit} ${l.flag}`), changes: a.changes.map((c) => c.text), nutrition: a.nutrition, lifestyle: a.lifestyle, goals: a.goals, conditions: a.conditions, age: a.patient.age };
  const basedOn = space.sources.slice(0, 6);
  const r = await geminiJSON<{ intro?: string; sections?: { id: string; items?: Item[] }[] }>(
    `You are Neyu. Create a short, practical personal health plan from the patient's data (JSON). General lifestyle guidance only: never diagnose, never mention medications, supplements or doses, nothing extreme. Respect any conditions by keeping advice gentle and suggesting they check with their healthcare professional before big changes.
Return JSON only: {"intro": 1-2 sentences starting with "Based on the information currently available", "sections": [{"id":"move","items":[3 items]},{"id":"food","items":[3]},{"id":"sleep","items":[2-3]},{"id":"habits","items":[2-3]}]} where each item is {"title": short action (max 8 words), "detail": one sentence why/how, tied to their data when possible}.`,
    [{ text: JSON.stringify(data) }], { maxTokens: 4096, timeoutMs: 40_000, temperature: 0.4, label: "plan" });
  const TITLES = { move: "Movement", food: "Food", sleep: "Sleep", habits: "Habits" } as const;
  const clean = (it: any): Item | null => { const t = String(it?.title || "").slice(0, 80), d = String(it?.detail || "").slice(0, 260); return t && !unsafeAiText(t + " " + d) ? { title: t, detail: d } : null; };
  let plan: Plan;
  if (r?.sections?.length) {
    plan = { intro: String(r.intro || "Based on the information currently available, here is a simple plan to start with.").slice(0, 300), byAi: true, basedOn, createdAt: new Date().toISOString(),
      sections: (["move", "food", "sleep", "habits"] as const).map((id) => ({ id, title: TITLES[id], items: (r.sections!.find((s) => s.id === id)?.items || []).map(clean).filter(Boolean).slice(0, 3) as Item[] })).filter((s) => s.items.length) };
  } else {
    const steps = a.activity.find((x) => x.label.startsWith("Steps"));
    plan = { intro: "Based on the information currently available, here is a simple plan to start with.", byAi: false, basedOn, createdAt: new Date().toISOString(), sections: [
      { id: "move", title: "Movement", items: [{ title: steps ? "Add 1,000 steps to your usual day" : "Walk 20 minutes most days", detail: steps ? `Your recent average is ${steps.value}. Small, steady increases are easiest to keep.` : "Brisk walking is a simple base for heart and metabolic health." }, { title: "Two short strength sessions a week", detail: "Body-weight moves like squats and wall push-ups are enough to start." }] },
      { id: "food", title: "Food", items: [{ title: "Half a plate of vegetables at dinner", detail: "An easy way to add fibre without counting anything." }, { title: "Protein with breakfast", detail: "Eggs, yogurt, dal or paneer help you stay full longer." }] },
      { id: "sleep", title: "Sleep", items: [{ title: "Keep a regular bedtime", detail: "Within 30 minutes each night, including weekends." }, { title: "No caffeine after 2 PM", detail: "Caffeine can stay in your system for many hours." }] },
      { id: "habits", title: "Habits", items: [{ title: "Log one meal a day in Food", detail: "It helps Neyu see patterns and makes your doctor summary richer." }] },
    ] };
  }
  await prisma.generatedNote.upsert({ where: where(patient.id), create: { patientId: patient.id, kind: "plan", period: "current", body: JSON.stringify(plan) }, update: { body: JSON.stringify(plan), createdAt: new Date() } });
  return { plan };
});
