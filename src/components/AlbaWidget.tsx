"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAlba } from "@/components/AlbaContext";
import AlbaOrb from "@/components/AlbaOrb";
import AlbaIntroVeil from "@/components/AlbaIntroVeil";
import { albaSuggestionsFor } from "@/data/homeContent";
import { useIsMobile } from "@/lib/useViewport";
import { NIcon } from "@/components/neyu/icons";

const VIDEO_SEEN_KEY = "anra_video_seen";

// Page-aware opening line, so Neyu's greeting fits where the visitor is.
function greetingForPath(pathname: string): string {
  if (pathname === "/") return "Tell me what’s on your mind and I’ll help you find the right place to start.";
  if (pathname.startsWith("/specialties/cardiology")) return "Hi, I'm Neyu. I see you're looking at Cardiology — ask me about heart symptoms, our cardiologists, or how to book a consult.";
  if (pathname.startsWith("/specialties/respiratory-medicine")) return "Hi, I'm Neyu. I see you're looking at Respiratory Medicine — ask me about sleep studies, CPAP, or breathing concerns.";
  if (pathname.startsWith("/specialties/skin-health")) return "Hi, I'm Neyu. I see you're looking at Skin Health — ask me about treatments, concerns, or how to book with Nea Precision Skin.";
  if (pathname.startsWith("/referral-centre")) return "Hi, I'm Neyu. Need help with a referral? Ask me about the auto-fill options, urgency levels, or what to bring.";
  if (pathname.startsWith("/longevity")) return "Hi, I'm Neyu. Curious about longevity and preventive health? Ask me anything, or try the Health Risk Assessment above.";
  if (pathname.startsWith("/lab-results")) return "Hi, I'm Neyu. Would you like me to explain this result? I can clarify anything or point you toward booking a consult.";
  if (pathname.startsWith("/genomics")) return "Hi, I'm Neyu. Want help understanding these testing options?";
  if (pathname.startsWith("/explain-diagnosis")) return "Hi, I'm Neyu. Share a term from your report and I’ll explain it in plain language.";
  if (pathname.startsWith("/resources")) return "Hi, I'm Neyu. Looking for test prep, condition info, or forms? Ask me and I'll point you in the right direction.";
  return "Hi, I'm Neyu — NEYU Health's AI companion. Ask me about our services, physicians, locations, or how to book.";
}

const iconBtn: React.CSSProperties = { width: 40, height: 40, border: 0, background: "none", borderRadius: 10, fontSize: 18, display: "grid", placeItems: "center", flex: "none" };

