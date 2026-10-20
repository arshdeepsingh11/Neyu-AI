// /terms — Terms of Use (Phase 8). Facts from src/lib/legal.ts.
import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { LegalDoc, ContactBlock } from "@/components/legal/LegalDoc";
import { LEGAL, legalEntity } from "@/lib/legal";

export const metadata: Metadata = seo("/terms");

export default function TermsPage() {
  return (
    <>
      <PageSchema path="/terms" />
      <LegalDoc path="/terms" eyebrow="Legal" title="Terms of Use" version={LEGAL.versions.terms}
        intro={<p style={{ margin: 0 }}>These terms apply when you use neyuhealth.com, My Health Space, Neyu and the NEYU phone app (together, the “Services”), provided by {legalEntity()} (“NEYU”, “we”). By using the Services you agree to these terms and to our <a href="/privacy">Privacy Policy</a>. If you don’t agree, please don’t use the Services.</p>}
        sections={[
          { id: "emergency", h: "Not for emergencies", body: <p><b>The Services are not an emergency service.</b> If you think you may be having a medical emergency, call 911 or go to the nearest emergency department. For nurse advice in Alberta, call Health Link 811. Messages, readings and requests sent through the Services are not monitored in real time.</p> },
          { id: "not-advice", h: "Information, not a diagnosis", body: <>
            <p>The website, My Health Space trends, daily briefs and Neyu give general health and wellness information. They do not diagnose, treat or replace care from a qualified health professional. Always talk to your physician before starting, stopping or changing any treatment, medication, diet or exercise plan.</p>
            <p>Medical care at NEYU is provided by licensed physicians and clinicians during appointments, under their professional standards — not by the website or Neyu.</p>
          </> },
          { id: "account", h: "Your account", body: <ul>
            <li>You must be at least {LEGAL.minAge} to create a My Health Space account.</li>
            <li>Give accurate information and keep it up to date. One account per person.</li>
            <li>Keep your password secret and tell us if you think someone else has used your account. You are responsible for activity under your account unless it was caused by our failure.</li>
            <li>We may lock an account to protect it (for example after repeated failed sign-ins) and will help you restore access.</li>
          </ul> },
          { id: "your-data", h: "Your information and content", body: <>
            <p>You own the information, documents and photos you add. You allow NEYU to store, process and display them only to provide the Services to you and, when you choose, to share them with the people you pick (your care team, a family member or a doctor with a share link), as described in the Privacy Policy.</p>
            <p>Only add information about yourself, or about someone you are legally allowed to act for. You can export or delete your information at any time in Account → Privacy &amp; Data.</p>
          </> },
          { id: "devices", h: "Devices and other services", body: <p>When you connect Apple Health, Health Connect, Withings, Oura or WHOOP, their own terms also apply. Data from these services can be incomplete, delayed or inaccurate; NEYU shows what it receives and is not responsible for how other companies collect or measure it.</p> },
          { id: "use", h: "Acceptable use", body: <><p>Don’t:</p><ul>
            <li>use the Services for anything unlawful, or to harass or harm anyone;</li>
            <li>try to access another person’s account or information, or get around security or rate limits;</li>
            <li>upload viruses or content you don’t have the right to share;</li>
            <li>copy, scrape or resell the Services, or use automated tools against them without our written permission.</li>
          </ul><p>We may suspend access that breaks these rules or puts other users at risk.</p></> },
          { id: "appointments", h: "Appointments, tests and payments", body: <p>Booking, prices, cancellations and coverage for clinic appointments, tests, packages and memberships are explained when you book or buy them, and those terms apply to that service. Services insured by Alberta Health Care are billed according to Alberta Health rules.</p> },
          { id: "ip", h: "Our content", body: <p>The NEYU name, logo, website text, designs and software belong to NEYU or its licensors. You may use them only to use the Services for yourself.</p> },
          { id: "availability", h: "Availability and changes", body: <p>We work to keep the Services available and secure, but they may sometimes be unavailable for maintenance or reasons outside our control. We may improve, change or stop features; if we stop My Health Space we will give you reasonable notice and a way to download your information.</p> },
          { id: "liability", h: "Limits of liability", body: <p>To the extent the law allows, the Services are provided “as is”, and NEYU is not liable for indirect or consequential losses, or for decisions made based only on general information from the website or Neyu without consulting a health professional. Nothing in these terms limits rights you have under consumer-protection law or our professional responsibilities when we provide medical care.</p> },
          { id: "ending", h: "Closing your account", body: <p>You can delete your account at any time (Account → Privacy &amp; Data); it is removed after a 30-day waiting period you can cancel. We may close accounts that seriously or repeatedly break these terms, and will tell you why when we can. Clinical records are kept as required by law.</p> },
          { id: "law", h: "Governing law", body: <p>These terms are governed by the laws of Alberta and the federal laws of Canada that apply there. Disputes will be handled by the courts of Alberta.</p> },
          { id: "changes", h: "Changes to these terms", body: <p>We will post any new version here with its date. If a change matters for how you use the Services, we will tell you in My Health Space and ask you to agree to it; if you don’t agree you can stop using the Services and delete your account.</p> },
          { id: "contact", h: "Contact", body: <ContactBlock /> },
        ]}
      />
    </>
  );
}
