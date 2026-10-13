// The address a phone can reach this server on. PUBLIC_BASE_URL wins (set it
// to https://neyuhealth.com in production). When the site is opened as
// localhost on the computer, the computer's Wi-Fi/Ethernet address is used so
// the phone (same Wi-Fi) can reach it — virtual adapters are skipped.
import { networkInterfaces } from "os";

const PRIVATE = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;
const VIRTUAL = /vbox|virtual|vmware|vethernet|wsl|docker|hyper-v|loopback|bridge|utun|tailscale|zerotier|vpn/i;

export function lanAddress(): string | null {
  const nets = networkInterfaces();
  const found: { name: string; addr: string }[] = [];
  for (const [name, list] of Object.entries(nets)) {
    for (const n of list || []) if (n.family === "IPv4" && !n.internal && PRIVATE.test(n.address) && !VIRTUAL.test(name)) found.push({ name, addr: n.address });
  }
  // Prefer Wi-Fi, then Ethernet, then home-router ranges (VirtualBox uses 192.168.56.x).
  const score = (f: { name: string; addr: string }) => (/wi-?fi|wlan|wireless|en0/i.test(f.name) ? 4 : 0) + (/ethernet|eth|en\d/i.test(f.name) ? 2 : 0) + (f.addr.startsWith("192.168.56.") ? -5 : 0) + (f.addr.startsWith("10.") || f.addr.startsWith("192.168.") ? 1 : 0);
  return found.sort((a, b) => score(b) - score(a))[0]?.addr ?? null;
}

export function publicBase(req: Request): { base: string; local: boolean } {
  const env = (process.env.PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");
  if (env) return { base: env, local: false };
  const u = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || u.host;
  const proto = (req.headers.get("x-forwarded-proto") || u.protocol.replace(":", "")).split(",")[0];
  const [hostname, port] = host.split(":");
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(hostname)) {
    const ip = lanAddress();
    return { base: `${proto}://${ip || hostname}${port ? ":" + port : ""}`, local: true };
  }
  return { base: `${proto}://${host}`, local: PRIVATE.test(hostname) || hostname.endsWith(".local") };
}
