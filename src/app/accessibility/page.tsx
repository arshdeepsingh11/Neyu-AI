// /accessibility — accessibility statement (Phase 8).
import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { LegalDoc, ContactBlock } from "@/components/legal/LegalDoc";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = seo("/accessibility");

export default function AccessibilityPage() {
  return (
    <>
      <PageSchema path="/accessibility" />
      <LegalDoc path="/accessibility" eyebrow="Accessibility" title="Accessibility statement"
        intro={<p style={{ margin: 0 }}>{LEGAL.brand} wants everyone to be able to use our website, My Health Space and the NEYU app, including people who use screen readers, keyboards, magnification or other assistive technology. We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.1 at level AA.</p>}
        sections={[
          { id: "done", h: "How we work on it", body: <ul>
            <li>We test pages with automated accessibility checks (axe) and fix the problems they find before release.</li>
            <li>We design for readable contrast, keyboard use with a visible focus, labelled form fields and clear error messages.</li>
            <li>Images have text alternatives. Background videos play without sound.</li>
            <li>The NEYU app shows the same pages as the website, so the same work applies there.</li>
          </ul> },
          { id: "known", h: "Known limits", body: <ul>
            <li>Some charts in My Health Space are visual. If you can’t read a chart, ask us and we’ll give you the numbers another way.</li>
            <li>Documents you upload (for example scanned reports) may not be accessible if the original isn’t.</li>
            <li>Content on other sites we link to is outside our control.</li>
          </ul> },
          { id: "help", h: "Need help or found a barrier?", body: <><p>Tell us what you were trying to do and on which page. We will help you another way right away (for example by phone) and aim to fix the problem. You can also ask for any document in another format.</p><ContactBlock /></> },
        ]}
      />
    </>
  );
}
