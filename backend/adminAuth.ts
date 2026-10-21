// Admin console authentication.
//
// Phase 3: every staff member signs in with their own email + password + 2-step
// code (backend/staffAuth.ts). The old shared ADMIN_PASSWORD still works ONLY
// until the first super admin has finished their own sign-in — then it is
// switched off automatically (see legacyLoginAllowed).
//
// Old shared-password token: HMAC-signed "admin:<issuedAt>:<actor>", so nobody
// can forge one without ADMIN_SESSION_SECRET.

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { HttpError } from "@backend/patientAuth";
import { getStaff, legacyLoginAllowed, type Staff } from "@backend/staffAuth";

const SECRET = process.env.ADMIN_SESSION_SECRET || "";
export const ADMIN_COOKIE = "admin_token";
export const ADMIN_SESSION_HOURS = 12;
const MAX_AGE_MS = ADMIN_SESSION_HOURS * 60 * 60 * 1000;

export interface Admin {
  actor: string; // email (staff) or typed identifier (old shared password) — names them in the audit log
  staff: Staff | null; // null only for the old shared password
  role: string; // display label for the audit log
}

export function checkAdminPassword(candidate: string): boolean {
  const real = process.env.ADMIN_PASSWORD || "";
  if (!real || !candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(real);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Staff identifier: trimmed, lower-cased, safe characters only. */
export function cleanActor(v: unknown): string {
  const s = typeof v === "string" ? v.trim().toLowerCase().replace(/[^a-z0-9@._+-]/g, "").slice(0, 80) : "";
  return s || "admin";
}

export function createAdminToken(actor = "admin"): string {
  const payload = `admin:${Date.now()}:${Buffer.from(cleanActor(actor)).toString("base64url")}`;
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

/** Returns the identifier inside an old shared-password token, or null if missing, forged or expired. */
export function readAdminToken(token: string | undefined | null): { actor: string } | null {
  if (!token || !SECRET || token.length > 600) return null;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const dot = decoded.lastIndexOf(".");
    const payload = decoded.slice(0, dot), sig = decoded.slice(dot + 1);
    if (!payload || !sig) return null;
    const expected = Buffer.from(createHmac("sha256", SECRET).update(payload).digest("hex"));
    const got = Buffer.from(sig);
    if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null;
    const [kind, ts, actorB64] = payload.split(":");
    const issued = Number(ts);
    if (kind !== "admin" || !issued || Date.now() - issued > MAX_AGE_MS) return null;
    return { actor: actorB64 ? cleanActor(Buffer.from(actorB64, "base64url").toString("utf-8")) : "admin" };
  } catch {
    return null;
  }
}

/** The signed-in admin: a staff account first, else a still-allowed shared-password session. */
export async function getAdmin(): Promise<Admin | null> {
  const staff = await getStaff();
  if (staff) return { actor: staff.email, staff, role: staff.roles.map((r) => r.name).join(", ") };
  const old = readAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
  if (old && (await legacyLoginAllowed())) return { actor: old.actor, staff: null, role: "Admin (shared)" };
  return null;
}

/** Route guard: throws 401 when no valid admin session. */
export async function requireAdmin(): Promise<Admin> {
  const a = await getAdmin();
  if (!a) throw new HttpError(401, "Admin sign-in required.");
  return a;
}
