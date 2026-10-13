"use client";

// "Your PDF is ready" — shown on iPhone / in the app after a file is built, so
// the save happens on a fresh tap (iOS only opens the share sheet from a tap).
import React from "react";
import { shareOrOpen } from "@/lib/saveFile";
import { NIcon } from "@/components/neyu/icons";

export default function FileReady({ file, onClose }: { file: { blob: Blob; name: string } | null; onClose: () => void }) {
  if (!file) return null;
  const go = async () => { await shareOrOpen(file.blob, file.name); onClose(); };
  return (
    <div className="anra-chrome">
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(20,24,27,.38)" }} />
      <div role="dialog" aria-modal="true" aria-label="Your PDF is ready" style={{ position: "fixed", zIndex: 91, left: 12, right: 12, bottom: "calc(12px + env(safe-area-inset-bottom))", maxWidth: 460, margin: "0 auto", background: "#FBFAF7", borderRadius: 22, padding: 20, boxShadow: "0 30px 70px -20px rgba(20,24,27,.5)", display: "grid", gap: 12, animation: "fadeUp .25s ease" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,#E9F6F1,#E7F0FB)", display: "grid", placeItems: "center", flex: "none" }}><NIcon name="ph-file-text" size={22} tone="grad" /></span>
          <div style={{ minWidth: 0 }}><b style={{ fontWeight: 600, fontSize: 17, color: "#14181B" }}>Your PDF is ready</b><div style={{ fontSize: 13, color: "#5A626A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div></div>
        </div>
        <button onClick={go} style={{ height: 50, border: 0, borderRadius: 999, background: "linear-gradient(120deg,#2FBF94,#1FA7B4 45%,#2273D6)", color: "#fff", fontSize: 16, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}><NIcon name="ph-export" size={18} tone="light" />Save or share PDF</button>
        <button onClick={onClose} style={{ height: 44, border: "1px solid #E3DED5", borderRadius: 999, background: "#fff", color: "#14181B", fontSize: 15, cursor: "pointer" }}>Close</button>
        <p style={{ margin: 0, fontSize: 12.5, color: "#5A626A", textAlign: "center" }}>Choose “Save to Files” to keep it, or Print / Mail to send it.</p>
      </div>
    </div>
  );
}
