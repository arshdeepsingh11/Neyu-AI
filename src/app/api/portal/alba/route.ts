// POST /api/portal/alba — { message, conversationId? }
// Neyu inside My Health Space: answers about the patient's OWN data, only
// when "Neyu access" is on in Privacy & Data. Emergency keywords are caught
// before any AI call (non-negotiable safety net). Every exchange is logged
// to AlbaConversation with the patient id, so it appears in History.
import { prisma } from "@backend/db";
import { startAlbaConversation, logAlbaMessage } from "@backend/logging";
import { getOrCreateSessionId } from "@backend/session";
import { getSettings, getProtocol, readingSourceFilter } from "@backend/patientData";
import { rateLimit } from "@backend/rateLimit";
import { audit } from "@backend/audit";
import { detectEmergencyKeywords, detectCrisisKeywords, CRISIS_MESSAGE } from "@/lib/emergencyDetection";
import { METRIC_DEFS, avg, dayKey, addDays, fmtU, type MetricKey } from "@/lib/portal/metrics";
import { PROVIDER_NAMES } from "@/lib/portal/devices";
import { withPatientMutation, readJson, str, HttpError } from "@backend/apiHelpers";
import { placeFor } from "@backend/brief";
import { getWeather } from "@backend/weather";
import { getRetests } from "@backend/labs";
import { profileSummary } from "@backend/healthProfile";
import { getSpace, usageSummary } from "@backend/space";
import { unsafeAiText } from "@backend/ai";

const EMERGENCY_TEXT = "This could need urgent care. If you have chest pain, severe shortness of breath, fainting or other emergency symptoms, call 911 or go to the nearest emergency department now.";
const EXTRA_EMERGENCY = /chest pain|can'?t breathe|cannot breathe|trouble breathing|faint|stroke|suicid|severe/i;
const FALLBACK = "I can help with your trends, sleep, results or preparing for your visit. For anything about symptoms or treatment, your care team is the right place to start.";

