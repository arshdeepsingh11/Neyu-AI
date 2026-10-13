// Email check — sends one real test email and explains any problem.
//   npm run email:test -- you@example.com
// Reads SMTP settings from .env.local and .env (same as the app).
import fs from "fs";
import nodemailer from "nodemailer";

for (const f of [".env.local", ".env"]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const to = process.argv[2];
const { SMTP_HOST, SMTP_PORT = "587", SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;
const mask = (v) => (v ? v.slice(0, 4) + "…" + ` (${v.length} chars)` : "MISSING");
console.log("\nNEYU email check");
console.log("  SMTP_HOST:", SMTP_HOST || "MISSING");
console.log("  SMTP_PORT:", SMTP_PORT);
console.log("  SMTP_USER:", SMTP_USER || "MISSING");
console.log("  SMTP_PASS:", mask(SMTP_PASS));
console.log("  MAIL_FROM:", MAIL_FROM || "(not set — will use SMTP_USER, which usually fails)");
if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) { console.log("\n✗ SMTP settings are missing in .env — in development the code is printed in the terminal instead of emailed.\n"); process.exit(1); }
if (!to) { console.log("\nUsage: npm run email:test -- you@example.com\n"); process.exit(1); }
const port = Number(SMTP_PORT);
const t = nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465 || port === 2465, requireTLS: !(port === 465 || port === 2465), auth: { user: SMTP_USER, pass: SMTP_PASS }, connectionTimeout: 10000 });
const why = (e) => {
  const m = `${e?.responseCode || ""} ${e?.code || ""} ${e?.response || ""} ${e?.message || ""}`;
  if (/EAUTH|535|invalid|authentication/i.test(m)) return "Login failed: SMTP_USER must be 'resend' and SMTP_PASS your Resend API key (starts with re_).";
  if (/not verified|verify a domain/i.test(m)) return "Your sender domain isn't verified in Resend. Add the DNS records Resend shows for neyuhealth.com and wait for 'Verified'.";
  if (/testing emails|own email/i.test(m)) return "Resend test mode: until a domain is verified it only sends to the email you signed up to Resend with.";
  if (/ENOTFOUND|EAI_AGAIN/i.test(m)) return "SMTP_HOST not found (Resend: smtp.resend.com).";
  if (/ETIMEDOUT|ECONNREFUSED|ESOCKET|ECONNRESET/i.test(m)) return "Can't reach the SMTP server — port blocked? Try SMTP_PORT=465, 587, 2465 or 2587.";
  if (/from|sender/i.test(m)) return "MAIL_FROM not allowed — use NEYU Health <no-reply@neyuhealth.com> (a verified domain).";
  return "See the error above.";
};
try { await t.verify(); console.log("\n✓ Logged in to the SMTP server"); }
catch (e) { console.log("\n✗ Could not log in:", e.response || e.message, "\n  →", why(e), "\n"); process.exit(1); }
try {
  const r = await t.sendMail({ from: MAIL_FROM || SMTP_USER, to, subject: "NEYU Health — email test", text: "If you can read this, NEYU Health email works.", html: "<p>If you can read this, <b>NEYU Health</b> email works.</p>" });
  console.log("✓ Sent to", to, "— id", r.messageId, "\n  Not in the inbox? Check Spam/Junk, and the Resend dashboard → Emails.\n");
} catch (e) { console.log("\n✗ Sending failed:", e.response || e.message, "\n  →", why(e), "\n"); process.exit(1); }
