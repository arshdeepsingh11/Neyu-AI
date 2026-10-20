// /cookies — every cookie and browser storage item NEYU uses, and the statistics switch (Phase 8).
import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { LegalDoc, ContactBlock } from "@/components/legal/LegalDoc";
import StatsChoice from "@/components/legal/StatsChoice";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = seo("/cookies");

const COOKIES: [string, string, string, string][] = [
  ["anra_pt", "Keeps you signed in to My Health Space", "30 days", "Essential"],
  ["neyu_staff", "Keeps NEYU staff signed in to the admin console", "8 hours", "Essential (staff only)"],
  ["anra_session_id", "A random visit number (no name) that groups your page views and keeps Neyu’s conversation together", "1 year", "Essential / statistics"],
  ["anra_oauth", "Protects the sign-in when you connect Withings, Oura or WHOOP", "10 minutes", "Essential"],
  ["neyu_app_home", "Remembers where the NEYU app opens (My Health Space or the website)", "1 year", "Preference"],
  ["neyu_stats", "Remembers that you turned anonymous statistics off", "1 year", "Preference"],
];
const STORAGE: [string, string][] = [
  ["Language", "The language you picked for the site"],
  ["App home, intro and Neyu chat", "Your app start screen, whether you have seen an introduction, and the current Neyu chat on this device"],
  ["Admin console lock", "Staff only: locks the console after inactivity"],
];

export default function CookiesPage() {
  return (
    <>
      <PageSchema path="/cookies" />
      <LegalDoc path="/cookies" eyebrow="Legal" title="Cookies and similar technology"
        intro={<p style={{ margin: 0 }}>{LEGAL.brand} uses a small number of first-party cookies — set by neyuhealth.com itself — to keep you signed in, keep the site secure and count visits anonymously. <b>We use no advertising cookies and no third-party trackers.</b></p>}
        sections={[
          { id: "list", h: "Cookies we use", body: <div className="scroll" tabIndex={0} role="region" aria-label="Cookies we use"><table><thead><tr><th>Name</th><th>What it does</th><th>Kept for</th><th>Type</th></tr></thead><tbody>
            {COOKIES.map(([n, w, k, t]) => <tr key={n}><td><code>{n}</code></td><td>{w}</td><td>{k}</td><td>{t}</td></tr>)}
          </tbody></table></div> },
          { id: "storage", h: "Storage on your device", body: <><p>The site and app also keep a few settings in your browser’s storage. They stay on your device and are not used to track you:</p><ul>{STORAGE.map(([n, w]) => <li key={n}><b>{n}:</b> {w}</li>)}</ul></> },
          { id: "stats", h: "Anonymous statistics — your choice", body: <>
            <p>We count page views, searches and clicks on public pages to see what helps people. These statistics never include your name, email or health information, and we do not store your internet address with them. Pages inside My Health Space are never counted for searches or clicks.</p>
            <StatsChoice />
            <p>If your browser sends <b>Do Not Track</b> or <b>Global Privacy Control</b>, statistics are off automatically.</p>
          </> },
          { id: "third", h: "Other sites", body: <p>One specialty page plays a video from YouTube in privacy-enhanced mode (youtube-nocookie.com), which avoids YouTube’s tracking cookies unless you play it on YouTube. Links to other sites (for example BioAro Labs, maps or device makers) are covered by those sites’ own policies.</p> },
          { id: "control", h: "Managing cookies", body: <p>You can delete or block cookies in your browser settings. If you block essential cookies, you won’t be able to sign in to My Health Space.</p> },
          { id: "contact", h: "Questions", body: <ContactBlock /> },
        ]}
      />
    </>
  );
}
