"use client";

// Site-wide account entry (top-right, above the nav rail on desktop).
// Signed out → "Sign in"; signed in → photo / initials + "My Health".
// Reads /api/portal/session once, and again when the portal announces a
// change (sign-in, sign-out, new photo) via the "anra:session" event.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNativeApp, getAppHome } from "@/lib/appMode";
import { NIcon } from "@/components/neyu/icons";

type Session = { signedIn: false } | { signedIn: true; verified: boolean; firstName: string; initials: string; photoUrl: string | null };

export default function AccountButton({ mobile, inline }: { mobile: boolean; inline?: boolean }) {
  const pos = (m: boolean): React.CSSProperties => (inline ? { position: "relative" } : { position: "fixed", zIndex: 60, top: m ? "calc(10px + env(safe-area-inset-top))" : 18, right: m ? 10 : 18 });
  const cls = inline ? "hv-sand" : "anra-chrome hv-sand anra-float";
  const [s, setS] = useState<Session | null>(null);
  const path = usePathname() || "";
  // In the mobile app with "My Health Space" as home, the top-right button inside
  // My Health Space becomes "NEYU" (the website) — the reverse of the website.
  const [appMH, setAppMH] = useState(false);
  useEffect(() => {
    const upd = () => setAppMH(isNativeApp() && getAppHome() === "myhealth");
    upd(); window.addEventListener("neyu:apphome", upd);
    return () => window.removeEventListener("neyu:apphome", upd);
  }, []);

  useEffect(() => {
    let alive = true;
    const load = () => fetch("/api/portal/session", { credentials: "same-origin", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { signedIn: false }))
      .then((j) => { if (alive) setS(j); })
      .catch(() => { if (alive) setS({ signedIn: false }); });
    load();
    window.addEventListener("anra:session", load);
    return () => { alive = false; window.removeEventListener("anra:session", load); };
  }, []);

  const signedIn = s?.signedIn === true;
  if (appMH && path.startsWith("/my-health")) {
    const sz = mobile ? 40 : 44;
    return (
      <Link href="/" prefetch={false} aria-label="Open the NEYU website" className={cls}
        style={{ ...pos(mobile), height: sz, display: "flex", alignItems: "center", gap: 8, padding: "0 16px 0 12px", borderRadius: 999, background: "rgba(253,252,250,.86)", backdropFilter: "blur(16px) saturate(1.3)", WebkitBackdropFilter: "blur(16px) saturate(1.3)", border: "1px solid rgba(227,222,213,.95)", boxShadow: "0 24px 50px -28px rgba(20,24,27,.4)", color: "#14181B", fontSize: 14, fontWeight: 500, textDecoration: "none", whiteSpace: "nowrap" }}>
        <NIcon name="home" size={18} tone={"#1B8FD0"} />NEYU
      </Link>
    );
  }
  const href = s?.signedIn ? (s.verified ? "/my-health" : "/my-health/verify") : "/my-health/sign-in";
  const size = mobile ? 40 : 44;

  return (
    <Link
      href={href}
      prefetch={false}
      aria-label={signedIn ? "Open My Health Space" : "Sign in to My Health Space"}
      className={cls}
      style={{
        ...pos(mobile),
        height: size, display: "flex", alignItems: "center", gap: 8,
        padding: signedIn ? "0 14px 0 5px" : "0 16px 0 12px", borderRadius: 999,
        background: "rgba(253,252,250,.86)", backdropFilter: "blur(16px) saturate(1.3)", WebkitBackdropFilter: "blur(16px) saturate(1.3)",
        border: "1px solid rgba(227,222,213,.95)", boxShadow: "0 24px 50px -28px rgba(20,24,27,.4)",
        color: "#14181B", fontSize: 14, fontWeight: 500, textDecoration: "none", whiteSpace: "nowrap",
        opacity: s ? 1 : 0, transition: "opacity .3s",
      }}
    >
      {signedIn ? (
        <>
          <span style={{ width: size - 10, height: size - 10, borderRadius: "50%", background: "#DCE9EC", color: "#2F5A66", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 500, overflow: "hidden", flex: "none" }}>
            {s.photoUrl ? <img src={s.photoUrl} alt="" width={size - 10} height={size - 10} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : s.initials}
          </span>
          My Health
        </>
      ) : (
        <>
          <NIcon name="ph-user-circle" size={20} tone={"#3F6F7C"} />
          Sign in
        </>
      )}
    </Link>
  );
}
