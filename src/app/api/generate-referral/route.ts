// Next.js Route Handler — replaces /api/generate-referral.js.
// Extracts structured referral form fields from a free-text description.
// Set GEMINI_API_KEY in your server environment (same key other routes use).

import { NextRequest, NextResponse } from "next/server";

const CONSULTATION_OPTIONS = ["Cardiology", "Internal Medicine", "Endocrinology", "Geriatric Medicine"];

const PHYSICIAN_OPTIONS = [
  "Dr. Ravi Varshney",
  "Dr. Anmol Kapoor",
  "Dr. Alvin Villanueva",
  "Dr. Ali Debek",
  "Dr. Lovpreet Mangat",
  "Dr. Faisal Hasan",
];

const URGENCY_OPTIONS = ["ASAP", "Urgent", "Semi-Urgent", "Phone Consult"];

const TEST_OPTIONS = [
  "Exercise MPI",
  "Pharmacological MPI",
  "Bubble Echocardiogram",
  "Echocardiogram",
  "Carotid ultrasound",
  "Exercise Stress Test",
  "Stress Echocardiogram",
  "24 Hour Holter Monitor",
  "48 Hour Holter Monitor",
  "5 day Holter Monitor",
  "ECG - Electrocardiogram",
  "24 hour BP Monitor",
  "ABI (Ankle Brachial Index)",
];

const INDICATION_OPTIONS = [
  "Abnormal ECG",
  "CAD / CHF",
  "Post PCI",
  "F/U Known Stable CAD",
  "Abnormal Treadmill Stress Test",
  "Functional Significance Coronary Stenosis",
  "Murmur",
  "Chest Pain",
  "Shortness of breath",
  "Palpitations / Arrhythmias",
  "Edema / PND / Orthopnea",
  "Hypertension / Left ventricular Hypertrophy",
  "Pulmonary Hypertension",
  "Cardiovascular risk assessment",
  "Syncope / Presyncope / Vertigo / Dizziness",
  "Stroke / TIA",
  "Carotid Bruit",
  "Follow-up of known carotid stenosis",
  "Post-surgical angiographic intervention follow-up",
];

const SYSTEM_PROMPT = `You are a data-extraction assistant for ANRA Health, a cardiology clinic in Calgary, Alberta. You read a free-text description (written by either a referring physician or a patient) and extract ONLY the information explicitly stated or clearly and directly implied. You NEVER invent, guess, or assume information that isn't there.

Respond with ONLY valid JSON, no markdown, matching exactly this shape:
{
  "patientName": string (empty string if not mentioned),
  "patientPhone": string (empty string if not mentioned),
  "isSelfReferral": boolean (true if the person appears to be the patient themself, not a referring physician),
  "referringPhysicianName": string (empty string if not applicable or not mentioned),
  "referringPhysicianPhone": string,
  "referringPhysicianAddress": string,
  "urgency": one of ${JSON.stringify(URGENCY_OPTIONS)} or "" if not mentioned,
  "consultationRequested": array, subset of ${JSON.stringify(CONSULTATION_OPTIONS)} — only include what's clearly relevant to what was described,
  "requestedPhysician": one of ${JSON.stringify(PHYSICIAN_OPTIONS)} or "" if no specific physician was named,
  "diagnosticTests": array, subset of ${JSON.stringify(TEST_OPTIONS)} — only include tests explicitly mentioned or requested,
  "indications": array, subset of ${JSON.stringify(INDICATION_OPTIONS)} — only include what matches symptoms/conditions actually described,
  "clinicalNotes": string — a brief, neutral, plain-language summary of what was described, one or two sentences, no invented details
}

Rules:
- If information isn't present in the text, leave that field empty/false/empty-array. Do not guess.
- Never provide a diagnosis or medical advice — this is a data-organization tool only.
- Keep clinicalNotes factual and short, reflecting only what the person wrote.`;

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { description } = body || {};
  if (!description || typeof description !== "string" || description.trim().length < 3) {
    return NextResponse.json({ error: "Missing description" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || "gemini-3.5-flash-lite"}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: description }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", errText);
      return NextResponse.json({ error: "Upstream AI error" }, { status: 502 });
    }

    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    const safeArray = (arr: any, allowed: string[]) => (Array.isArray(arr) ? arr.filter((v: string) => allowed.includes(v)) : []);

    const result = {
      patientName: typeof parsed.patientName === "string" ? parsed.patientName : "",
      patientPhone: typeof parsed.patientPhone === "string" ? parsed.patientPhone : "",
      isSelfReferral: Boolean(parsed.isSelfReferral),
      referringPhysicianName: typeof parsed.referringPhysicianName === "string" ? parsed.referringPhysicianName : "",
      referringPhysicianPhone: typeof parsed.referringPhysicianPhone === "string" ? parsed.referringPhysicianPhone : "",
      referringPhysicianAddress: typeof parsed.referringPhysicianAddress === "string" ? parsed.referringPhysicianAddress : "",
      urgency: URGENCY_OPTIONS.includes(parsed.urgency) ? parsed.urgency : "",
      consultationRequested: safeArray(parsed.consultationRequested, CONSULTATION_OPTIONS),
      requestedPhysician: PHYSICIAN_OPTIONS.includes(parsed.requestedPhysician) ? parsed.requestedPhysician : "",
      diagnosticTests: safeArray(parsed.diagnosticTests, TEST_OPTIONS),
      indications: safeArray(parsed.indications, INDICATION_OPTIONS),
      clinicalNotes: typeof parsed.clinicalNotes === "string" ? parsed.clinicalNotes.trim() : "",
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("Referral generation error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