function AlbaPanel({ mobile }: { mobile: boolean }) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const { messages, loading, send, clear, closeAlba, suggestedRoute, speakReplies, setSpeakReplies, speakNow } = useAlba();
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const endRef = useRef<HTMLDivElement>(null);
  // The message box grows with what is typed (one line when empty), so text and
  // the hint are never cut in half.
  const boxRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const t = boxRef.current; if (!t) return; t.style.height = "auto"; t.style.height = Math.min(120, Math.max(44, t.scrollHeight)) + "px"; }, [input]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, loading]);

  // Voice input (Speech Recognition).
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSpeechSupported(false); return; }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e: any) => { setInput(e.results[0][0].transcript); setListening(false); };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
  }, []);

  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) return;
    if (listening) { recognitionRef.current.stop(); setListening(false); }
    else { recognitionRef.current.start(); setListening(true); }
  };

  const toggleVoice = () => {
    const next = !speakReplies;
    setSpeakReplies(next);
    if (next) speakNow("Voice replies on");
    else if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  };

  const submit = (t?: string) => {
    const text = (t ?? input).trim();
    if (!text) return;
    setInput("");
    send(text);
  };

  const suggestions = albaSuggestionsFor(pathname);

  return (
    <>
      <div onClick={closeAlba} style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(20,24,27,.18)" }} />
      <aside
        role="dialog"
        aria-label="Neyu"
        className="anra-chrome"
        style={{ position: "fixed", inset: mobile ? 0 : "12px 12px 12px auto", width: mobile ? "100%" : 440, zIndex: 71, background: "#FBFAF7", borderRadius: mobile ? 0 : 20, boxShadow: "0 40px 80px -30px rgba(20,24,27,.4)", display: "flex", flexDirection: "column", overflow: "hidden", animation: "fadeUp .3s ease", border: "1px solid #D6EEF6" }}
      >
        <div style={{ padding: "18px 18px 16px 20px", display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid #E6F3F8", background: "linear-gradient(180deg,#F3EFF9,#FBFAF7)" }}>
          <AlbaOrb size={40} glow />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, letterSpacing: ".1em", fontWeight: 600 }}>Neyu</div>
            <div style={{ fontSize: 14, color: "#5A626A" }}>Your health companion.</div>
          </div>
          <button onClick={toggleVoice} aria-label={speakReplies ? "Mute Neyu voice replies" : "Unmute Neyu voice replies"} title={speakReplies ? "Voice replies on — tap to mute" : "Voice replies off — tap to unmute"} className="hv-lav" style={iconBtn}>
            <NIcon name={speakReplies ? "ph-speaker-high" : "ph-speaker-slash"} size="1em" tone="currentColor" />
          </button>
          <button onClick={clear} aria-label="New conversation" className="hv-lav" style={iconBtn}><NIcon name="ph-note-pencil" size="1em" tone="currentColor" /></button>
          <button onClick={closeAlba} aria-label="Close Neyu" className="hv-lav" style={iconBtn}><NIcon name="ph-x" size="1em" tone="currentColor" /></button>
        </div>

        <div aria-live="polite" style={{ flex: 1, overflow: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ maxWidth: "92%", fontSize: 17, lineHeight: 1.5, color: "#2A2F33" }}>{greetingForPath(pathname)}</div>
          {messages.length === 0 && (
            <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
              {suggestions.map((s) => (
                <button key={s} onClick={() => submit(s)} className="hv-bdViolet" style={{ textAlign: "left", border: "1px solid #D6EEF6", background: "#FDFCFA", borderRadius: 12, padding: "12px 14px", fontSize: 15, minHeight: 44 }}>{s}</button>
              ))}
            </div>
          )}
          {messages.map((m, i) => {
            if (m.kind === "safety") return (
              <div key={i} role="alert" style={{ padding: 16, borderRadius: 14, background: "#9B2317", color: "#FFF7F5", display: "grid", gap: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 17, display: "flex", gap: 8, alignItems: "center" }}><NIcon name="ph-warning" size={20} tone="currentColor" />Please seek urgent medical care.</div>
                <div style={{ fontSize: 15 }}>What you’ve described may need immediate attention. Call 911 or go to the nearest emergency department. Please don’t wait for an online answer.</div>
                <a href="tel:911" style={{ justifySelf: "start", background: "#FFF7F5", color: "#9B2317", textDecoration: "none", fontWeight: 700, padding: "10px 16px", borderRadius: 10, letterSpacing: ".06em" }}>CALL 911</a>
              </div>
            );
            if (m.kind === "error") return (
              <div key={i} style={{ maxWidth: "92%", fontSize: 15, color: "#3A4147", padding: "12px 14px", borderRadius: 12, background: "#EEF7FA", display: "flex", gap: 10 }}><NIcon name="ph-cloud-slash" size="1em" tone={"#1D5FA8"} style={{marginTop: 3}} />{m.text}</div>
            );
            if (m.role === "user") return (
              <div key={i} style={{ alignSelf: "flex-end", maxWidth: "84%", background: "#14181B", color: "#F7F5F1", padding: "11px 15px", borderRadius: "16px 16px 4px 16px", fontSize: 15, whiteSpace: "pre-wrap" }}>{m.text}</div>
            );
            return <div key={i} style={{ maxWidth: "92%", fontSize: 15.5, lineHeight: 1.55, color: "#2A2F33", whiteSpace: "pre-wrap", paddingLeft: 12, borderLeft: "2px solid #A9D8F0" }}>{m.text}</div>;
          })}
          {loading && <div style={{ display: "flex", gap: 10, alignItems: "center", color: "#5A626A", fontSize: 15 }}><AlbaOrb size={22} />Neyu is reviewing what you’ve shared…</div>}
          {suggestedRoute && !loading && (
            <button onClick={() => { closeAlba(); router.push(suggestedRoute.href); }} style={{ alignSelf: "flex-start", border: 0, background: "none", padding: "4px 0", color: "#1D5FA8", fontWeight: 600, fontSize: 15 }}>{suggestedRoute.label} →</button>
          )}
          <div ref={endRef} />
        </div>

        <div style={{ padding: "12px 14px 14px", borderTop: "1px solid #E6F3F8", paddingBottom: mobile ? "max(14px, env(safe-area-inset-bottom))" : 14 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: "#FDFCFA", border: "1px solid #C3E3F2", borderRadius: 14, padding: "6px 6px 6px 14px" }}>
            <textarea
              ref={boxRef}
              aria-label="Message Neyu"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
              rows={1}
              placeholder={listening ? "Listening…" : mobile ? "Ask Neyu anything…" : "Ask Neyu anything about your health…"}
              className="neyu-msgbox"
              style={{ flex: 1, minWidth: 0, border: 0, outline: "none", background: "transparent", resize: "none", fontSize: 16, lineHeight: "22px", padding: "11px 0", height: 44, maxHeight: 120, boxSizing: "border-box", overflowY: "auto", alignSelf: "center" }}
            />
            {speechSupported && (
              <button onClick={toggleListening} aria-label={listening ? "Stop listening" : "Speak to Neyu"} title="Speak to Neyu" style={{ width: 44, height: 44, border: 0, borderRadius: 10, background: listening ? "#9B2317" : "#E6F3F8", color: listening ? "#FFF7F5" : "#1D5FA8", display: "grid", placeItems: "center", fontSize: 18, flex: "none" }}>
                <NIcon name={listening ? "ph-microphone-slash" : "ph-microphone"} size="1em" tone="currentColor" />
              </button>
            )}
            <button onClick={() => submit()} aria-label="Send" className="hv-purple" style={{ width: 44, height: 44, border: 0, borderRadius: 10, background: "#2A84E4", color: "#FDFCFA", display: "grid", placeItems: "center", fontSize: 18, flex: "none" }}><NIcon name="ph-arrow-up" size="1em" tone="currentColor" /></button>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "#5A626A", display: "flex", gap: 6, alignItems: "center" }}><NIcon name="ph-info" size="1em" tone="currentColor" />Neyu explains; it doesn’t diagnose. In an emergency call 911. <a href="/ai-notice" style={{ color: "inherit" }}>How Neyu works</a></div>
        </div>
      </aside>
    </>
  );
}

