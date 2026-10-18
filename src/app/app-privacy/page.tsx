// /app-privacy — how the NEYU phone app uses health data (Apple Health, Health Connect,
// notifications, Face ID). Linked from Health Connect's permission screen and the app stores.
// Factual notice for Phase 6; the full privacy policy is written with legal review in Phase 8.
import type { Metadata } from "next";
import { CLINICS, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "NEYU App — Health Data and Privacy",
  description: "What the NEYU Health phone app reads from Apple Health and Health Connect, why, how it is stored, and how to stop sharing or delete it.",
  alternates: { canonical: `${SITE_URL}/app-privacy` },
  robots: { index: false, follow: true },
};

const H = ({ children }: { children: React.ReactNode }) => <h2 style={{ margin: "34px 0 10px", fontSize: 21, fontWeight: 500, letterSpacing: "-.01em" }}>{children}</h2>;
const P = ({ children }: { children: React.ReactNode }) => <p style={{ margin: "0 0 12px", fontSize: 16, lineHeight: 1.65, color: "#3B4348" }}>{children}</p>;
const L = ({ items }: { items: React.ReactNode[] }) => <ul style={{ margin: "0 0 12px", paddingLeft: 22, fontSize: 16, lineHeight: 1.65, color: "#3B4348" }}>{items.map((x, i) => <li key={i} style={{ marginBottom: 4 }}>{x}</li>)}</ul>;

export default function AppPrivacy() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "calc(48px + env(safe-area-inset-top)) 22px 80px", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", color: "#1D2327" }}>
      <p style={{ margin: "0 0 8px", fontSize: 14, color: "#5B6369" }}>NEYU Health · Phone app</p>
      <h1 style={{ margin: "0 0 14px", fontSize: 34, lineHeight: 1.15, fontWeight: 500, letterSpacing: "-.025em" }}>Your health data in the NEYU app</h1>
      <P>The NEYU app for iPhone and Android opens My Health Space, your private health record at NEYU Health in Calgary. This page explains what the app reads from your phone, why, and how you stay in control.</P>

      <H>What the app reads — only when you choose to connect</H>
      <P>When you tap Connect in My Health Space → Devices, your phone asks which data NEYU may read from Apple Health (iPhone) or Health Connect (Android). You can allow some, all or none. NEYU can read:</P>
      <L items={["Steps, walking and running distance, active energy, exercise minutes and workouts", "Sleep (time asleep, bedtime, time in bed)", "Resting heart rate, heart rate variability and blood oxygen", "Weight, blood pressure and blood glucose"]} />
      <P>NEYU only reads. It never writes to, changes or deletes anything in Apple Health or Health Connect.</P>

      <H>Why</H>
      <P>To show your trends in My Health Space (for example your sleep and resting heart rate over time) and, when you ask, to help Neyu, our AI companion, and your NEYU care team understand your health. These are wellness trends, not a diagnosis.</P>

      <H>What NEYU does not do</H>
      <L items={["Health data from your phone is never sold or rented.", "It is never used for advertising or marketing, and never shared with data brokers.", "It is not shared with anyone outside NEYU Health unless you create a share link yourself or the law requires it."]} />

      <H>How it is sent and stored</H>
      <P>The app sends one summary per day (for example total steps, hours slept) over an encrypted connection to NEYU's servers, using a private sync key that only works for your account and can only add data. Your record is stored and protected as described in the NEYU privacy notice in My Health Space → Account → Privacy &amp; Data.</P>

      <H>Notifications</H>
      <P>If you turn on notifications, NEYU sends reminders and your daily summary alert. Notifications never contain health details, because they can appear on a locked screen. Turn them off any time in My Health Space → Account → Notifications or in your phone's settings.</P>

      <H>Face ID, Touch ID and fingerprint</H>
      <P>The optional app lock uses your phone's own Face ID, Touch ID or fingerprint check. NEYU never receives or stores your face or fingerprint — your phone only tells the app whether the check passed.</P>

      <H>Camera and photos</H>
      <P>The camera and photo library are used only when you choose to scan a health report, add a document or photograph a meal.</P>

      <H>Stop sharing or delete your data</H>
      <L items={["Stop new data: My Health Space → Devices → your phone → Disconnect, or remove NEYU's access in Apple Health (Settings → Health → Data Access & Devices) or Health Connect (App permissions).", "Delete data already sent: My Health Space → Account → Privacy & Data.", "Download everything NEYU holds about you, or delete your account: My Health Space → Account → Privacy & Data."]} />

      <H>Questions</H>
      <P>Call either NEYU Health clinic in Calgary: {CLINICS.map((c, i) => <span key={c.phone}>{i ? " or " : ""}{c.name.replace("NEYU Health — ", "")} <a href={`tel:${c.phone}`} style={{ color: "#1B6F8A" }}>{c.phone.replace("+1-", "")}</a></span>)}.</P>
      <p style={{ margin: "34px 0 0", fontSize: 13, color: "#5B6369" }}>Applies to NEYU app version 1. Last updated October 2026.</p>
    </main>
  );
}
