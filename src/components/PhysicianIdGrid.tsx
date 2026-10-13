"use client";

// Physicians as hanging ID cards, in a grid that works on every screen.
// Phones get a shorter lanyard so the list stays compact.
import React from "react";
import type { Physician } from "@/data/physicians";
import PhysicianIdCard from "@/components/PhysicianIdCard";
import { useIsMobile } from "@/lib/useViewport";

export default function PhysicianIdGrid({ list, onOpen }: { list: Physician[]; onOpen: (p: Physician) => void }) {
  const mobile = useIsMobile();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,264px),1fr))", gap: mobile ? "4px 16px" : "12px 20px", justifyItems: "center", marginTop: 4 }}>
      {list.map((p, i) => <PhysicianIdCard key={p.slug} p={p} index={i} strap={mobile ? 44 : 96} onOpen={() => onOpen(p)} />)}
    </div>
  );
}
