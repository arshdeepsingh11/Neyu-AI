// Shared plumbing for My Health Space route handlers: consistent JSON
// errors, auth + same-origin guards, safe JSON body parsing.

import { NextResponse } from "next/server";
import { HttpError, assertSameOrigin, requirePatient, clientMeta, type CurrentPatient } from "@backend/patientAuth";

type Handler<T> = (ctx: { patient: CurrentPatient; ip: string }) => Promise<T>;

const NO_STORE = { "Cache-Control": "private, no-store" };

function toResponse(e: unknown) {
  if (e instanceof HttpError) {
    const x = e as HttpError & { code?: string; target?: string; label?: string };
    return NextResponse.json({ error: e.message, ...(x.code ? { code: x.code, target: x.target, label: x.label } : {}) }, { status: e.status, headers: NO_STORE });
  }
  console.error("Portal API error:", e);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500, headers: NO_STORE });
}

/** GET-style handler: requires a signed-in patient. */
export async function withPatient<T>(fn: Handler<T>) {
  try {
    const patient = await requirePatient();
    const { ip } = await clientMeta();
    const data = await fn({ patient, ip });
    if (data instanceof Response) return data;
    return NextResponse.json(data, { headers: NO_STORE });
  } catch (e) {
    return toResponse(e);
  }
}

/** Mutating handler: same-origin check + signed-in patient. */
export async function withPatientMutation<T>(fn: Handler<T>) {
  try {
    await assertSameOrigin();
  } catch (e) {
    return toResponse(e);
  }
  return withPatient(fn);
}

export async function readJson<T = any>(req: Request, maxBytes = 64_000): Promise<T> {
  const len = Number(req.headers.get("content-length") || 0);
  if (len > maxBytes) throw new HttpError(413, "Request too large.");
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, "Request too large.");
  try {
    return (text ? JSON.parse(text) : {}) as T;
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}

export { HttpError, toResponse, NO_STORE };

// Small validators
export const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
export const bool = (v: unknown) => v === true;
