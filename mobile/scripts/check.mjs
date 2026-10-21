// Checks the app project before a build: `npm run check`. Prints what is ready and what is missing.
import fs from "node:fs";
import path from "node:path";

const root = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1") + "/..";
const p = (...x) => path.join(root, ...x);
const read = (f) => (fs.existsSync(p(f)) ? fs.readFileSync(p(f), "utf8") : null);
let bad = 0;
const line = (state, text) => { console.log(`${state === true ? "  OK  " : state === false ? "  !!  " : "  --  "} ${text}`); if (state === false) bad++; };

console.log("NEYU app check\n");
const major = Number(process.versions.node.split(".")[0]);
line(major >= 22, `Node.js ${process.versions.node}${major >= 22 ? "" : " — Capacitor 8 needs Node 22 or newer (nodejs.org)"}`);
line(fs.existsSync(p("node_modules/@capacitor/core")), fs.existsSync(p("node_modules/@capacitor/core")) ? "packages installed" : "packages missing — run: npm install");

const cfg = (() => { try { return JSON.parse(read("capacitor.config.json")); } catch { return null; } })();
line(!!cfg, cfg ? `app opens ${cfg.server?.url}` : "capacitor.config.json missing — run: npm run target -- live");
if (cfg?.server?.url && !cfg.server.url.startsWith("https://neyuhealth.com")) line(null, "not the live site — fine for testing; run `npm run target -- live` before a store build");

const man = read("android/app/src/main/AndroidManifest.xml");
if (man) {
  line(["CAMERA", "POST_NOTIFICATIONS", "USE_BIOMETRIC"].every((x) => man.includes(`android.permission.${x}`)) && man.includes('android:scheme="com.neyuhealth.app"'), "Android: permissions and app links set");
  line(fs.existsSync(p("android/app/src/main/assets/capacitor.config.json")), "Android: synced (npx cap sync done)");
  const gs = fs.existsSync(p("firebase/google-services.json"));
  line(gs ? true : null, gs ? "Android push: Firebase file present" : "Android push: off until mobile/firebase/google-services.json is added (README step C)");
} else line(false, "android/ folder missing — run: npx cap add android && npm run sync");

const plist = read("ios/App/App/Info.plist"), ent = read("ios/App/App/App.entitlements");
if (plist) {
  line(["NSFaceIDUsageDescription", "NSCameraUsageDescription", "NSHealthShareUsageDescription", "CFBundleURLTypes"].every((k) => plist.includes(`<key>${k}</key>`)), "iPhone: Face ID / camera / Apple Health texts and app links set");
  line(!!ent && ent.includes("com.apple.developer.healthkit"), "iPhone: Apple Health entitlement");
  line(ent?.includes("aps-environment") ? true : null, ent?.includes("aps-environment") ? "iPhone push: entitlement set (needs a paid Apple Developer account to sign)" : "iPhone push: off (free Apple ID build)");
} else line(false, "ios/ folder missing — run: npx cap add ios && npm run sync");

console.log(bad ? `\n${bad} thing(s) to fix above.` : "\nReady to build.");
process.exit(bad ? 1 : 0);
