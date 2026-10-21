// 2-step codes for staff sign-in (RFC 6238 TOTP) — works with Google Authenticator,
// Microsoft Authenticator, 1Password, Authy… 6 digits, 30-second steps, SHA-1
// (the only algorithm every authenticator app supports). No extra packages.

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0, value = 0; const out: number[] = [];
  for (const ch of clean) {
    const i = B32.indexOf(ch);
    if (i < 0) throw new Error("bad base32");
    value = (value << 5) | i; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

/** New random secret (160 bits, as RFC 4226 recommends), base32 for the authenticator app. */
export const newTotpSecret = () => base32Encode(randomBytes(20));

export const STEP_SECONDS = 30;
export const currentStep = (now = Date.now()) => Math.floor(now / 1000 / STEP_SECONDS);

export function totpAt(secret: string, step: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(step));
  const h = createHmac("sha1", base32Decode(secret)).update(msg).digest();
  const off = h[h.length - 1] & 15;
  const n = ((h[off] & 127) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return String(n % 1_000_000).padStart(6, "0");
}

/**
 * Checks a code against the previous, current and next 30-second step (phone clocks drift).
 * Returns the matching step, or null. Pass `afterStep` to refuse a code that was already used.
 */
export function verifyTotp(secret: string, code: string, afterStep = -1, now = Date.now()): number | null {
  const c = String(code || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(c)) return null;
  const s = currentStep(now);
  for (const step of [s - 1, s, s + 1]) {
    if (step <= afterStep) continue;
    const a = Buffer.from(totpAt(secret, step)), b = Buffer.from(c);
    if (timingSafeEqual(a, b)) return step;
  }
  return null;
}

/** otpauth:// link the authenticator app reads from the QR code. */
export function otpauthUri(account: string, secret: string, issuer = "NEYU Health"): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${STEP_SECONDS}`;
}
