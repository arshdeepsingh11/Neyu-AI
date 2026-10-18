// Chooses which NEYU server the app opens. Writes capacitor.config.json.
//
//   npm run target -- live                      https://neyuhealth.com (default, for the stores)
//   npm run target -- staging https://staging.neyuhealth.com
//   npm run target -- pc 192.168.1.50           your PC on the same Wi-Fi (http://IP:3000, test builds only)
//
// Then: npx cap sync   (and rebuild the app). Switch back to "live" before sharing a build.
import fs from "node:fs";

const [mode = "live", arg] = process.argv.slice(2);
let url, cleartext = false;
if (mode === "live") url = "https://neyuhealth.com";
else if (mode === "staging") {
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(arg || "")) { console.error('Give the staging address, e.g. npm run target -- staging https://staging.neyuhealth.com'); process.exit(1); }
  url = arg;
} else if (mode === "pc") {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(arg || "")) { console.error("Give your PC's Wi-Fi address, e.g. npm run target -- pc 192.168.1.50  (find it with: ipconfig)"); process.exit(1); }
  url = `http://${arg}:3000`; cleartext = true;
} else { console.error("Use: live | staging <https://…> | pc <IP>"); process.exit(1); }

const host = new URL(url).hostname;
const config = {
  appId: "com.neyuhealth.app",
  appName: "NEYU",
  webDir: "www",
  backgroundColor: "#F7F6F2",
  appendUserAgent: "NeyuApp/1",
  server: {
    url: `${url}/app-start`,
    cleartext,
    allowNavigation: [host, ...(host.endsWith("neyuhealth.com") ? ["neyuhealth.com", "*.neyuhealth.com"] : [])].filter((v, i, a) => a.indexOf(v) === i),
    errorPath: "offline.html",
  },
  android: { allowMixedContent: false, captureInput: true, webContentsDebuggingEnabled: mode !== "live" },
  ios: { contentInset: "never", limitsNavigationsToAppBoundDomains: false },
  plugins: {
    SplashScreen: { launchAutoHide: true, launchShowDuration: 1200, backgroundColor: "#F7F6F2", showSpinner: false, androidScaleType: "CENTER_CROP" },
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
    StatusBar: { overlaysWebView: false, style: "LIGHT", backgroundColor: "#F7F6F2" },
  },
};
fs.writeFileSync(new URL("../capacitor.config.json", import.meta.url), JSON.stringify(config, null, 2) + "\n");
// The offline page's "Try again" goes back to the same server.
const off = new URL("../www/offline.html", import.meta.url);
fs.writeFileSync(off, fs.readFileSync(off, "utf8").replace(/location\.replace\('[^']*'\)/, `location.replace('${url}/app-start')`));
const idx = new URL("../www/index.html", import.meta.url);
fs.writeFileSync(idx, fs.readFileSync(idx, "utf8").replace(/location\.replace\("[^"]*"\)/, `location.replace("${url}/app-start")`));
console.log(`App opens ${url}/app-start${cleartext ? "  (plain http — test builds only)" : ""}. Now run: npx cap sync`);
