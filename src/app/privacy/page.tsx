// /privacy — Privacy Policy (Phase 8). Facts come from src/lib/legal.ts and from what the
// platform actually does (see docs/LEGAL.md for where each statement comes from).
import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { LegalDoc, ContactBlock } from "@/components/legal/LegalDoc";
import { LEGAL, legalEntity, officer } from "@/lib/legal";

export const metadata: Metadata = seo("/privacy");

export default function PrivacyPage() {
  const host = LEGAL.hostingCountry;
  return (
    <>
      <PageSchema path="/privacy" />
      <LegalDoc path="/privacy" eyebrow="Legal" title="Privacy Policy" version={LEGAL.versions.privacy}
        intro={<p style={{ margin: 0 }}>This policy explains what personal and health information {legalEntity()} (“NEYU”, “we”) collects through neyuhealth.com, My Health Space and the NEYU phone app, why, who can see it, and the choices you have. We handle personal and health information in line with Alberta’s <i>Health Information Act</i> (HIA) and <i>Personal Information Protection Act</i> (PIPA), and Canada’s <i>Personal Information Protection and Electronic Documents Act</i> (PIPEDA), as each applies. <b>We never sell your information and never use your health information for advertising.</b></p>}
        sections={[
          { id: "who", h: "Who we are", body: <>
            <p>{LEGAL.brand} is a cardiology and internal medicine clinic in Calgary, Alberta, with two locations. My Health Space is our private online health record for patients and members of the public. Neyu is the AI companion built into the site and app.</p>
            <p>When NEYU physicians care for you, the information in your clinical record is collected and kept under the <i>Health Information Act</i>. Information you choose to add to My Health Space yourself (for example readings from your watch) is kept to provide the service to you and is handled with the same care.</p>
          </> },
          { id: "collect", h: "What we collect", body: <>
            <h3>When you create a My Health Space account</h3>
            <ul><li>Name, email address, password (stored only as a secure, one-way hash) and, if you add them, date of birth, phone number, time zone, city and photo.</li><li>A record of what you agreed to (which policy version, when, and the internet address and browser used).</li></ul>
            <h3>Health information you add or connect</h3>
            <ul>
              <li>Readings you enter or import (blood pressure, weight, glucose, sleep and others), documents and reports you upload, food photos, goals, symptom checks, health assessments, questions for your visits and your conversations with Neyu.</li>
              <li>Data from devices you connect: Apple Health, Health Connect (Android), Withings, Oura or WHOOP — only the types you allow (see <a href="#app">the phone app</a> and <a href="#devices">connected devices</a>).</li>
              <li>Results and visit information from the NEYU clinic and from BioAro Labs, when they are part of your care.</li>
            </ul>
            <h3>When you visit the website</h3>
            <ul><li>A random visit identifier in a cookie (not your name), the pages you view, the site that sent you, your browser type, and — anonymously — searches and buttons used on public pages. We do not store your internet address with these visits. If your browser sends Do Not Track or Global Privacy Control, or you turn statistics off on the <a href="/cookies">Cookies</a> page, none of this is recorded.</li></ul>
            <h3>From health professionals</h3>
            <ul><li>Referrals sent to us by your doctor through the Referral Centre, with the information needed to book your care.</li></ul>
          </> },
          { id: "use", h: "How we use it", body: <ul>
            <li>To provide My Health Space and the app: show your records, trends and daily brief, keep your devices in sync, and send the reminders you turned on.</li>
            <li>To provide care: when you are a NEYU patient, or when you choose to share with your care team.</li>
            <li>To answer your questions with Neyu — only when you ask and only if Neyu access is on (see <a href="#ai">Neyu AI</a>).</li>
            <li>To keep accounts secure: sign-in protection, fraud prevention and an audit log of who opened what.</li>
            <li>To improve the website using anonymous, combined statistics (for example how many people view a page). These never identify you.</li>
            <li>To meet legal duties, such as keeping clinical records and responding to lawful requests.</li>
          </ul> },
          { id: "share", h: "Who can see it", body: <>
            <ul>
              <li><b>You.</b> Everything in My Health Space is visible to you, and you can download a full copy at any time.</li>
              <li><b>Your NEYU care team</b> — for your care, and for information you choose to share. Staff only see what their role needs. Opening a record outside a staff member’s normal role requires a written reason, and every access is recorded.</li>
              <li><b>People you choose:</b> a family member you invite, or a doctor you send a time-limited share link to (1, 7 or 30 days; you can cancel it).</li>
              <li><b>Service providers</b> that run parts of the service for us, under contract and only for that purpose:</li>
            </ul>
            <div className="scroll" tabIndex={0} role="region" aria-label="Service providers"><table><thead><tr><th>Provider</th><th>What for</th><th>What they receive</th></tr></thead><tbody>
              <tr><td>Our hosting provider{host ? ` (${host})` : ""}</td><td>Running the website, database and encrypted file storage</td><td>All stored data, encrypted where noted below</td></tr>
              <tr><td>Google (Gemini)</td><td>Neyu AI answers</td><td>Your question and the information needed to answer it — only when you use Neyu</td></tr>
              <tr><td>Resend</td><td>Sending emails (sign-in codes, reminders)</td><td>Your email address and the email text</td></tr>
              <tr><td>Google Firebase · Apple</td><td>Phone notifications</td><td>A device token and a general message — never health details</td></tr>
              <tr><td>BioAro Labs and BioAro Drugs</td><td>Lab testing and pharmacy fulfilment you order</td><td>What is needed to complete your test or order</td></tr>
              <tr><td>Withings · Oura · WHOOP</td><td>Only if you connect them</td><td>A secure sign-in token from you; we read the data types you allow</td></tr>
              <tr><td>Environment and Climate Change Canada</td><td>Weather in your daily brief</td><td>Your city only</td></tr>
              <tr><td>YouTube (privacy-enhanced mode)</td><td>A video on one specialty page</td><td>Standard video request from your browser</td></tr>
            </tbody></table></div>
            <ul><li><b>When the law requires it</b> — for example a court order, or where the <i>Health Information Act</i> requires or allows disclosure.</li></ul>
            <p><b>We never sell or rent personal or health information, never share it with data brokers, and never use it for advertising.</b></p>
          </> },
          { id: "ai", h: "Neyu AI", body: <>
            <p>Neyu reads your health information only when you ask it something, and only from sources you allow. You can turn Neyu’s access off at any time in My Health Space → Account → Privacy &amp; Data (“Neyu access”). To answer, the relevant text is sent to Google’s Gemini service, which may process it outside Canada. Conversations are saved in your History so you and your care team can review them, and are deleted when you delete your account.</p>
            <p>Neyu gives wellness information, not a diagnosis. Full details: <a href="/ai-notice">Neyu AI notice</a>.</p>
          </> },
          { id: "app", h: "The NEYU phone app", body: <>
            <ul>
              <li><b>Apple Health and Health Connect:</b> read only, and only after you allow it on your phone. NEYU reads steps, distance, active energy, exercise and workouts, sleep, resting heart rate, heart rate variability, blood oxygen, weight, blood pressure and blood glucose — whichever you allow. It sends one summary per day; it never writes to or changes your phone’s health data. Health data from your phone is never used for advertising or sold.</li>
              <li><b>Notifications</b> (optional): reminders and your daily brief. Notifications never contain health details, because they can appear on a locked screen.</li>
              <li><b>Face ID, Touch ID or fingerprint lock</b> (optional): your phone checks it. NEYU never receives or stores your face or fingerprint.</li>
              <li><b>Camera and photos:</b> only when you choose to scan a report or photograph a meal.</li>
            </ul>
            <p>To stop sharing: disconnect in My Health Space → Devices, or remove NEYU’s access in Apple Health or Health Connect.</p>
          </> },
          { id: "devices", h: "Connected devices", body: <p>When you connect Withings, Oura or WHOOP, you sign in with that company and allow NEYU to read your data. We keep the sign-in tokens encrypted and read new data about once a day. You can choose which kinds of data are shared, and disconnect at any time; data already received stays until you delete it in Privacy &amp; Data.</p> },
          { id: "email", h: "Emails", body: <p>We email you to confirm your address, to keep your account secure, and for reminders you turned on (visits, retests, daily brief). News and offers are sent only if you opt in, and are off by default. Every email has an unsubscribe link, and you can change your choices in My Health Space → Account → Notifications.</p> },
          { id: "where", h: "Where your information is stored", body: <p>{host ? `Our servers are in ${host}. ` : ""}Some service providers listed above (for example Google, Resend and Apple) may process information in other countries, including the United States, where it can be subject to those countries’ laws. We choose providers that protect information to a standard comparable to Canadian law.</p> },
          { id: "security", h: "How we protect it", body: <ul>
            <li>Encrypted connections (HTTPS) everywhere; uploaded reports and data exports are encrypted at rest (AES-256).</li>
            <li>Passwords are stored only as a strong one-way hash; repeated failed sign-ins are blocked.</li>
            <li>Staff sign in with individual accounts (two-step verification available); access follows each person’s role and is written to an append-only audit log.</li>
            <li>Optional Face ID or fingerprint lock in the phone app.</li>
            <li>If a breach puts your information at risk, we will tell you and the regulator as the law requires.</li>
          </ul> },
          { id: "retention", h: "How long we keep it", body: <ul>
            <li><b>Your My Health Space account:</b> while it is open. If you delete it, everything is removed after a 30-day waiting period (you can cancel during that time). We keep only a deletion certificate with counts — no personal or health details.</li>
            <li><b>Clinical records</b> created when NEYU physicians care for you: for the period required by Alberta law and the College of Physicians &amp; Surgeons of Alberta, even if you close your online account.</li>
            <li><b>Data exports</b> you request: 7 days, then deleted.</li>
            <li><b>Website visit records:</b> 13 months; after that only daily totals remain.</li>
            <li><b>Sign-in sessions:</b> 30 days for patients, 8 hours for staff.</li>
            <li><b>Backups:</b> 30 days, then overwritten.</li>
            <li><b>Audit log and consent records:</b> kept as a legal record of access and agreements.</li>
          </ul> },
          { id: "rights", h: "Your rights and choices", body: <>
            <ul>
              <li><b>See and download</b> your information: My Health Space → Account → Privacy &amp; Data → Full copy of your data.</li>
              <li><b>Correct</b> details in your profile, or ask us to correct clinical information.</li>
              <li><b>Withdraw consent</b> for Neyu, devices, notifications or news at any time (this does not undo what was done before).</li>
              <li><b>Delete</b> your account and the data you added.</li>
              <li><b>Ask questions or complain</b> to {officer()} (contact details below). If you are not satisfied, you can contact the Office of the Information and Privacy Commissioner of Alberta (oipc.ab.ca) or the Office of the Privacy Commissioner of Canada (priv.gc.ca).</li>
            </ul>
            <p>We aim to answer requests within 30 days and may ask you to confirm your identity first.</p>
          </> },
          { id: "age", h: "Age", body: <p>My Health Space accounts are for people {LEGAL.minAge} and older. We do not knowingly create accounts for anyone younger. Care for children and youth is arranged through the clinic with a parent or guardian.</p> },
          { id: "changes", h: "Changes to this policy", body: <p>When we change this policy, we publish the new version here with a new date. If the change matters for how we use your information, we will tell you in My Health Space and ask you to review it. Every version you agree to is recorded.</p> },
          { id: "contact", h: "Contact", body: <><p>Questions, requests or complaints about privacy:</p><ContactBlock /></> },
        ]}
      />
    </>
  );
}
