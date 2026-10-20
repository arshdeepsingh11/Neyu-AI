// Visitor choice for anonymous visit statistics. "off" is remembered in a first-party cookie
// (neyu_stats, 1 year) so the server can respect it too. Do Not Track / Global Privacy
// Control always mean off.
export const STATS_COOKIE = "neyu_stats";

export function browserOptOut() {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.doNotTrack === "1" || nav.globalPrivacyControl === true;
}
export function statsAllowed() {
  if (typeof document === "undefined") return true;
  if (browserOptOut()) return false;
  return !document.cookie.split("; ").includes(`${STATS_COOKIE}=off`);
}
export function setStatsAllowed(on: boolean) {
  document.cookie = on ? `${STATS_COOKIE}=; path=/; max-age=0; samesite=lax` : `${STATS_COOKIE}=off; path=/; max-age=31536000; samesite=lax`;
}
/** Server side: the request says no (cookie or Global Privacy Control header). */
export function requestOptedOut(req: Request) {
  const c = req.headers.get("cookie") || "";
  return /(?:^|;\s*)neyu_stats=off(?:;|$)/.test(c) || req.headers.get("sec-gpc") === "1" || req.headers.get("dnt") === "1";
}
