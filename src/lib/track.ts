// Anonymous website interest signals for Insights: what people search and click.
// Never on staff pages, share links or My Health Space; never when the browser asks not to
// be tracked (Do Not Track / Global Privacy Control). No names, no form contents.
import { statsAllowed } from "@/lib/statsConsent";

const recent = new Map<string, number>();

export function track(type: "search" | "click", label: string, target?: string) {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (/^\/(admin|share|my-health|connect|app-start)(\/|$)/.test(path)) return;
  if (!statsAllowed()) return; // Do Not Track, Global Privacy Control or turned off on /cookies
  const clean = label.replace(/\s+/g, " ").trim().slice(0, 80);
  if (clean.length < 2) return;
  const key = `${type}|${clean}|${target || ""}`;
  const now = Date.now();
  if (now - (recent.get(key) || 0) < 1500) return; // double clicks count once
  recent.set(key, now);
  const body = JSON.stringify({ type, label: clean, path, target });
  if (!navigator.sendBeacon?.("/api/log-event", new Blob([body], { type: "application/json" }))) {
    fetch("/api/log-event", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  }
}

/** Readable name of a clicked link or button. */
export function labelOf(el: HTMLElement): string {
  const own = el.getAttribute("data-track") || el.getAttribute("aria-label") || el.getAttribute("title");
  if (own) return own;
  const text = (el.innerText || el.textContent || "").split("\n").map((x) => x.trim()).find(Boolean) || "";
  return text;
}