type Consent = { wearables: boolean; labs: boolean; records: boolean };
// ── Neyu Orchestrator: identify the task, then retrieve ONLY the relevant data ──
const DOMAINS: [string, RegExp][] = [
  ["sleep", /sleep|bed ?time|tired|rest|insomnia|nap/i], ["activity", /step|walk|activ|exercis|workout|move|fitness|run\b/i],
  ["heart", /heart|bp\b|blood pressure|pressure|pulse|hrv|rhythm|ecg|cardio/i], ["labs", /lab|blood test|bloodwork|cholesterol|ldl|hdl|a1c|glucose|result|test|report|marker|vitamin|thyroid/i],
  ["food", /food|eat|meal|diet|nutrition|protein|snack|drink|water|alcohol/i], ["weight", /weight|kg|lbs|body/i],
  ["goals", /goal|plan|consistent|habit|protocol|streak|reward/i], ["doctor", /doctor|appointment|visit|ask (my|the)|cardiolog|kapoor|clinic/i],
  ["missing", /don'?t (we )?know|missing|gap|what else|incomplete/i], ["lifestyle", /stress|mood|feel|energy|pain|check-?in/i], ["reports", /report|document|scan|imaging|x-?ray|mri|ultrasound/i],
];
function intents(msg: string) {
  const d = new Set(DOMAINS.filter(([, re]) => re.test(msg)).map(([k]) => k));
  if (!d.size || /chang|better|worse|pattern|this year|overall|how am i|how.?s my health|story|summary|everything|doing|improv|trend/i.test(msg)) d.add("broad");
  return d;
}
const AREA_DOMAIN: Record<string, string> = { Activity: "activity", Sleep: "sleep", Heart: "heart", "Blood pressure": "heart", Body: "weight", Labs: "labs", Records: "reports", Nutrition: "food", "Check-ins": "lifestyle" };
const METRIC_DOMAIN: Record<string, string> = { sleep: "sleep", sleepVar: "sleep", bedtime: "sleep", timeInBed: "sleep", steps: "activity", active: "activity", workouts: "activity", activeEnergy: "activity", distance: "activity", rhr: "heart", hrv: "heart", spo2: "heart", ecg: "heart", bp: "heart", weight: "weight", glucose: "labs" };

async function buildContext(patient: { id: string; firstName: string; timezone: string }, c: Consent, D: Set<string> = new Set(["broad"])) {
  const on = (...ds: string[]) => D.has("broad") || ds.some((d) => D.has(d));
  const evidence: string[] = [];
  const today = dayKey(new Date(), patient.timezone), from = addDays(today, -60);
  const [readings, labs, appt, protocol] = await Promise.all([
    prisma.healthReading.findMany({ where: { patientId: patient.id, day: { gte: from }, ...readingSourceFilter(c) }, select: { metric: true, day: true, value: true, valueText: true, source: true }, orderBy: { day: "asc" } }),
    !c.labs ? Promise.resolve([]) : prisma.labResult.findMany({ where: { patientId: patient.id, status: "final" }, orderBy: { collectedAt: { sort: "desc", nulls: "last" } }, take: 12, select: { name: true, value: true, valueText: true, unit: true, refText: true, collectedAt: true, code: true } }),
    !c.records ? Promise.resolve(null) : prisma.appointment.findFirst({ where: { patientId: patient.id, status: "scheduled", startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, select: { title: true, clinician: true, startsAt: true } }),
    getProtocol(patient),
  ]);
  const lines: string[] = [], sources = new Set<string>();
  const byMetric = new Map<string, typeof readings>();
  readings.forEach((r) => { if (!byMetric.has(r.metric)) byMetric.set(r.metric, []); byMetric.get(r.metric)!.push(r); sources.add(PROVIDER_NAMES[r.source] || r.source); });
  byMetric.forEach((rows, m) => {
    const def = (METRIC_DEFS as Record<string, { name: string }>)[m];
    if (!def || !on(METRIC_DOMAIN[m] || "broad")) return;
    const last = rows[rows.length - 1];
    if (last.valueText) { lines.push(`${def.name}: ${last.valueText} (${last.day})`); return; }
    if (m === "bedtime") return;
    const r30 = rows.filter((r) => r.day >= addDays(today, -30));
    lines.push(`${def.name}: latest ${fmtU(m, last.value)} on ${last.day}; 30-day average ${fmtU(m, avg((r30.length ? r30 : rows).map((r) => r.value)))}; ${r30.length} days of data in the last 30`);
  });
  const seen = new Set<string>();
  if (on("labs", "doctor") && labs.length) evidence.push(`${labs.length} lab results`);
  labs.forEach((l) => { if (!on("labs", "doctor") || seen.has(l.code)) return; seen.add(l.code); sources.add("BioAro Labs"); lines.push(`Lab ${l.name}: ${l.valueText ?? l.value} ${l.unit ?? ""} (reference ${l.refText ?? "n/a"}, collected ${l.collectedAt?.toISOString().slice(0, 10)})`); });
  if (appt && on("doctor", "goals")) lines.push(`Next appointment: ${appt.title} with ${appt.clinician} on ${appt.startsAt.toISOString().slice(0, 16).replace("T", " ")} UTC`);

  // Health Universe: night-by-night sleep with possible factors, home BP, check-ins, weather, retests.
  const from14 = addDays(today, -14);
  const [bps, logs, place, retests] = await Promise.all([
    prisma.bpReading.findMany({ where: { patientId: patient.id, day: { gte: addDays(today, -30) } }, orderBy: { takenAt: "desc" }, select: { sys: true, dia: true, day: true } }),
    prisma.lifestyleLog.findMany({ where: { patientId: patient.id, day: { gte: from14 } }, select: { kind: true, value: true, day: true, at: true, note: true } }),
    placeFor(patient.id),
    c.labs ? getRetests(patient, 30) : Promise.resolve([]),
  ]);
  const hourOf = (d: Date) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: patient.timezone, hour: "2-digit", hour12: false }).format(d)) % 24;
  const nights = (byMetric.get("sleep") || []).filter((r) => r.day >= from14);
  if (nights.length && on("sleep")) {
    evidence.push(`${nights.length} nights of sleep data`);
    const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    lines.push("Sleep night by night (last 14 days; factors are from the day before, patient-logged):");
    nights.forEach((n) => {
      const prev = addDays(n.day, -1), L = logs.filter((l) => l.day === prev);
      const f: string[] = [];
      const alc = L.filter((l) => l.kind === "alcohol").reduce((a, l) => a + l.value, 0);
      if (alc) f.push(`${alc} alcoholic drink${alc > 1 ? "s" : ""}`);
      const late = L.filter((l) => l.kind === "caffeine" && hourOf(l.at) >= 14).length;
      if (late) f.push(`caffeine after 2 PM`);
      const st = L.filter((l) => l.kind === "stress").map((l) => l.value);
      if (st.length && Math.max(...st) >= 4) f.push("high stress");
      const bed = (byMetric.get("bedtime") || []).find((b) => b.day === n.day);
      if (bed) { const m = Math.round(bed.value), h = Math.floor(m / 60) % 24; f.push(`bedtime ${((h + 11) % 12) + 1}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`); }
      const d = new Date(n.day + "T12:00:00Z");
      lines.push(`- ${WD[d.getUTCDay()]} ${n.day}: ${fmtU("sleep", n.value)}${f.length ? ` (${f.join(", ")})` : ""}`);
    });
    const wk = (a: number, b: number) => avg(nights.filter((n) => n.day > addDays(today, -a) && n.day <= addDays(today, -b)).map((n) => n.value));
    const tw = wk(7, 0), lw = wk(14, 7);
    if (!isNaN(tw) && !isNaN(lw)) lines.push(`Sleep average this week ${fmtU("sleep", tw)} vs previous week ${fmtU("sleep", lw)}`);
  }
  if (bps.length && on("heart", "doctor")) {
    evidence.push(`${bps.length} blood-pressure readings (30 days)`);
    const b7 = bps.filter((b) => b.day > addDays(today, -7));
    const a = (x: typeof bps) => `${Math.round(avg(x.map((y) => y.sys)))}/${Math.round(avg(x.map((y) => y.dia)))}`;
    lines.push(`Home blood pressure: 30-day average ${a(bps)} (${bps.length} readings)${b7.length ? `; 7-day average ${a(b7)}` : ""}; latest ${bps[0].sys}/${bps[0].dia} on ${bps[0].day}. Home target is below 135/85.`);
  }
  const wkLogs = logs.filter((l) => l.day > addDays(today, -7));
  if (wkLogs.length && on("food", "sleep", "lifestyle")) {
    const sum = (k: string) => wkLogs.filter((l) => l.kind === k).reduce((a, l) => a + l.value, 0);
    const mood = wkLogs.filter((l) => l.kind === "mood").map((l) => l.value), stress = wkLogs.filter((l) => l.kind === "stress").map((l) => l.value);
    lines.push(`Check-ins last 7 days: ${sum("water")} glasses of water, ${sum("caffeine")} caffeinated drinks, ${sum("alcohol")} alcoholic drinks${mood.length ? `, average mood ${avg(mood).toFixed(1)}/5` : ""}${stress.length ? `, average stress ${avg(stress).toFixed(1)}/5` : ""}; meals logged: ${wkLogs.filter((l) => l.kind === "meal").map((l) => l.note).slice(-5).join("; ") || "none"}`);
  }
  if (place && on("activity")) { const w = await getWeather(place); if (w) lines.push(`Today in ${w.place}: ${w.tempC ?? "?"}°C ${w.condition || ""}, AQHI ${w.aqhi ?? "?"} (${w.aqhiRisk || "unknown"})${w.alerts[0] ? `, alert: ${w.alerts[0]}` : ""}`); }
  if (c.records) { const prof = await profileSummary(patient.id); if (prof) lines.push("Health profile (patient-entered):\n" + prof); }
  if (retests.length && on("labs", "doctor")) lines.push(`Lab retests due: ${retests.map((r) => `${r.name} (last ${r.last}, due ${r.due})`).join("; ")}`);
  if (protocol.items.length && on("goals", "doctor")) lines.push(`Daily protocol: ${protocol.items.map((i) => `${i.title} (${i.dose})${i.doneToday ? " — done today" : ""}`).join("; ")}`);
  // Personal Health Space: reports from any provider, food, plan, gaps, and how the patient uses the app.
  if (c.records && on("labs", "doctor", "reports")) {
    const docs = await prisma.healthDocument.findMany({ where: { patientId: patient.id, status: "saved" }, orderBy: [{ docDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }], take: 12, select: { title: true, kind: true, provider: true, docDate: true, createdAt: true, extracted: true, summary: true } });
    if (docs.length) {
      lines.push("Reports in the patient's record (original documents; facts below were read from them):");
      evidence.push(...docs.slice(0, 4).map((d) => `${d.title} from ${(d.docDate || d.createdAt).toISOString().slice(0, 10)}${d.provider ? ` (${d.provider})` : ""}`));
      docs.forEach((d) => { let ex: any = {}; try { ex = JSON.parse(d.extracted || "{}"); } catch {} lines.push(`- ${(d.docDate || d.createdAt).toISOString().slice(0, 10)} ${d.title} (${d.kind}${d.provider ? `, ${d.provider}` : ""})${ex.keyPoints?.length ? ": " + ex.keyPoints.slice(0, 4).join("; ") : ""}${ex.values?.length ? ` | values: ${ex.values.slice(0, 12).map((v: any) => `${v.name} ${v.value} ${v.unit || ""}${v.flag ? ` (${v.flag})` : ""}`).join(", ")}` : ""}`); sources.add(d.provider || "Uploaded reports"); });
    }
  }
  const meals = await prisma.foodLog.findMany({ where: { patientId: patient.id, day: { gte: addDays(today, -7) } }, orderBy: { at: "desc" }, take: 30, select: { day: true, meal: true, text: true, tags: true } });
  if (meals.length && on("food")) {
    evidence.push(`${meals.length} meals logged (7 days)`); lines.push(`Food log last 7 days (${meals.length} entries): ${meals.slice(0, 18).map((m) => `${m.day} ${m.meal}: ${m.text} [${JSON.parse(m.tags || "[]").join(", ")}]`).join("; ")}`); sources.add("Food log"); }
  const plan = await prisma.generatedNote.findUnique({ where: { patientId_kind_period: { patientId: patient.id, kind: "plan", period: "current" } }, select: { body: true } });
  if (plan && on("goals", "food", "activity", "sleep")) { try { const pl = JSON.parse(plan.body); lines.push(`Patient's AI health plan: ${pl.sections.map((s: any) => `${s.title}: ${s.items.map((i: any) => i.title).join(", ")}`).join(" | ")}`); } catch {} }
  const space = await getSpace(patient).catch(() => null);
  if (space) {
    const rel = space.changes.filter((x) => on(AREA_DOMAIN[x.area] || "broad")).slice(0, 10);
    if (rel.length) lines.push(`ANALYST FINDINGS (rules-based, with evidence and confidence):\n${rel.map((x) => `- [${x.status}; confidence ${x.confidence}] ${x.text} (${x.basis}${x.source ? `; source ${x.source}` : ""})`).join("\n")}`);
    rel.filter((x) => x.confidence !== "insufficient").slice(0, 4).forEach((x) => evidence.push(`${x.title}: ${x.basis.replace(/^Based on /, "")}`));
    if (space.gaps.length && on("missing", "doctor")) lines.push(`INFORMATION GAPS (data availability, not health problems): ${space.gaps.map((g) => `[${g.kind}] ${g.text}`).join(" ")}`);
    lines.push(`DATA COVERAGE (how much information exists, not health status): ${space.coverage.map((x) => `${x.label} ${x.level}`).join(", ")}`);
  }
  const usage = await usageSummary(patient.id).catch(() => "");
  if (usage && D.has("broad")) lines.push(usage);
  return { text: lines.join("\n"), evidence: [...new Set(evidence)].slice(0, 6), sources: [...sources], hasSleep: byMetric.has("sleep"), hasTrends: byMetric.size > 0, hasAppt: !!appt };
}

