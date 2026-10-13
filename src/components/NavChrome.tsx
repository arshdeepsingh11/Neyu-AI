"use client";

import React, { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import NavRail from "@/components/NavRail";
import MobileNav from "@/components/MobileNav";
import SearchOverlay from "@/components/SearchOverlay";
import AccountButton from "@/components/AccountButton";
import BackButton from "@/components/BackButton";
import { useIsMobile } from "@/lib/useViewport";
import NeyuLogo from "@/components/brand/NeyuLogo";

// Universal navigation for every public page: desktop rail (≥860px) or
// mobile tab bar (<860px), the shared search overlay, the back button
// (top-left) and the account button (top-right). Admin is excluded.
export default function NavChrome() {
  const pathname = usePathname();
  const mobile = useIsMobile();
  const [search, setSearch] = useState(false);
  const openSearch = useCallback(() => setSearch(true), []);
  const closeSearch = useCallback(() => setSearch(false), []);

  // Phones: the floating Back / Sign-in pills slide away while scrolling down
  // (so they never cover headings) and return on scroll up or near the top.
  useEffect(() => {
    const root = document.documentElement;
    let last = window.scrollY, ticking = false;
    const run = () => {
      ticking = false;
      const y = window.scrollY, hide = y > 90 && y > last + 4, show = y < 90 || y < last - 4;
      if (hide) root.dataset.chrome = "hidden"; else if (show) root.dataset.chrome = "shown";
      last = y;
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); delete root.dataset.chrome; };
  }, []);

  // Phones get a real top bar (and the page is pushed below it) instead of
  // floating pills that sat on top of headings.
  const bar = mobile && !pathname?.startsWith("/admin");
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("neyu-topbar", bar);
    return () => root.classList.remove("neyu-topbar");
  }, [bar]);

  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      {mobile ? <MobileNav onSearch={openSearch} /> : <NavRail onSearch={openSearch} />}
      {mobile ? (
        <header className="anra-chrome neyu-topbar-el" style={{ position: "fixed", zIndex: 60, top: 0, left: 0, right: 0, height: "calc(var(--neyu-topbar) + env(safe-area-inset-top))", paddingTop: "env(safe-area-inset-top)", paddingLeft: 10, paddingRight: 10, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8, background: "rgba(247,246,242,.94)", backdropFilter: "blur(16px) saturate(1.3)", WebkitBackdropFilter: "blur(16px) saturate(1.3)", borderBottom: "1px solid rgba(14,27,44,.07)", boxSizing: "border-box" }}>
          <div style={{ justifySelf: "start", minWidth: 0 }}><BackButton mobile inline /></div>
          <a href="/" aria-label="NEYU Health home" style={{ display: "grid", placeItems: "center", opacity: pathname === "/" ? 0 : 1, pointerEvents: pathname === "/" ? "none" : undefined }}><NeyuLogo height={22} /></a>
          <div style={{ justifySelf: "end", minWidth: 0 }}><AccountButton mobile inline /></div>
        </header>
      ) : (
        <>
          <BackButton mobile={false} />
          <AccountButton mobile={false} />
        </>
      )}
      <SearchOverlay open={search} onClose={closeSearch} />
    </>
  );
}
