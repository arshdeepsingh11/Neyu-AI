import type { ProviderId } from "./types";
import type { MetricKey } from "./metrics";

// Every health source My Health Space knows about, and how it connects.
//   shortcut — Apple Health on iPhone sends a daily summary through a private
//              Shortcut + sync token (no app needed).
//   oauth    — one-time sign-in with the maker (Withings, Oura, WHOOP); NEYU
//              then pulls new data every day. Live only when the clinic has
//              set that maker's client id/secret on the server.
//   app      — only from the NEYU phone app (Android Health Connect). On the website the
//              card offers "Notify me" until the app is in Google Play.
//   waitlist — not open yet (maker's program closed or our app not ready);
//              patients can ask to be told when it opens.
// In the NEYU iPhone app, iPhone and Apple Watch connect straight to Apple Health (no Shortcut).
// The guide text is shown in the Connect sheet before anything happens.

export type ConnectMode = "shortcut" | "oauth" | "app" | "waitlist";
export interface DeviceGuide { needs: string; steps: string[]; meanwhile?: string; note?: string; appSoon?: string }
export interface CatalogDevice {
  id: ProviderId; name: string; icon: string; blurb: string; mode: ConnectMode; beta?: boolean;
  signals: { label: string; metrics: MetricKey[] }[];
  guide: DeviceGuide;
}

const SLEEP: MetricKey[] = ["sleep", "bedtime", "timeInBed", "sleepVar"];
const ACTIVITY: MetricKey[] = ["steps", "active", "workouts", "activeEnergy", "distance"];

export const DEVICE_CATALOG: CatalogDevice[] = [
  { id: "iphone", name: "iPhone (Apple Health)", icon: "ph ph-device-mobile", mode: "shortcut",
    blurb: "No watch needed. Your iPhone already counts steps, distance and workouts, and keeps sleep and readings you add to the Health app.",
    signals: [
      { label: "Activity", metrics: ACTIVITY },
      { label: "Sleep", metrics: SLEEP },
      { label: "Heart rate", metrics: ["rhr", "spo2"] },
      { label: "HRV", metrics: ["hrv"] },
      { label: "Blood pressure", metrics: ["bp"] },
      { label: "Weight", metrics: ["weight"] },
      { label: "Blood glucose", metrics: ["glucose"] },
    ],
    guide: {
      needs: "An iPhone with the Health and Shortcuts apps (built in).",
      steps: [
        "Tap Connect, then Connect with a QR code.",
        "Scan the code with your iPhone camera and open the link.",
        "On your phone: copy your sync link, add the NEYU Sync shortcut, and tap Allow for Health.",
        "Turn on the daily 9 PM automation. This card turns Connected when the first data arrives.",
      ],
      note: "Sleep appears if you use Sleep Schedule or a sleep app that writes to Health. Heart rate variability and blood oxygen need an Apple Watch. In the NEYU iPhone app, Connect reads Apple Health directly — no Shortcut needed.",
    } },
  { id: "apple", name: "Apple Watch", icon: "ph ph-watch", mode: "shortcut",
    blurb: "Heart, recovery, sleep and activity from your watch, sent through Apple Health on your iPhone.",
    signals: [
      { label: "Heart rate", metrics: ["rhr", "spo2", "bp"] },
      { label: "HRV", metrics: ["hrv"] },
      { label: "Sleep", metrics: SLEEP },
      { label: "Activity", metrics: ACTIVITY },
      { label: "ECG where supported", metrics: ["ecg"] },
    ],
    guide: {
      needs: "Apple Watch paired with your iPhone, plus the Shortcuts app.",
      steps: [
        "Tap Connect, then Connect with a QR code.",
        "Scan the code with your iPhone camera and open the link.",
        "On your phone: copy your sync link, add the NEYU Sync shortcut, and tap Allow for Health.",
        "Turn on the daily 9 PM automation. This card turns Connected when the first data arrives.",
      ],
    } },
  { id: "withings", name: "Withings", icon: "ph ph-heartbeat", mode: "oauth",
    blurb: "Home blood pressure monitors (BPM) and smart scales. The easiest way to track home BP.",
    signals: [{ label: "Blood pressure", metrics: ["bp"] }, { label: "Weight", metrics: ["weight"] }],
    guide: {
      needs: "A Withings account with your blood pressure monitor or scale set up in the Withings app.",
      steps: ["Tap Connect with Withings.", "Sign in to Withings and allow NEYU Health to read your measurements.", "You come back here automatically. NEYU pulls your new readings every morning — nothing else to do."],
      meanwhile: "Any home BP monitor works: add readings in Heart → Add reading.",
    } },
  { id: "oura", name: "Oura", icon: "ph ph-circle", mode: "oauth",
    blurb: "Sleep, readiness, HRV and resting heart rate from your ring.",
    signals: [{ label: "Sleep", metrics: SLEEP }, { label: "HRV", metrics: ["hrv"] }, { label: "Resting heart rate", metrics: ["rhr"] }, { label: "Activity", metrics: ["steps", "active", "activeEnergy"] }, { label: "Blood oxygen", metrics: ["spo2"] }],
    guide: {
      needs: "An Oura account (the Oura app on your phone).",
      steps: ["Tap Connect with Oura.", "Sign in to Oura and allow NEYU Health.", "You come back here automatically. NEYU pulls last night's data every morning."],
      meanwhile: "On iPhone, Oura can write to Apple Health (Oura app → Settings → Apple Health). Then connect iPhone here.",
    } },
  { id: "whoop", name: "WHOOP", icon: "ph ph-waveform", mode: "oauth", beta: true,
    blurb: "Recovery, HRV, resting heart rate and sleep.",
    signals: [{ label: "Recovery", metrics: ["hrv", "rhr"] }, { label: "Sleep", metrics: SLEEP }, { label: "Blood oxygen", metrics: ["spo2"] }],
    guide: {
      needs: "A WHOOP membership and the WHOOP app.",
      steps: ["Tap Connect with WHOOP.", "Sign in to WHOOP and allow NEYU Health.", "You come back here automatically. NEYU pulls each new recovery and sleep every morning."],
      meanwhile: "On iPhone, WHOOP can write to Apple Health (WHOOP app → Integrations). Then connect iPhone here.",
    } },
  { id: "garmin", name: "Garmin", icon: "ph ph-compass", mode: "waitlist",
    blurb: "Heart rate, activity, sleep and training.",
    signals: [{ label: "Heart rate", metrics: ["rhr"] }, { label: "Activity", metrics: ACTIVITY }, { label: "Sleep", metrics: SLEEP }],
    guide: {
      needs: "A Garmin Connect account.",
      steps: ["Garmin's partner program isn't taking new companies right now. Tap Notify me and we'll tell you the day it opens."],
      meanwhile: "On iPhone: Garmin Connect app → More → Settings → Connected Apps → Apple Health, turn on. Then connect iPhone here — your Garmin steps, sleep and heart data come through.",
    } },
  { id: "fitbit", name: "Fitbit / Pixel Watch", icon: "ph ph-person-simple-run", mode: "waitlist",
    blurb: "Activity, sleep and heart rate.",
    signals: [{ label: "Activity", metrics: ["steps", "active", "activeEnergy"] }, { label: "Heart rate", metrics: ["rhr", "hrv"] }, { label: "Sleep", metrics: SLEEP }],
    guide: {
      needs: "A Google account with Fitbit.",
      steps: ["Fitbit is moving to Google's new Health API. We're completing Google's review. Tap Notify me and we'll tell you when it's ready."],
      meanwhile: "Import a CSV export from your Fitbit account, or enter readings yourself.",
    } },
  { id: "android", name: "Android (Health Connect)", icon: "ph ph-android-logo", mode: "app",
    blurb: "Samsung Health, Google and other Android apps through Health Connect.",
    signals: [{ label: "Activity", metrics: ACTIVITY }, { label: "Heart rate", metrics: ["rhr", "hrv", "spo2"] }, { label: "Sleep", metrics: SLEEP }, { label: "Blood pressure", metrics: ["bp"] }, { label: "Weight", metrics: ["weight"] }, { label: "Blood glucose", metrics: ["glucose"] }],
    guide: {
      needs: "An Android phone with Health Connect (built into Android 14 and later; from Google Play on Android 8–13) and the NEYU app.",
      steps: [
        "Open My Health Space in the NEYU Android app → Devices → Android → Connect.",
        "Health Connect asks which data NEYU may read. Choose what to share and tap Allow.",
        "NEYU reads the last 30 days, then new days each time you open the app.",
      ],
      appSoon: "Health Connect only works from an app on the phone. The NEYU Android app is coming to Google Play — tap Notify me and we'll tell you when it's ready.",
      meanwhile: "Import a CSV file or enter readings yourself.",
    } },
];

