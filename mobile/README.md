# NEYU mobile app (Android + iPhone)

The app is a native shell (Capacitor) around **neyuhealth.com**. Website updates appear in the app
automatically — no new app build needed. On first open it asks **"Where should NEYU open?"**
(My Health Space or the website). In My Health Space the top-right button becomes **NEYU** (website).

App id: `com.neyuhealth.app` · Name: `NEYU`

---

## A. Android — test APK on Windows (same day)

**Install once**
1. Android Studio: https://developer.android.com/studio (default options; it installs the Android SDK and Java).
2. Node.js 20+ (you already have it).

**Build**
```powershell
cd nextjs\mobile
npm install
npx cap add android
npm run icons
npx cap sync android
npx cap open android
```
3. Android Studio opens. Wait until "Gradle sync" finishes (bottom bar, first time 5–10 min).
4. Add camera permission (for scanning reports / food photos): open `app/manifests/AndroidManifest.xml` and add above `<application`:
   ```xml
   <uses-permission android:name="android.permission.CAMERA" />
   ```
5. Menu **Build → Build App Bundle(s) / APK(s) → Build APK(s)**.
6. Click **locate** in the popup → file `app-debug.apk`.

**Install on phones**
- Send `app-debug.apk` by WhatsApp / email / Google Drive → open it on the Android phone → allow "Install unknown apps" → Install.
- Or plug the phone in (USB debugging on) and press the green ▶ Run button in Android Studio.

---

## B. iPhone — on the Mac

**Install once**
1. Xcode from the Mac App Store.
2. Node.js 20+: https://nodejs.org
3. CocoaPods: `sudo gem install cocoapods` (or `brew install cocoapods`).

**Build**
```bash
cd nextjs/mobile
npm install
npx cap add ios
npm run icons
npx cap sync ios
npx cap open ios
```
4. In Xcode: click **App** (left) → **Signing & Capabilities** → **Team**: sign in with your Apple ID.
5. Add camera/photo text: **Info** tab → add
   - `Privacy - Camera Usage Description`: *NEYU uses the camera to scan your health reports and food.*
   - `Privacy - Photo Library Usage Description`: *NEYU lets you add reports and food photos from your library.*

**Test on your own iPhone (free Apple ID, app lasts 7 days)**
6. Plug in the iPhone → choose it at the top of Xcode → press ▶ Run.
7. On the iPhone: Settings → General → VPN & Device Management → trust your Apple ID.

**TestFlight for the team (needs Apple Developer account, $99/year)**
8. Xcode → **Product → Archive** → **Distribute App → TestFlight & App Store** → Upload.
9. https://appstoreconnect.apple.com → your app → **TestFlight** → add internal testers (up to 100). They install the TestFlight app and get an invite.

---

## Test against your PC instead of the live site
In `capacitor.config.json` change `server.url` to `http://YOUR-PC-IP:3000/app-start` and `cleartext` to `true`,
run `npx cap sync`, rebuild. Phone and PC must be on the same Wi-Fi. Change it back before sharing the app.

## Coming next (step 4)
- Apple Health (HealthKit) and Health Connect (Android) — native steps, sleep, heart data.
- Doctor Report PDF: native share sheet (downloads inside an app work differently than in a browser).
- Push notifications.
