"use client";
// Face ID / Touch ID / fingerprint lock for the NEYU app. When on, the app asks for it when
// opened and after more than 2 minutes in the background. The phone's own passcode works too.
import { plugin, prefs, platform } from "./bridge";

const KEY = "neyu.lock";
export const LOCK_AFTER_MS = 2 * 60_000;

/** "Face ID", "Touch ID", "Fingerprint" … or null when the phone has nothing set up. */
export async function biometryLabel(): Promise<string | null> {
  const b = await plugin("BiometricAuthNative");
  if (!b) return null;
  try {
    const r = await b.checkBiometry();
    if (!r?.isAvailable && !r?.deviceIsSecure) return null;
    // BiometryType: 1 touchId, 2 faceId, 3 fingerprint, 4 faceAuthentication, 5 irisAuthentication
    return ({ 1: "Touch ID", 2: "Face ID", 3: "Fingerprint", 4: "Face unlock", 5: "Iris unlock" } as Record<number, string>)[r.biometryType]
      || (platform() === "ios" ? "Passcode" : "Screen lock");
  } catch { return null; }
}

export const lockEnabled = async () => (await prefs.get<boolean>(KEY)) === true;
export const setLockEnabled = (on: boolean) => prefs.set(KEY, on);

/** Shows the phone's own Face ID / fingerprint prompt. True = unlocked. */
export async function unlock(reason = "Unlock NEYU"): Promise<boolean> {
  const b = await plugin("BiometricAuthNative");
  if (!b) return true; // older app without the lock feature: never lock the patient out
  try {
    await b.internalAuthenticate({ reason, cancelTitle: "Cancel", allowDeviceCredential: true, iosFallbackTitle: "Use passcode", androidTitle: "Unlock NEYU", androidSubtitle: "Your health information is protected", androidConfirmationRequired: false });
    return true;
  } catch { return false; }
}
