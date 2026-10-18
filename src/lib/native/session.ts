"use client";
// Run before signing out in the NEYU app: stop notifications to this phone and forget this
// phone's health sync link (the next person who signs in here must connect their own).
import { isNative } from "./bridge";
import { disablePush } from "./push";
import { disconnectNativeHealth } from "./health";

export async function nativeBeforeSignOut() {
  if (!isNative()) return;
  await Promise.race([Promise.all([disablePush(), disconnectNativeHealth()]), new Promise((r) => setTimeout(r, 4000))]).catch(() => {});
}
