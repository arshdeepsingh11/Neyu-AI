// Patient emails that respect the patient's email preferences (Phase 3 · privacy).
//   account   → always sent (sign-in codes, deletion/export notices — required for the account)
//   reminder  → only if "Reminders" is on   (visit nudges, retests, daily brief)
//   news      → only if "News" is on        (off by default, opt-in)
// Every reminder/news email carries an unsubscribe link and one-click unsubscribe headers.

import { prisma } from "@backend/db";
import { enqueue } from "@backend/queue";

export type MailKind = "account" | "reminder" | "news";
type Built = { subject: string; text: string; html: string };

export const publicBase = () => (process.env.PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

export async function emailPrefs(patientId: string) {
  return prisma.emailPreference.upsert({ where: { patientId }, create: { patientId }, update: {} });
}

/** Queues an email to a patient if their preferences allow it. Returns false when skipped. */
export async function patientMail(p: { id: string; email: string }, kind: MailKind, build: (unsubscribeUrl?: string) => Built, base = publicBase()): Promise<boolean> {
  let headers: Record<string, string> | undefined, url: string | undefined;
  if (kind !== "account") {
    const pref = await emailPrefs(p.id);
    if (pref.unsubscribedAt || (kind === "reminder" && !pref.reminders) || (kind === "news" && !pref.news)) return false;
    url = `${base}/unsubscribe?t=${pref.unsubscribeToken}`;
    headers = { "List-Unsubscribe": `<${base}/api/unsubscribe?t=${pref.unsubscribeToken}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
  }
  const msg = build(url);
  await enqueue("email.send", { to: p.email, ...msg, ...(headers ? { headers } : {}) });
  return true;
}
