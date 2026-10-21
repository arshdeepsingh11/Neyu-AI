"use client";
// Saving and sharing files in the NEYU app: the file is written to the app's cache and handed to
// the phone's share sheet (Save to Files, Print, Mail, Drive…). WebViews ignore normal downloads.
import { plugin } from "./bridge";

const toBase64 = (blob: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).split(",")[1] || "");
  r.onerror = () => rej(r.error);
  r.readAsDataURL(blob);
});
const safeName = (n: string) => n.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 120) || "NEYU file";

/** True = the share sheet was shown (or the patient closed it). False = not in the app / failed. */
export async function nativeShare(blob: Blob, name: string): Promise<"shared" | "cancelled" | false> {
  const fs = await plugin("Filesystem"), share = await plugin("Share");
  if (!fs || !share) return false;
  try {
    const path = `share/${Date.now()}-${safeName(name)}`;
    const w = await fs.writeFile({ path, data: await toBase64(blob), directory: "CACHE", recursive: true });
    try { await share.share({ title: name, files: [w.uri], dialogTitle: "Save or share" }); return "shared"; }
    catch (e: any) { return /cancel/i.test(String(e?.message || e)) ? "cancelled" : false; }
    finally { setTimeout(() => fs.deleteFile({ path, directory: "CACHE" }).catch(() => {}), 120_000); }
  } catch { return false; }
}

/** File name from a download response (Content-Disposition), else the fallback. */
export function fileNameFrom(res: Response, fallback: string) {
  const cd = res.headers.get("content-disposition") || "";
  const m = cd.match(/filename\*=UTF-8''([^;]+)/i) || cd.match(/filename="?([^";]+)"?/i);
  try { return m ? decodeURIComponent(m[1]) : fallback; } catch { return fallback; }
}
