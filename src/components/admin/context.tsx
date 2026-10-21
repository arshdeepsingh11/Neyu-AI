"use client";

// Console-wide helpers shared by every screen: navigation, data loading,
// running staff actions (with toasts + undo), and opening sheets/dialogs.

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Go } from "@/lib/admin/types";

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

// Break-glass: when the server answers "reason_required", the console asks the staff
// member for a reason (ReasonDialog), records it, and retries the same request once.
type ReasonAsk = (label: string) => Promise<string | null>;
let askReason: ReasonAsk | null = null;
const pendingAsks = new Map<string, Promise<boolean>>();
export function setReasonAsker(fn: ReasonAsk | null) { askReason = fn; }
async function breakGlass(j: { target?: string; label?: string }): Promise<boolean> {
  if (!askReason || !j.target) return false;
  const key = j.target;
  if (!pendingAsks.has(key)) {
    pendingAsks.set(key, (async () => {
      const reason = await askReason!(j.label || "this record");
      if (!reason) return false;
      const r = await fetch("/api/admin/action", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ action: "access.grant", target: j.target, reason }) });
      return r.ok;
    })().finally(() => setTimeout(() => pendingAsks.delete(key), 0)));
  }
  return pendingAsks.get(key)!;
}

export async function getView<T>(view: string, params: Record<string, string | undefined> = {}, retried = false): Promise<T> {
  const q = new URLSearchParams({ view });
  Object.entries(params).forEach(([k, v]) => v != null && v !== "" && q.set(k, v));
  const r = await fetch("/api/admin/data?" + q.toString(), { cache: "no-store", credentials: "same-origin" });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) window.dispatchEvent(new Event("anra-admin-signed-out"));
  if (r.status === 403 && j.code === "reason_required" && !retried && (await breakGlass(j))) return getView<T>(view, params, true);
  if (!r.ok) throw new ApiError(r.status, j.error || "Something went wrong.");
  return j as T;
}

export async function postAction<T = any>(body: Record<string, unknown>, retried = false): Promise<T> {
  const r = await fetch("/api/admin/action", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && body.action !== "session.unlock") window.dispatchEvent(new Event("anra-admin-signed-out"));
  if (r.status === 403 && j.code === "reason_required" && !retried && (await breakGlass(j))) return postAction<T>(body, true);
  if (!r.ok) throw new ApiError(r.status, j.error || "Something went wrong.");
  return j as T;
}

/** Does this staff member have the permission? (null perms = old shared password = everything) */
export const hasPerm = (perms: Record<string, string> | null | undefined, ...keys: string[]) => perms === null || perms === undefined || keys.some((k) => !!perms[k]);

export function downloadFile(f: { name: string; mime: string; content: string }) {
  const url = URL.createObjectURL(new Blob([f.content], { type: f.mime }));
  const a = document.createElement("a");
  a.href = url; a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export type FormType = "lab" | "protocol" | "appt" | "care" | "reading" | "link" | "schedule";
export interface ConfirmSpec { title: string; body: string; label: string; danger?: boolean; run: () => void | Promise<void> }
export interface ActOpts { success: string; sub?: string | ((r: any) => string); undoable?: boolean; after?: (r: any) => void }

export interface AdminCtx {
  actor: string;
  perms: Record<string, string> | null | undefined;
  system?: { store: string; storage: string; queue: string };
  canEdit: boolean;
  mobile: boolean;
  version: number;
  refresh: () => void;
  go: (g: Go | { s: string; id?: string; tab?: string }) => void;
  setTab: (tab: string) => void;
  openAI: (key: string) => void;
  openRef: (id: string) => void;
  openAudit: (id: string) => void;
  openForm: (type: FormType, patientId: string, init?: Record<string, string>, editId?: string) => void;
  toast: (title: string, sub?: string, undo?: (() => void) | null, tone?: "ok" | "err") => void;
  confirm: (c: ConfirmSpec) => void;
  act: (body: Record<string, unknown>, opts: ActOpts) => Promise<any>;
  askReveal: (patientId: string, pname: string, section: "health" | "labs" | "ai", label: string, onData: (d: any) => void) => void;
  askDelete: (patientId: string, pname: string) => void;
  askExport: (patientId: string, pname: string) => void;
  range: string;
  rangeParams: Record<string, string | undefined>;
  menu: string | null;
  setMenu: (m: string | null) => void;
}

export const Ctx = createContext<AdminCtx | null>(null);
export const useAdmin = () => useContext(Ctx)!;

/** Load a view; keeps showing the last data while refetching after an action. */
export function useView<T>(view: string | null, params: Record<string, string | undefined> = {}, opts: { logFirst?: boolean } = {}) {
  const { version } = useAdmin();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const key = view + "|" + JSON.stringify(params);
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (!view) return;
    let live = true;
    const fresh = lastKey.current !== key;
    if (fresh) { setLoading(true); setData(null); }
    setError(null);
    getView<T>(view, { ...params, ...(fresh && opts.logFirst ? { log: "1" } : {}) })
      .then((d) => { if (live) { setData(d); lastKey.current = key; } })
      .catch((e) => { if (live) setError(e.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version, nonce]);

  const reload = useCallback(() => { lastKey.current = null; setNonce((n) => n + 1); }, []);
  return { data, error, loading: loading && !data, reload, setData };
}
