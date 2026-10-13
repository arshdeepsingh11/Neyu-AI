import { NextRequest, NextResponse } from "next/server";
import { geminiJSON, type AiPart } from "@backend/ai";

const SYSTEM_PROMPT = `You extract structured referral data either from a short free-text description written by a referring physician or staff member, OR from a photo of an actual physical referral document, for ANRA Health.

If given an image, read it carefully — it may be a fax, a handwritten note, or a printed referral form. Extract whatever is legible. If a field isn't present or isn't legible, leave it empty rather than guessing.

Return ONLY valid JSON, no markdown, matching exactly:
{
  "patientName": "string or empty",
  "patientPhone": "string or empty",
  "referringPhysician": "string or empty",
  "referringPhone": "string or empty",
  "referringAddress": "string or empty",
  "urgency": "ASAP" | "Urgent" | "Semi-Urgent" | "Phone Consult",
  "specialties": ["Cardiology" | "Internal Medicine" | "Endocrinology" | "Geriatric Medicine"],
  "exams": ["exact exam names mentioned, only from standard cardiac diagnostic tests"],
  "clinicalNotes": "a concise 1-2 sentence clinical summary"
}
If a field cannot be determined, use an empty string, empty array, or "Semi-Urgent" as a safe default for urgency. Never invent a patient name, phone number, or physician name that isn't actually present in the input.`;

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { description, imageBase64, mimeType } = body || {};

  const hasText = typeof description === "string" && description.trim().length > 0;
  const hasImage = typeof imageBase64 === "string" && imageBase64.trim().length > 0;

  if (!hasText && !hasImage) {
    return NextResponse.json({ error: "Missing description or imageBase64" }, { status: 400 });
  }

  const parts: AiPart[] = hasImage
    ? [{ inline_data: { mime_type: mimeType || "image/jpeg", data: imageBase64 } }, { text: "Extract the referral fields from this document photo." }]
    : [{ text: description }];
  // Shared helper: retries once, reads slightly broken JSON, logs the reason on failure.
  const parsed = await geminiJSON<any>(SYSTEM_PROMPT, parts, { maxTokens: 4096, timeoutMs: 60_000, temperature: 0.15, label: hasImage ? "referral-scan" : "referral-autofill" });
  if (!parsed) return NextResponse.json({ error: "Neyu couldn't read that right now" }, { status: 502 });
  try {
    return NextResponse.json({
      patientName: typeof parsed.patientName === "string" ? parsed.patientName : "",
      patientPhone: typeof parsed.patientPhone === "string" ? parsed.patientPhone : "",
      referringPhysician: typeof parsed.referringPhysician === "string" ? parsed.referringPhysician : "",
      referringPhone: typeof parsed.referringPhone === "string" ? parsed.referringPhone : "",
      referringAddress: typeof parsed.referringAddress === "string" ? parsed.referringAddress : "",
      urgency: ["ASAP", "Urgent", "Semi-Urgent", "Phone Consult"].includes(parsed.urgency) ? parsed.urgency : "Semi-Urgent",
      specialties: Array.isArray(parsed.specialties) ? parsed.specialties : [],
      exams: Array.isArray(parsed.exams) ? parsed.exams : [],
      clinicalNotes: typeof parsed.clinicalNotes === "string" ? parsed.clinicalNotes : "",
    });
  } catch (err) {
    console.error("Referral autofill handler error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}