// Facts used by the legal pages (/privacy, /terms, /ai-notice, /cookies, /accessibility).
// ONE place to edit. Fields marked "TO CONFIRM" are not decided yet: until they are set,
// the pages use the safe fallback written next to them (no made-up names or addresses).
// After editing: update EFFECTIVE_DATE and add a new PolicyVersion row (see docs/LEGAL.md).
import { CLINICS } from "@/lib/site";

const main = CLINICS[0];

export const LEGAL = {
  /** Name people know us by. */
  brand: "NEYU Health",
  /** TO CONFIRM: registered legal name of the company (e.g. "NEYU Health Inc."). Fallback: brand. */
  legalName: null as string | null,
  /** TO CONFIRM: privacy contact email (e.g. "privacy@neyuhealth.com"). Fallback: phone + mail. */
  privacyEmail: null as string | null,
  /** TO CONFIRM: name of the Privacy Officer. Fallback: the title only. */
  privacyOfficerName: null as string | null,
  privacyOfficerTitle: "Privacy Officer",
  /** TO CONFIRM: mailing address for privacy requests. Fallback: the North East clinic. */
  mailingAddress: null as string | null,
  /** Phone for privacy and legal questions. */
  phone: main.phone,
  /** Minimum age for a My Health Space account. */
  minAge: 18,
  /** TO CONFIRM: where the servers are (e.g. "Canada"). Fallback: no country named. */
  hostingCountry: null as string | null,
  /** Date the current versions take effect (YYYY-MM-DD). Keep in step with PolicyVersion. */
  effectiveDate: "2026-10-20",
  versions: { terms: "2026-10-20", privacy: "2026-10-20", ai: "2026-10-20", marketing: "2026-10-20" },
};

export const legalEntity = () => LEGAL.legalName || LEGAL.brand;
export const mailing = () => LEGAL.mailingAddress || `${LEGAL.brand}, ${main.street}, ${main.city}, ${main.region} ${main.postal}`;
export const officer = () => (LEGAL.privacyOfficerName ? `${LEGAL.privacyOfficerName}, ${LEGAL.privacyOfficerTitle}` : `our ${LEGAL.privacyOfficerTitle}`);
export const effectiveLabel = () => new Date(LEGAL.effectiveDate + "T12:00:00Z").toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

/** Fields still to confirm (shown in the README check and the build report, never on the pages). */
export const legalToConfirm = () => [
  !LEGAL.legalName && "legal company name",
  !LEGAL.privacyEmail && "privacy contact email",
  !LEGAL.privacyOfficerName && "Privacy Officer name",
  !LEGAL.mailingAddress && "mailing address for privacy requests",
  !LEGAL.hostingCountry && "country where the servers are",
].filter(Boolean) as string[];
