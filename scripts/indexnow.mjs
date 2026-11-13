// Tell IndexNow search engines (Bing, Yandex, Seznam…) about every public page,
// so new or changed pages are crawled within hours instead of days.
//   npm run indexnow                 (all pages in the live sitemap)
//   npm run indexnow -- /dna-test-calgary /health-answers/what-is-hs-crp
// Needs INDEXNOW_KEY in .env (8–128 letters, numbers or dashes, e.g. openssl rand -hex 16)
// and the site live at PUBLIC_BASE_URL. Does nothing when the key is not set.
import fs from "node:fs";

function env(name) {
  if (process.env[name]) return process.env[name].trim();
  try {
    const line = fs.readFileSync(".env", "utf8").split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith(name + "=")).pop();
    return line ? line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "") : "";
  } catch { return ""; }
}

const key = env("INDEXNOW_KEY");
const site = (env("NEXT_PUBLIC_SITE_URL") || env("PUBLIC_BASE_URL") || "https://neyuhealth.com").replace(/\/+$/, "");
if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) { console.log("IndexNow: INDEXNOW_KEY is not set — skipped."); process.exit(0); }
if (!site.startsWith("https://")) { console.log(`IndexNow: ${site} is not a public https address — skipped.`); process.exit(0); }
const host = new URL(site).host;

async function main() {
  const keyCheck = await fetch(`${site}/indexnow.txt`).then((r) => r.text()).catch(() => "");
  if (keyCheck.trim() !== key) { console.error(`✗ ${site}/indexnow.txt does not return the key yet. Deploy first (and copy .env into .next/standalone).`); process.exit(1); }
  let urls = process.argv.slice(2).map((p) => (p.startsWith("http") ? p : site + (p.startsWith("/") ? p : "/" + p)));
  if (!urls.length) {
    const xml = await fetch(`${site}/sitemap.xml`).then((r) => r.text());
    urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  }
  urls = urls.filter((u) => new URL(u).host === host);
  if (!urls.length) { console.log("IndexNow: no URLs to submit."); return; }
  const r = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key, keyLocation: `${site}/indexnow.txt`, urlList: urls.slice(0, 10000) }),
  });
  if (r.status === 200 || r.status === 202) console.log(`✓ IndexNow: ${urls.length} URLs submitted (${r.status}).`);
  else { console.error(`✗ IndexNow answered ${r.status}: ${await r.text().catch(() => "")}`); process.exit(1); }
}
main().catch((e) => { console.error("✗ IndexNow failed:", e.message); process.exit(1); });