async function gemini(system: string, message: string, history: { role: string; text: string }[]) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${key}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [...history.slice(-6).map((h) => ({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.text }] })), { role: "user", parts: [{ text: message }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error("Gemini " + res.status);
  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("").replace(/\*\*|__|#+\s/g, "").trim();
  if (!text) throw new Error("empty");
  return text;
}

export const POST = (req: Request) => withPatientMutation(async ({ patient, ip }) => {
  if (!rateLimit(`alba:${patient.id}`, 20, 60_000)) throw new HttpError(429, "You're sending messages quickly. Please wait a moment.");
  const b = await readJson(req);
  const message = str(b.message, 1000);
  if (!message) throw new HttpError(400, "Please type a question.");

  // Conversation (logged with patientId via backend/logging).
  let conversationId = str(b.conversationId, 40);
  if (conversationId) {
    const own = await prisma.albaConversation.findFirst({ where: { id: conversationId, patientId: patient.id }, select: { id: true } });
    if (!own) conversationId = "";
  }
  if (!conversationId) conversationId = await startAlbaConversation({ sessionId: await getOrCreateSessionId(), pageContext: "/my-health" });
  await logAlbaMessage({ conversationId, role: "user", text: message });
  const history = (await prisma.albaMessage.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" }, select: { role: true, text: true } })).slice(0, -1);

  const reply = async (text: string, extra: { src?: string; action?: string } = {}) => {
    await logAlbaMessage({ conversationId, role: "assistant", text });
    return { conversationId, text, ...extra };
  };

  // Safety net first — deterministic, before any AI.
  if (detectCrisisKeywords(message)) return reply(CRISIS_MESSAGE, { action: "emergency" });
  if (detectEmergencyKeywords(message) || EXTRA_EMERGENCY.test(message)) return reply(EMERGENCY_TEXT, { action: "emergency" });

  const settings = await getSettings(patient.id);
  const D = intents(message + " " + history.slice(-2).map((h) => h.text).join(" ").slice(0, 300));
  const ctx = settings.albaAccess ? await buildContext(patient, { wearables: settings.shareWearables, labs: settings.shareLabs, records: settings.shareRecords }, D) : null;
  audit(patient.id, "patient", "read", "alba-context", ip);

  const system = `You are Neyu, a calm health data companion inside NEYU Health's My Health Space (a Calgary cardiology and internal medicine clinic). The clinic is called NEYU Health (never ANRA; if asked, ANRA Health is now NEYU Health).
Rules: Never diagnose. Never recommend starting, stopping or changing medications or supplements. Suggest the care team when appropriate.
Keep to 2–6 short sentences (a short list is fine for plans or questions), plain language, no markdown symbols.
Grounding: base every statement on PATIENT DATA. Say how much data it rests on when useful ("based on 3 months of readings"). If the data is thin or missing, say "I don't have enough information to determine that yet" — that is better than guessing. Never claim causation: use "during the same period", "coincided with", "the data shows". Never call a medical result good or bad on your own; describe the direction ("your average readings increased"). Data coverage describes how much information exists, never how healthy someone is. Only use the data below; if something isn't in it, say clearly that it isn't in their Health Space yet (never invent values). When you use a report, mention its source and date. When asked for a plan (exercise, food, sleep), give general guidance labelled as AI-generated and suggest checking with their healthcare professional. When asked what to ask a doctor, list 2–4 questions based on their data. You may use how they use the app (screens they spend time on) to understand what matters to them, but don't mention tracking.
When asked "why" (for example why sleep was worse), compare the nights and point to the most likely factors in the data (alcohol, late caffeine, stress, late or irregular bedtimes, exercise), say it's a pattern not a certainty, and suggest one small thing to try.
The patient's first name is ${patient.firstName}.
${ctx ? (ctx.text ? `PATIENT DATA (from sources the patient allowed):\n${ctx.text}` : "PATIENT DATA: none yet (no wearable, results or appointments).") : "The patient has turned OFF Neyu access to their data. Do not reference personal data; answer generally and mention they can turn it on in Privacy & Data."}`;

  // Companion → evidence validation → safety validation.
  let text: string;
  try {
    text = await gemini(system, message, history);
    // Grounding check: numbers in the answer must exist in the patient data (or the question).
    if (ctx?.text) {
      const known = ctx.text + " " + message;
      const nums: string[] = ((String(text).match(/\d+(?:[.,]\d+)?/g) || []) as string[]).filter((n: string) => n.length >= 2 && !/^(19|20)\d\d$/.test(n) && !["911", "811", "24"].includes(n));
      const unknown = nums.filter((n) => !known.includes(n));
      if (unknown.length) {
        console.warn("Neyu grounding retry, unsupported numbers:", unknown.slice(0, 5).join(","));
        text = await gemini(system + "\nIMPORTANT: Your previous answer used numbers that are not in PATIENT DATA. Use only numbers that appear in PATIENT DATA, or none.", message, history);
      }
    }
    if (unsafeAiText(text)) text = "I can describe what your data shows, but I can't diagnose or advise on medications. Your care team is the right place for that — I can help you prepare questions for them.";
  } catch (e: any) { console.error("Portal Neyu error:", e?.message); text = FALLBACK; }

  let action: string | undefined;
  if (ctx?.hasSleep && /sleep/i.test(message)) action = "sleep";
  else if (ctx?.hasAppt && /kapoor|ask|visit|appointment|doctor/i.test(message)) action = "prepare";
  else if (ctx?.hasTrends && /trend|health|how am i/i.test(message)) action = "trends";
  const src = ctx && ctx.sources.length && text !== FALLBACK ? `Sources: ${ctx.sources.filter((x) => x !== "manual").slice(0, 5).join(", ")}` : undefined;
  return { ...(await reply(text, { src, action })), evidence: text !== FALLBACK ? ctx?.evidence || [] : [] };
});
