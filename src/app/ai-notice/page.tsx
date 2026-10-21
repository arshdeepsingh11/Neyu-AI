// /ai-notice — how Neyu (the AI companion) works, its limits and your choices (Phase 8).
import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { LegalDoc, ContactBlock } from "@/components/legal/LegalDoc";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = seo("/ai-notice");

export default function AiNoticePage() {
  return (
    <>
      <PageSchema path="/ai-notice" />
      <LegalDoc path="/ai-notice" eyebrow="Neyu AI" title="Neyu AI notice" version={LEGAL.versions.ai}
        intro={<p style={{ margin: 0 }}>Neyu is the AI companion on neyuhealth.com, in My Health Space and in the NEYU app. This notice explains what Neyu does, what it doesn’t, what information it uses and how to switch it off. <b>Neyu explains — it does not diagnose.</b></p>}
        sections={[
          { id: "what", h: "What Neyu does", body: <ul>
            <li>Answers general health questions and explains terms, test names and results in plain language.</li>
            <li>Helps you find the right service, physician or clinic, and fills in forms you ask it to help with.</li>
            <li>In My Health Space, when you ask, looks at your own records and trends to explain them and suggest questions for your doctor.</li>
            <li>Runs the symptom check, which suggests how urgently to seek care — it always sends emergencies to 911.</li>
          </ul> },
          { id: "not", h: "What Neyu doesn’t do", body: <ul>
            <li>It doesn’t diagnose, prescribe, or change your treatment. Only your physician can do that.</li>
            <li>It isn’t monitored by a person in real time and can’t respond to emergencies. Call 911 in an emergency.</li>
            <li>It doesn’t decide anything about your care, coverage or appointments on its own.</li>
          </ul> },
          { id: "limits", h: "Accuracy and limits", body: <p>AI can be wrong, incomplete or out of date, even when it sounds confident. Check important information with your care team, especially before acting on it. If an answer seems wrong or unsafe, tell us (contact details below) so we can improve Neyu’s safety rules.</p> },
          { id: "data", h: "What information Neyu uses", body: <>
            <ul>
              <li><b>On the public website:</b> only what you type in the conversation.</li>
              <li><b>In My Health Space:</b> what you type, plus the parts of your records needed for that answer — only when you ask, and only if “Neyu access” is on.</li>
              <li>To create an answer, this text is sent to <b>Google’s Gemini</b> service, which may process it outside Canada. We send only what is needed for that question.</li>
              <li>Your conversations are saved in your History so you and your care team can review them. Anonymous topics (for example “blood pressure”) are counted to improve the site; the words you typed are not shown in those statistics.</li>
            </ul>
          </> },
          { id: "choices", h: "Your choices", body: <ul>
            <li>Turn Neyu’s access to your records off or on: My Health Space → Account → Privacy &amp; Data → “Neyu access”. You can still use NEYU without Neyu.</li>
            <li>Don’t type information you don’t want stored, such as other people’s health details.</li>
            <li>Ask a person instead: call the clinic or book a visit.</li>
          </ul> },
          { id: "safety", h: "Safety rules", body: <p>Neyu follows fixed safety rules: it watches for emergency warning signs (such as chest pain with shortness of breath) and tells you to call 911; it avoids giving doses or diagnoses; and it reminds you that its answers are wellness information. These rules are only ever made stricter, never relaxed.</p> },
          { id: "contact", h: "Questions", body: <ContactBlock /> },
        ]}
      />
    </>
  );
}
