// Outgoing email (SMTP via nodemailer) — works with Microsoft 365, Google
// Workspace, Zoho, Amazon SES or any SMTP provider. Configure in .env:
//   SMTP_HOST, SMTP_PORT (587 or 465), SMTP_USER, SMTP_PASS, MAIL_FROM
// Development without SMTP: the email is printed to the server console so
// sign-up can still be tested. Production without SMTP: sending fails loudly.

import nodemailer, { type Transporter } from "nodemailer";

let transport: Transporter | null = null;

export const emailConfigured = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

function getTransport(): Transporter {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 587);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465 || port === 2465, // 587 / 2587 use STARTTLS
      requireTLS: !(port === 465 || port === 2465),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      pool: true,
      maxConnections: 3,
      // Stay under the provider's limit (Resend: 10 requests/second per team) when many people sign up at once.
      rateDelta: 1000,
      rateLimit: 8,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    } as any);
  }
  return transport;
}

/** Plain-English reason for a failed send — printed in the server log so problems are obvious. */
export function explainEmailError(e: any): string {
  const m = `${e?.responseCode || ""} ${e?.code || ""} ${e?.response || ""} ${e?.message || ""}`;
  if (/EAUTH|535|invalid.*(api key|credentials)|authentication/i.test(m)) return "SMTP login failed — check SMTP_USER (Resend: 'resend') and SMTP_PASS (your Resend API key).";
  if (/domain.*not verified|verify a domain|not.*verified/i.test(m)) return "The sender domain isn't verified. Verify neyuhealth.com in Resend (DNS records), and use MAIL_FROM on that domain.";
  if (/only send testing emails|own email address|testing emails/i.test(m)) return "Resend is in test mode: it only sends to your own Resend account email until a domain is verified.";
  if (/ENOTFOUND|EAI_AGAIN/i.test(m)) return "SMTP_HOST can't be found — check the host name (Resend: smtp.resend.com) and internet/DNS on the server.";
  if (/ETIMEDOUT|ECONNREFUSED|ESOCKET|ECONNRESET/i.test(m)) return "Can't connect to the SMTP server — the port may be blocked by the firewall. Try SMTP_PORT=465 or 587 (or 2465/2587 for Resend).";
  if (/429|rate|too many/i.test(m)) return "Sending too fast or over the daily quota (Resend free plan: 100/day).";
  if (/from|sender/i.test(m)) return "MAIL_FROM is not accepted — use an address on your verified domain, e.g. NEYU Health <no-reply@neyuhealth.com>.";
  return "Unknown email error — see the details above.";
}
const temporary = (e: any) => /429|421|45\d|ETIMEDOUT|ECONNRESET|ESOCKET|EAI_AGAIN|rate/i.test(`${e?.responseCode || ""} ${e?.code || ""} ${e?.message || ""}`);

export async function sendMail(msg: { to: string; subject: string; text: string; html: string }) {
  const dev = process.env.NODE_ENV !== "production";
  const printToConsole = (why: string) => console.log(`\n[DEV EMAIL — ${why}]\nTo: ${msg.to}\nSubject: ${msg.subject}\n\n${msg.text}\n`);
  if (!emailConfigured()) {
    if (!dev) throw new Error("Email is not configured (SMTP_HOST / SMTP_USER / SMTP_PASS).");
    printToConsole("SMTP not configured");
    return;
  }
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await getTransport().sendMail({ from, ...msg });
      return;
    } catch (e: any) {
      console.error(`Email to ${msg.to.replace(/(^.).*(@.*$)/, "$1***$2")} failed (attempt ${attempt}): ${e?.responseCode || e?.code || ""} ${String(e?.response || e?.message || "").slice(0, 200)}\n  → ${explainEmailError(e)}`);
      if (attempt < 3 && temporary(e)) { await new Promise((r) => setTimeout(r, attempt * 1500)); continue; }
      if (dev) { printToConsole("sending failed, showing it here so you can keep testing"); return; } // local testing never blocks
      throw e;
    }
  }
}

/** Checks the SMTP login without sending (used by `npm run email:test`). */
export async function verifyEmailConnection(): Promise<string> {
  if (!emailConfigured()) return "SMTP is not configured.";
  try { await getTransport().verify(); return "ok"; } catch (e: any) { return explainEmailError(e); }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** Branded 6-digit code email. */
export function codeEmail(firstName: string, code: string) {
  const text = `Hi ${firstName},\n\nYour NEYU Health verification code is: ${code}\n\nIt expires in 10 minutes. If you didn't create a My Health Space account, you can ignore this email.\n\nNEYU Health · Calgary, Alberta`;
  const html = `<!doctype html><html><body style="margin:0;background:#F6F4F1;font-family:Arial,Helvetica,sans-serif;color:#1D2327">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFDFB;border-radius:20px;border:1px solid #ECE8E2;padding:32px">
<tr><td style="font-size:12px;letter-spacing:2px;color:#5B6369;font-weight:bold">NEYU HEALTH</td></tr>
<tr><td style="font-size:22px;padding:6px 0 18px">Verify your email</td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#454C52">Hi ${esc(firstName)}, enter this code in My Health Space to confirm your email address.</td></tr>
<tr><td align="center" style="padding:24px 0"><div style="display:inline-block;font-size:34px;letter-spacing:10px;font-weight:bold;color:#2F5A66;background:#E8F2F4;border-radius:14px;padding:14px 22px">${code}</div></td></tr>
<tr><td style="font-size:13px;line-height:1.6;color:#5B6369">The code expires in 10 minutes. If you didn't create an account, you can ignore this email — nobody can use it without this code.</td></tr>
<tr><td style="font-size:12px;color:#737A80;padding-top:24px;border-top:1px solid #EFECE8;margin-top:24px">NEYU Health · Calgary, Alberta · Never share this code, even with NEYU staff.</td></tr>
</table></td></tr></table></body></html>`;
  return { subject: `${code} is your NEYU Health verification code`, text, html };
}

/** Branded plain email (invites, daily brief, reminders). */
export function simpleEmail(title: string, paragraphs: string[], button?: { label: string; url: string }, footer = "NEYU Health · Calgary, Alberta") {
  const text = [title, "", ...paragraphs, ...(button ? ["", `${button.label}: ${button.url}`] : []), "", footer].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#F6F4F1;font-family:Arial,Helvetica,sans-serif;color:#1D2327">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFDFB;border-radius:20px;border:1px solid #ECE8E2;padding:32px">
<tr><td style="font-size:12px;letter-spacing:2px;color:#5B6369;font-weight:bold">NEYU HEALTH</td></tr>
<tr><td style="font-size:22px;padding:6px 0 14px">${esc(title)}</td></tr>
${paragraphs.map((p) => `<tr><td style="font-size:15px;line-height:1.6;color:#454C52;padding-bottom:10px">${esc(p)}</td></tr>`).join("\n")}
${button ? `<tr><td style="padding:14px 0"><a href="${esc(button.url)}" style="display:inline-block;background:#3F6F7C;color:#FFFDFB;text-decoration:none;border-radius:12px;padding:12px 18px;font-size:15px">${esc(button.label)}</a></td></tr>` : ""}
<tr><td style="font-size:12px;color:#737A80;padding-top:20px;border-top:1px solid #EFECE8">${esc(footer)}</td></tr>
</table></td></tr></table></body></html>`;
  return { subject: title, text, html };
}