export const PROVIDER_NAMES: Record<string, string> = Object.fromEntries(DEVICE_CATALOG.map((d) => [d.id, d.name]));
PROVIDER_NAMES.apple = "Apple Watch";
PROVIDER_NAMES.gfit = "Google Fit";
PROVIDER_NAMES.clinic = "NEYU clinic";
PROVIDER_NAMES.manual = "Entered by you";
PROVIDER_NAMES.import = "Imported file";

/** Sources that count as "wearables" for the Privacy & Data switch. */
export const WEARABLE_SOURCES = ["apple", "iphone", "withings", "oura", "whoop", "garmin", "fitbit", "android", "gfit"];

/** Metrics a device may write, given the signal labels the patient allows. */
export function allowedMetrics(provider: ProviderId, dataTypes: string[]): Set<MetricKey> {
  const dev = DEVICE_CATALOG.find((d) => d.id === provider);
  const out = new Set<MetricKey>();
  dev?.signals.forEach((s) => { if (dataTypes.includes(s.label)) s.metrics.forEach((m) => out.add(m)); });
  // Older rows stored metric keys ("rhr", "sleep") instead of signal labels.
  dataTypes.forEach((k) => { if (dev?.signals.some((s) => s.metrics.includes(k as MetricKey))) out.add(k as MetricKey); });
  return out;
}

/** Signal labels shared, accepting labels or (older rows) metric keys. */
export function sharedLabels(provider: ProviderId, dataTypes: string[]): string[] {
  const dev = DEVICE_CATALOG.find((d) => d.id === provider);
  return (dev?.signals || []).filter((s) => dataTypes.includes(s.label) || s.metrics.some((m) => dataTypes.includes(m))).map((s) => s.label);
}