export default function AlbaWidget() {
  const { isOpen, openAlba, closeAlba, emergency } = useAlba();
  const pathname = usePathname();
  const mobile = useIsMobile();

  // On the homepage, Neyu's button appears after the intro video + the
  // spotlight veil; everywhere else it is there straight away.
  const [videoDone, setVideoDone] = useState(pathname !== "/");
  const [introDone, setIntroDone] = useState(pathname !== "/");
  const [popIn, setPopIn] = useState(pathname !== "/");

  useEffect(() => {
    if (pathname !== "/") { setVideoDone(true); setIntroDone(true); setPopIn(true); return; }
    if (sessionStorage.getItem(VIDEO_SEEN_KEY)) { setVideoDone(true); return; }
    const check = setInterval(() => {
      if (sessionStorage.getItem(VIDEO_SEEN_KEY)) { setVideoDone(true); clearInterval(check); }
    }, 200);
    return () => clearInterval(check);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeAlba(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, closeAlba]);

  if (pathname?.startsWith("/admin")) return null;

  const handleIntroComplete = () => {
    setIntroDone(true);
    setTimeout(() => setPopIn(true), 80);
  };

  return (
    <>
      {videoDone && !introDone && <AlbaIntroVeil onComplete={handleIntroComplete} />}

      {popIn && !isOpen && !emergency && !mobile && (
        <button
          onClick={() => openAlba()}
          aria-label="Open Neyu"
          className="anra-chrome hv-bdViolet"
          style={{ position: "fixed", right: 20, bottom: 20, zIndex: 40, height: 56, padding: "0 20px 0 13px", border: "1px solid #D6EEF6", borderRadius: 999, background: "rgba(253,252,250,.92)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 18px 40px -18px rgba(29,95,168,.5)", display: "flex", alignItems: "center", gap: 10, fontSize: 13, letterSpacing: ".12em", fontWeight: 600, color: "#163F6E", animation: "fadeUp .4s ease" }}
        >
          <AlbaOrb size={30} />Neyu
        </button>
      )}

      {isOpen && <AlbaPanel mobile={mobile} />}
    </>
  );
}
