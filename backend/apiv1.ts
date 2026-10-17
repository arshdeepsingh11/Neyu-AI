// /api/v1 — the versioned staff API (Phase 3 · part 8). Same sign-in and roles as the
// admin console, one consistent shape for every endpoint:
//
//   success  200/201  { "data": … , "next"?: "cursor" }
//   error    4xx/5xx  { "error": { "code": "validation_error", "message": "…", "details"?: [...] } }
//
// Every response carries X-Request-Id (also written to the server log on errors) and
// RateLimit headers. Inputs are validated with zod; unknown fields are rejected.

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z, ZodError, type ZodTypeAny } from "zod";
import { requireAdmin, type Admin } from "@backend/adminAuth";
import { assertAccess, ReasonRequired } from "@backend/access";
import { HttpError, assertSameOrigin, clientMeta } from "@backend/patientAuth";
import { kv } from "@backend/kv";

export const API_VERSION = "1.0.0";
const LIMIT = 300; // requests per staff member per minute

const CODES: Record<number, string> = { 400: "bad_request", 401: "unauthorized", 403: "forbidden", 404: "not_found", 409: "conflict", 413: "too_large", 415: "unsupported_media", 423: "locked", 429: "rate_limited" };

function errorBody(status: number, message: string, extra: Record<string, unknown> = {}) {
  return { error: { code: (extra.code as string) || CODES[status] || "error", message, ...extra } };
}

type Ctx<Q, B> = { admin: Admin; ip: string; query: Q; body: B; params: Record<string, string>; requestId: string };
type Opts<Q extends ZodTypeAny, B extends ZodTypeAny> = {
  perms?: string[] | null;               // permission(s) needed; null = any signed-in staff
  public?: boolean;                       // no sign-in (e.g. /health)
  query?: Q; body?: B;
  patientParam?: string;                  // route param holding a patient id (break-glass per patient)
};

export function v1<Q extends ZodTypeAny = z.ZodAny, B extends ZodTypeAny = z.ZodAny>(opts: Opts<Q, B>, fn: (c: Ctx<z.infer<Q>, z.infer<B>>) => Promise<unknown>) {
  return async (req: Request, route?: { params?: Promise<Record<string, string>> }) => {
    const requestId = randomUUID();
    const headers: Record<string, string> = { "X-Request-Id": requestId, "Cache-Control": "private, no-store", "X-Api-Version": API_VERSION };
    try {
      const { ip } = await clientMeta();
      const params = (await route?.params) || {};
      let admin: Admin | null = null;
      if (!opts.public) {
        admin = await requireAdmin();
        const used = await kv.incr(`v1:${admin.staff?.id || admin.actor}:${Math.floor(Date.now() / 60000)}`, 70);
        headers["RateLimit-Limit"] = String(LIMIT);
        headers["RateLimit-Remaining"] = String(Math.max(0, LIMIT - used));
        if (used > LIMIT) throw new HttpError(429, "Too many requests. Slow down for a minute.");
        await assertAccess(admin, opts.perms === undefined ? null : opts.perms, opts.patientParam ? params[opts.patientParam] : null);
      }
      if (req.method !== "GET" && req.method !== "HEAD") await assertSameOrigin();
      const url = new URL(req.url);
      const query = opts.query ? opts.query.parse(Object.fromEntries(url.searchParams)) : {};
      let body: unknown = {};
      if (opts.body) {
        const text = await req.text();
        if (text.length > 64_000) throw new HttpError(413, "Request too large.");
        let json: unknown;
        try { json = text ? JSON.parse(text) : {}; } catch { throw new HttpError(400, "Body must be JSON."); }
        body = opts.body.parse(json);
      }
      const out = await fn({ admin: admin as Admin, ip, query, body, params, requestId } as Ctx<z.infer<Q>, z.infer<B>>);
      if (out instanceof Response) return out;
      const status = req.method === "POST" ? 201 : 200;
      return NextResponse.json(out && typeof out === "object" && "data" in (out as object) ? out : { data: out }, { status, headers });
    } catch (e) {
      if (e instanceof ZodError) return NextResponse.json(errorBody(400, "Some fields are missing or not valid.", { code: "validation_error", details: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }), { status: 400, headers });
      if (e instanceof ReasonRequired) return NextResponse.json(errorBody(403, e.message, { code: "reason_required", target: e.target, how: "POST /api/v1/access-grants { target, reason }" }), { status: 403, headers });
      if (e instanceof HttpError) return NextResponse.json(errorBody(e.status, e.message), { status: e.status, headers });
      console.error(`[api v1] ${requestId}`, e);
      return NextResponse.json(errorBody(500, "Something went wrong. Quote this id to support: " + requestId, { code: "server_error" }), { status: 500, headers });
    }
  };
}

// Shared schemas
export const zCursor = z.string().regex(/^[\w-]{1,40}$/).optional();
export const zLimit = z.coerce.number().int().min(1).max(100).default(25);
export const zId = z.string().regex(/^[\w-]{1,60}$/);
