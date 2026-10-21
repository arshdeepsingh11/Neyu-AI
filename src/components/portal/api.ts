"use client";

// Tiny data layer for My Health Space: one in-memory cache shared by every
// screen (stale-while-revalidate), request de-duplication, and a mutation
// helper with consistent errors. No dependency needed.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type Entry = { data?: unknown; error?: string; at: number; inflight?: Promise<unknown> };
const cache = new Map<string, Entry>();
const listeners = new Set<() => void>();
let version = 0;
const emit = () => { version++; listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export class ApiError extends Error { constructor(msg: string, public status: number) { super(msg); } }

function onUnauthorized() {
  if (typeof window === "undefined") return;
  // Already on a sign-in / sign-up / verify page: stay there (no "next=…sign-in…" loop).
  if (/^\/my-health\/(sign-in|sign-up|verify)/.test(window.location.pathname)) return;
  window.location.href = "/my-health/sign-in?next=" + encodeURIComponent(window.location.pathname + window.location.search);
}

/** JSON request. Throws ApiError with the server's friendly message. */
export async function api<T = any>(url: string, opts: { method?: string; body?: unknown; raw?: BodyInit; headers?: Record<string, string> } = {}): Promise<T> {
  const res = await fetch(url, {
    method: opts.method || (opts.body !== undefined || opts.raw ? "POST" : "GET"),
    headers: opts.raw ? opts.headers : { ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}), ...opts.headers },
    body: opts.raw ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    credentials: "same-origin",
    cache: "no-store",
  });
  if (res.status === 401) { onUnauthorized(); throw new ApiError("Please sign in again.", 401); }
  if (res.status === 428 && typeof window !== "undefined") { window.location.href = "/my-health/verify"; throw new ApiError("Please verify your email address first.", 428); }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json?.error || "Something went wrong. Please try again.", res.status);
  return json as T;
}

/** Fetch into the shared cache (de-duplicated). */
export function load<T>(url: string, force = false): Promise<T> {
  const e = cache.get(url);
  if (e?.inflight) return e.inflight as Promise<T>;
  if (!force && e?.data !== undefined && Date.now() - e.at < 15_000) return Promise.resolve(e.data as T);
  const p = api<T>(url)
    .then((data) => { cache.set(url, { data, at: Date.now() }); emit(); return data; })
    .catch((err) => { cache.set(url, { ...cache.get(url), error: err.message, at: Date.now(), inflight: undefined }); emit(); throw err; });
  cache.set(url, { ...e, at: e?.at ?? 0, inflight: p });
  return p;
}

/** Put known data into the cache (server bootstrap or a mutation result). */
export function prime<T>(url: string, data: T) { cache.set(url, { data, at: Date.now() }); emit(); }
export function peek<T>(url: string): T | undefined { return cache.get(url)?.data as T | undefined; }
/** Mark cached entries stale so the next view refetches. */
export function invalidate(...urls: string[]) { urls.forEach((u) => { const e = cache.get(u); if (e) e.at = 0; }); }

/** Read a resource; shows cached data instantly and revalidates in the background. */
export function useResource<T>(url: string | null) {
  useSyncExternalStore(subscribe, () => version, () => 0);
  const e = url ? cache.get(url) : undefined;
  const [reloading, setReloading] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (url) load(url).catch(() => {}); }, [url]);
  const reload = useCallback(async () => {
    if (!url) return;
    setReloading(true);
    try { return await load<T>(url, true); } finally { if (mounted.current) setReloading(false); }
  }, [url]);
  return { data: e?.data as T | undefined, error: e?.data === undefined ? e?.error : undefined, loading: !!url && e?.data === undefined && !e?.error, reloading, reload };
}

// Common endpoints
export const EP = {
  today: "/api/portal/today", trends: "/api/portal/trends", results: "/api/portal/results", protocol: "/api/portal/protocol",
  history: "/api/portal/history", appointments: "/api/portal/appointments", referrals: "/api/portal/referrals",
  devices: "/api/portal/devices", settings: "/api/portal/settings", me: "/api/portal/me",
  brief: "/api/portal/brief", heart: "/api/portal/heart", lifestyle: "/api/portal/lifestyle", family: "/api/portal/family", share: "/api/portal/share",
  space: "/api/portal/space", docs: "/api/portal/documents", food: "/api/portal/food", plan: "/api/portal/plan",
  challenges: "/api/portal/challenges", rewards: "/api/portal/rewards", story: "/api/portal/story", retests: "/api/portal/labs/insight", profile: "/api/portal/health-profile",
} as const;

/** Tell the site-wide account button that sign-in state / photo changed. */
export const announceSession = () => { try { window.dispatchEvent(new Event("anra:session")); } catch {} };
