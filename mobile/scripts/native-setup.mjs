// Applies NEYU's native settings to the Android and iOS projects. Safe to run any number
// of times (it only adds what is missing). Runs automatically with `npm run sync`.
//
//   npm run native                     both platforms
//   npm run native -- --free-apple-id  iPhone test builds with a free Apple ID (no push)
//
// Android: min Android 8 (Health Connect), camera / notifications / fingerprint permissions,
//          only the Health Connect permissions NEYU reads (Google reviews each one),
//          com.neyuhealth.app:// links, privacy-policy link, Firebase file if present.
// iOS:     Face ID / camera / photos / Apple Health texts, push + Apple Health entitlements,
//          com.neyuhealth.app:// links, push token hand-off in AppDelegate.
import fs from "node:fs";
import path from "node:path";

const root = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1") + "/..";
const p = (...x) => path.join(root, ...x);
const freeAppleId = process.argv.includes("--free-apple-id");
const SCHEME = "com.neyuhealth.app";
const PRIVACY_URL = "https://neyuhealth.com/app-privacy";
const changed = [];
const edit = (file, fn) => {
  if (!fs.existsSync(file)) return false;
  const before = fs.readFileSync(file, "utf8");
  const after = fn(before);
  if (after !== before) { fs.writeFileSync(file, after); changed.push(path.relative(root, file)); }
  return true;
};

// Health Connect data NEYU reads. Everything else the plugin declares is removed.
const HC_READ = ["STEPS", "DISTANCE", "ACTIVE_CALORIES_BURNED", "HEART_RATE", "RESTING_HEART_RATE", "HEART_RATE_VARIABILITY",
  "OXYGEN_SATURATION", "SLEEP", "WEIGHT", "BLOOD_PRESSURE", "BLOOD_GLUCOSE", "EXERCISE"];
const HC_ALL = ["STEPS", "DISTANCE", "ACTIVE_CALORIES_BURNED", "HEART_RATE", "WEIGHT", "SLEEP", "RESPIRATORY_RATE", "OXYGEN_SATURATION",
  "RESTING_HEART_RATE", "HEART_RATE_VARIABILITY", "VO2_MAX", "BLOOD_PRESSURE", "BLOOD_GLUCOSE", "BODY_TEMPERATURE", "HEIGHT",
  "FLOORS_CLIMBED", "BODY_FAT", "BASAL_BODY_TEMPERATURE", "BASAL_METABOLIC_RATE", "TOTAL_CALORIES_BURNED", "MINDFULNESS",
  "HYDRATION", "NUTRITION", "EXERCISE"];

// ── Android ─────────────────────────────────────────────────────────────────
if (fs.existsSync(p("android"))) {
  edit(p("android/variables.gradle"), (s) => s.replace(/minSdkVersion = \d+/, "minSdkVersion = 26"));

  edit(p("android/app/src/main/AndroidManifest.xml"), (s) => {
    if (!s.includes("xmlns:tools")) s = s.replace('<manifest xmlns:android="http://schemas.android.com/apk/res/android"', '<manifest xmlns:android="http://schemas.android.com/apk/res/android"\n    xmlns:tools="http://schemas.android.com/tools"');
    const perms = [
      '<uses-permission android:name="android.permission.CAMERA" />',
      '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
      '<uses-permission android:name="android.permission.USE_BIOMETRIC" />',
      '<uses-feature android:name="android.hardware.camera" android:required="false" />',
      ...HC_ALL.flatMap((t) => [
        ...(HC_READ.includes(t) ? [] : [`<uses-permission android:name="android.permission.health.READ_${t}" tools:node="remove" />`]),
        `<uses-permission android:name="android.permission.health.WRITE_${t}" tools:node="remove" />`,
      ]),
    ].filter((line) => !s.includes(line));
    if (perms.length) s = s.replace('<uses-permission android:name="android.permission.INTERNET" />', '<uses-permission android:name="android.permission.INTERNET" />\n    ' + perms.join("\n    "));
    // Links that open the app: com.neyuhealth.app://… (sign-in return from Withings/Oura/WHOOP, email links).
    if (!s.includes(`android:scheme="${SCHEME}"`)) {
      s = s.replace(/(<category android:name="android.intent.category.LAUNCHER" \/>\s*<\/intent-filter>)/, `$1

            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="${SCHEME}" />
            </intent-filter>`);
    }
    return s;
  });

  edit(p("android/app/src/main/res/values/strings.xml"), (s) => s.includes("health_connect_privacy_policy_url") ? s
    : s.replace("</resources>", `    <string name="health_connect_privacy_policy_url">${PRIVACY_URL}</string>\n</resources>`));

  // Push on Android needs the Firebase file for this app (see mobile/README.md).
  const gs = p("firebase/google-services.json");
  if (fs.existsSync(gs)) {
    const dest = p("android/app/google-services.json");
    if (!fs.existsSync(dest) || fs.readFileSync(dest, "utf8") !== fs.readFileSync(gs, "utf8")) { fs.copyFileSync(gs, dest); changed.push("android/app/google-services.json"); }
  }
}

