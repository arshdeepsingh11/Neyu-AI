# NEYU mobile app (Android + iPhone)

A native app (Capacitor 8) that opens the NEYU website and adds phone features.
Website updates appear in the app automatically — no new app build needed for them.

App id `com.neyuhealth.app` · Name `NEYU` · Opens `<server>/app-start` ("Where should NEYU open?").

| Phone feature | How it works |
|---|---|
| Apple Health (iPhone) / Health Connect (Android) | Devices → iPhone or Android → Connect. Read only. Last 30 days, then new days each time the app opens (max once an hour). |
| Push notifications | Account → Notifications → "Notifications on this phone". Daily summary, visit and retest reminders. Never health details. |
| Face ID / Touch ID / fingerprint lock | Account → Profile → "Lock with Face ID". Asks on open and after 2 minutes away. |
| Share sheet | PDFs, data exports and documents open the phone's share sheet (Save to Files, Print, Mail…). |
| Camera | Scanning reports and food photos (asks permission the first time). |
| Withings / Oura / WHOOP | Sign-in opens in the phone's browser and comes back to the app by itself. |
| Offline | "You're offline" banner; a retry page if the app opens without internet. |

> **Important:** these features need the Phase 6 website on the server the app opens.
> The live site (`japanese-style` branch) is still the old version until Phase 9.
> Until then, test with your PC (step F) or a staging server.

---

## A. Once on your PC

1. **Node.js 22 or newer** (Capacitor 8 needs it): https://nodejs.org → LTS. Check: `node -v`.
2. In PowerShell:
   ```powershell
   cd nextjs\mobile
   npm install
   npm run check
   ```
   `npm run check` lists what is ready and what is missing.

## B. Cloud builds (no Android Studio or Mac needed)

The app is built by GitHub on its own computers (`.github/workflows/mobile-*.yml`).

- Every push to the `test` branch that changes `mobile/` builds both apps.
- Or by hand: GitHub → **Actions** → **Mobile · Android** (or **Mobile · iPhone**) → **Run workflow**.
  In "Server" type `live`, or your staging address (`https://staging.neyuhealth.com`).
- **Android result:** open the finished run → **Artifacts** → `neyu-android` → unzip → `app-debug.apk`.
  Send it to Android phones (WhatsApp / email / Drive) → open → allow "Install unknown apps" → Install.
- **iPhone result:** the run proves the app builds. To install on iPhones you need TestFlight (step E).

## C. Android push notifications (Firebase, free)

1. https://console.firebase.google.com → **Add project** → name `NEYU` (Google Analytics: off).
2. **Add app → Android** → package name `com.neyuhealth.app` → Register → **Download google-services.json**.
3. For your own builds: put it in `mobile/firebase/google-services.json` (never committed), then `npm run sync`.
4. For cloud builds: GitHub → repo **Settings → Secrets and variables → Actions → New repository secret**
   → name `GOOGLE_SERVICES_JSON` → paste the whole file.
5. Server key: Firebase → **Project settings → Service accounts → Generate new private key**.
   Put the JSON in the server's `.env` as `FIREBASE_SERVICE_ACCOUNT=` (one line, or `base64 -w0 key.json`).
   Never commit this file and never send it by chat or email.

Without the Firebase file the Android app still works — it just doesn't offer notifications.

## D. Android for Google Play (later)

1. Google Play Console account ($25 once): https://play.google.com/console
   - **Personal account:** Google requires a closed test with **12 testers for 14 days** before the first public release.
   - **Organization account** (needs a free D-U-N-S number for the clinic): no 12-tester rule.
2. Create an upload key once (keep it safe — losing it means contacting Google):
   ```powershell
   keytool -genkey -v -keystore neyu-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias neyu
   ```
3. GitHub secrets: `ANDROID_KEYSTORE_BASE64` (`[Convert]::ToBase64String([IO.File]::ReadAllBytes("neyu-upload.jks"))`),
   `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`neyu`), `ANDROID_KEY_PASSWORD`.
   The next cloud build also makes `app-release.aab` → upload it in Play Console.
4. Play Console forms: **Data safety**, **Health apps declaration** and the **Health Connect permissions** form
   (explain each data type NEYU reads; the privacy link is `https://neyuhealth.com/app-privacy`).

## E. iPhone — TestFlight and App Store (needs Apple Developer, $99/year)

1. Enroll: https://developer.apple.com/programs (as an organization: needs the D-U-N-S number).
2. **Identifiers → +** → App ID `com.neyuhealth.app` → turn on **HealthKit** and **Push Notifications**.
3. **Keys → +** → **Apple Push Notifications service (APNs)** → download the `.p8` (only once!).
   Server `.env`: `APNS_KEY` (`base64 -w0 AuthKey_XXXX.p8`), `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_ENV=production`.
4. https://appstoreconnect.apple.com → **Apps → +** → bundle id `com.neyuhealth.app`, name NEYU Health.
5. App Store Connect → **Users and Access → Integrations → Team Keys → +** (role App Manager) → download the `.p8`.
   GitHub secrets: `APPLE_TEAM_ID`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`,
   `APP_STORE_CONNECT_KEY` (the .p8 text).
6. GitHub → Actions → **Mobile · iPhone** → Run workflow → tick **Upload to TestFlight**.
   10–30 min later: App Store Connect → TestFlight → add testers (up to 100 internal, no review).
7. Before the App Store: App Privacy answers, screenshots, and the privacy policy (Phase 8).
   Apple rejects apps that are "just a website" (guideline 4.2) — Apple Health, push, Face ID and the
   share sheet are the native features that answer this; mention them in the review notes.

**Free Apple ID (no $99, on a Mac, 7-day test on your own iPhone):**
`npm run native -- --free-apple-id` (removes push, which free accounts can't sign) → `npm run ios` →
Xcode → App → Signing & Capabilities → Team = your Apple ID → plug in the iPhone → ▶ Run.

## F. Which server the app opens

```powershell
npm run target -- live                                   # https://neyuhealth.com (store builds)
npm run target -- staging https://staging.neyuhealth.com
npm run target -- pc 192.168.1.50                        # your PC on the same Wi-Fi (ipconfig → IPv4)
npm run sync
```
`pc` uses plain http — test builds only. Switch back to `live` before sharing a build.
Cloud builds choose the server in the "Server" box instead.

## G. Building on your own computer (optional)

- **Android:** install Android Studio → `npm run sync` → `npm run android` → wait for Gradle → ▶ Run (phone with USB debugging) or Build → Build APK(s).
- **iPhone (Mac + Xcode 26):** `npm run sync` → `npm run ios` → Signing & Capabilities → Team → ▶ Run.

`npm run sync` = `npx cap sync` + `scripts/native-setup.mjs` (permissions, Face ID / Apple Health texts,
push and Health entitlements, app links). Run it after every `npm install` or plugin change.

## Files

| Path | What |
|---|---|
| `scripts/target.mjs` | writes `capacitor.config.json` for live / staging / PC |
| `scripts/native-setup.mjs` | applies NEYU's native settings to `android/` and `ios/` (safe to re-run) |
| `scripts/check.mjs` | `npm run check` — readiness list |
| `www/` | first screen + offline page (the real app is the website) |
| `resources/` | icon and splash source → `npm run icons` |
| `firebase/` | your `google-services.json` (not committed) |
| website `src/lib/native/` | the website's side: phone features (push, lock, health, files) |
| website `src/components/NativeShell.tsx` | lock screen, notification taps, app links, downloads, offline banner |
