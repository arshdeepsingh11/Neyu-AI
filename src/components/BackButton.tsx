"use client";

// Site-wide back button (top-left on every page except the homepage).
// Walks back through the pages visited on this site, one at a time; when
// there is nothing left (e.g. the visitor arrived straight from Google), it
// goes to the homepage. The in-site trail survives reloads (sessionStorage).

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NIcon } from "@/components/neyu/icons";

const KEY = "anra_trail";
const read = (): string[] => { try { return JSON.parse(sessionStorage.getItem(KEY) || "[]"); } catch { return []; } };
const write = (t: string[]) => { try { sessionStorage.setItem(KEY, JSON.stringify(t.slice(-30))); } catch {} };

export default function BackButton({ mobile, inline }: { mobile: boolean; inline?: boolean }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [hasTrail, setHasTrail] = useState(false);

  // Keep the trail in step with navigation (forward = push, back = pop).
  useEffect(() => {
    const t = read();
    if (t[t.length - 1] === pathname) { /* reload */ }
    else if (t[t.length - 2] === pathname) t.pop();
    else t.push(pathname);
    write(t);
    setHasTrail(t.length > 1);
  }, [pathname]);

  if (pathname === "/") return null;

  const goBack = () => {
    if (hasTrail) router.back();
    else router.push("/");
  };
  const label = hasTrail ? "Back" : "Home";

  return (
    <button
      onClick={goBack}
      aria-label={hasTrail ? "Go back to the previous page" : "Go to the homepage"}
      className={inline ? "hv-sand" : "anra-chrome hv-sand anra-float"}
      style={{
        ...(inline ? { position: "relative" } : { position: "fixed", zIndex: 60, top: mobile ? "calc(10px + env(safe-area-inset-top))" : 18, left: mobile ? 10 : 18 }),
        height: mobile ? 40 : 44, display: "flex", alignItems: "center", gap: 7,
        padding: mobile ? "0 14px 0 10px" : "0 16px 0 12px", borderRadius: 999,
        background: "rgba(253,252,250,.86)", backdropFilter: "blur(16px) saturate(1.3)", WebkitBackdropFilter: "blur(16px) saturate(1.3)",
        border: "1px solid rgba(227,222,213,.95)", boxShadow: "0 24px 50px -28px rgba(20,24,27,.4)",
        color: "#14181B", fontSize: 14, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
      }}
    >
      <NIcon name={hasTrail ? "ph-arrow-left" : "ph-house"} size={18} tone={"#3F6F7C"} />
      {label}
    </button>
  );
}
