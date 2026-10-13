"use client";

// Saving a generated file (PDF) on every device.
// • Computers / Android browsers: a normal download.
// • iPhone / iPad and the NEYU app: a plain download link is ignored there, so
//   the file is handed to the share sheet (Save to Files, Print, Mail, WhatsApp…)
//   or, when sharing isn't available, opened in the built-in PDF viewer.
// The share sheet needs a fresh tap, so when the file took a moment to build we
// return "needs-tap" and the caller shows a small "Your PDF is ready" button.

export const isIOS = () => typeof navigator !== "undefined" && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
export const isNeyuApp = () => typeof navigator !== "undefined" && /NeyuApp/.test(navigator.userAgent);
const needsShare = () => isIOS() || isNeyuApp();

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.rel = "noopener"; a.style.display = "none";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Share or open the file. Call it straight from a tap. */
export async function shareOrOpen(blob: Blob, name: string): Promise<"shared" | "opened" | "cancelled"> {
  const file = new File([blob], name, { type: blob.type || "application/pdf" });
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], title: name }); return "shared"; }
    catch (e: any) { if (e?.name === "AbortError") return "cancelled"; }
  }
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (!w) window.location.href = url;
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
  return "opened";
}

/** Save the file the right way for this device. */
export async function saveFile(blob: Blob, name: string, opts: { fromTap?: boolean } = {}): Promise<"saved" | "shared" | "opened" | "cancelled" | "needs-tap"> {
  if (!needsShare()) { download(blob, name); return "saved"; }
  if (!opts.fromTap) return "needs-tap";
  try { return await shareOrOpen(blob, name); } catch { return "needs-tap"; }
}