// ── Which phone features the app has (read by the website through the user agent) ──
// "NeyuPush/1" = this build can receive push notifications (Android: only with the Firebase file).
{
  const androidPush = fs.existsSync(p("firebase/google-services.json"));
  for (const f of [p("capacitor.config.json"), p("android/app/src/main/assets/capacitor.config.json"), p("ios/App/App/capacitor.config.json")]) {
    edit(f, (s) => {
      const c = JSON.parse(s);
      c.android = { ...(c.android || {}), appendUserAgent: "NeyuApp/1" + (androidPush ? " NeyuPush/1" : "") };
      c.ios = { ...(c.ios || {}), appendUserAgent: "NeyuApp/1" + (freeAppleId ? "" : " NeyuPush/1") };
      return JSON.stringify(c, null, 2) + "\n";
    });
  }
}

// ── iOS ─────────────────────────────────────────────────────────────────────
if (fs.existsSync(p("ios/App/App/Info.plist"))) {
  const plistKeys = {
    NSFaceIDUsageDescription: "<string>NEYU uses Face ID to unlock My Health Space, so only you can see your health information.</string>",
    NSCameraUsageDescription: "<string>NEYU uses the camera to scan your health reports and photograph your meals.</string>",
    NSPhotoLibraryUsageDescription: "<string>NEYU lets you add health reports and meal photos from your library.</string>",
    NSHealthShareUsageDescription: "<string>NEYU reads your steps, sleep, heart rate, heart rate variability, blood oxygen, weight, blood pressure and blood glucose from Apple Health to show your trends in My Health Space. You choose what to share.</string>",
    NSHealthUpdateUsageDescription: "<string>NEYU does not write to Apple Health. This permission is never requested.</string>",
    ITSAppUsesNonExemptEncryption: "<false/>",
    UIBackgroundModes: "<array>\n\t\t<string>remote-notification</string>\n\t</array>",
    CFBundleURLTypes: `<array>\n\t\t<dict>\n\t\t\t<key>CFBundleURLName</key>\n\t\t\t<string>${SCHEME}</string>\n\t\t\t<key>CFBundleURLSchemes</key>\n\t\t\t<array>\n\t\t\t\t<string>${SCHEME}</string>\n\t\t\t</array>\n\t\t</dict>\n\t</array>`,
  };
  edit(p("ios/App/App/Info.plist"), (s) => {
    for (const [k, v] of Object.entries(plistKeys)) if (!s.includes(`<key>${k}</key>`)) s = s.replace(/<\/dict>\s*<\/plist>\s*$/, `\t<key>${k}</key>\n\t${v}\n</dict>\n</plist>\n`);
    return s.replace("<string>armv7</string>", "<string>arm64</string>");
  });

  // Entitlements: push (not available with a free Apple ID) and Apple Health.
  const ent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
${freeAppleId ? "" : "\t<key>aps-environment</key>\n\t<string>development</string>\n"}\t<key>com.apple.developer.healthkit</key>
\t<true/>
\t<key>com.apple.developer.healthkit.access</key>
\t<array/>
</dict>
</plist>
`;
  const entFile = p("ios/App/App/App.entitlements");
  if (!fs.existsSync(entFile) || fs.readFileSync(entFile, "utf8") !== ent) { fs.writeFileSync(entFile, ent); changed.push("ios/App/App/App.entitlements"); }

  edit(p("ios/App/App.xcodeproj/project.pbxproj"), (s) => s.includes("CODE_SIGN_ENTITLEMENTS") ? s
    : s.replace(/(\t+)(PRODUCT_BUNDLE_IDENTIFIER = com\.neyuhealth\.app;)/g, "$1CODE_SIGN_ENTITLEMENTS = App/App.entitlements;\n$1$2"));

  // Hand the push token to Capacitor (required for push notifications on iPhone).
  edit(p("ios/App/App/AppDelegate.swift"), (s) => s.includes("capacitorDidRegisterForRemoteNotifications") ? s
    : s.replace(/\n}\s*$/, `

    // Push notifications: pass the device token (or the error) to Capacitor.
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }
}
`));
}

console.log(changed.length ? `NEYU native settings applied:\n  ${changed.join("\n  ")}` : "NEYU native settings already up to date.");
