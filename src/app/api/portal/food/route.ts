// GET  /api/portal/food?days=14 — meals, weekly patterns, Neyu's note
// POST /api/portal/food — { meal, text?, portion?, photo?: dataURL, day? }
import { prisma } from "@backend/db";
import { rateLimit } from "@backend/rateLimit";
import { withPatient, withPatientMutation, readJson, str, HttpError } from "@backend/apiHelpers";
import { MEALS, tagMeal, patterns, foodNote } from "@backend/food";
import { award } from "@backend/health";
import { dayKey, addDays } from "@/lib/portal/metrics";

const SEL = { id: true, day: true, at: true, meal: true, text: true, portion: true, tags: true, photoMime: true } as const;
const dto = (l: { id: string; day: string; at: Date; meal: string; text: string; portion: string | null; tags: string; photoMime: string | null }) =>
  ({ id: l.id, day: l.day, at: l.at.toISOString(), meal: l.meal, text: l.text, portion: l.portion, tags: JSON.parse(l.tags || "[]") as string[], photo: l.photoMime ? `/api/portal/food/${l.id}/photo` : null });

export const GET = (req: Request) => withPatient(async ({ patient }) => {
  const days = Math.min(90, Math.max(7, Number(new URL(req.url).searchParams.get("days")) || 14));
  const today = dayKey(new Date(), patient.timezone);
  const logs = await prisma.foodLog.findMany({ where: { patientId: patient.id, day: { gt: addDays(today, -days) } }, orderBy: { at: "desc" }, select: SEL });
  const pat = patterns(logs, today);
  const goals = (await prisma.goal.findMany({ where: { patientId: patient.id }, select: { label: true } })).map((g) => g.label);
  return { today, logs: logs.map(dto), patterns: pat, note: await foodNote(patient, logs, pat, goals) };
});

export const POST = (req: Request) => withPatientMutation(async ({ patient }) => {
  if (!(await rateLimit(`food:${patient.id}`, 30, 10 * 60_000))) throw new HttpError(429, "That's a lot of meals at once. Please wait a few minutes.");
  const b = await readJson(req, 6_000_000);
  const meal = (MEALS as readonly string[]).includes(b.meal) ? b.meal : "snack";
  let text = str(b.text, 300);
  const portion = ["small", "regular", "large"].includes(b.portion) ? b.portion : null;
  let photo: { mime: string; b64: string } | undefined;
  const m = typeof b.photo === "string" ? b.photo.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/) : null;
  if (m) { if (m[2].length > 5_500_000) throw new HttpError(413, "That photo is too large."); photo = { mime: m[1], b64: m[2] }; }
  if (!text && !photo) throw new HttpError(400, "Tell us what you ate or add a photo.");
  const today = dayKey(new Date(), patient.timezone);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(String(b.day || "")) && b.day <= today && b.day > addDays(today, -14) ? b.day : today;
  const t = await tagMeal(text, photo);
  if (!text) text = t.description || "Meal (photo)";
  const log = await prisma.foodLog.create({ data: { patientId: patient.id, day, meal, text, portion, tags: JSON.stringify(t.tags), photo: photo ? Buffer.from(photo.b64, "base64") : null, photoMime: photo?.mime || null }, select: SEL });
  await prisma.generatedNote.deleteMany({ where: { patientId: patient.id, kind: "food", period: today } }).catch(() => {});
  const pts = await award(patient.id, "food", day).catch(() => 0);
  return { log: dto(log), points: pts };
});
