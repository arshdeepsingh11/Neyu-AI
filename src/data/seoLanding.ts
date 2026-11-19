// Service landing pages written for the words people actually search
// ("aesthetic clinic Calgary", "DNA test Calgary"…). Each page starts with a
// short direct answer (quoted by Google and AI assistants), then the facts
// already published elsewhere on this site — prices and test details are read
// from the same data files, so they never drift. Calls to action link to the
// existing service pages and booking flows.
import { LAB_TESTS, money } from "@/data/bioaroCatalog";
import { PACKAGES, pkgLabTotal, AT_HOME_TESTS } from "@/data/neyu";
import { NEA, NEA_TREATMENTS } from "@/data/nea";
import { diagnosticContent } from "@/data/diagnosticContent";

export type LandingItem = { name: string; text: string; price?: string; meta?: string };
export interface Landing {
  path: string;
  h1: string;
  kicker: string;
  title: string;          // search title (" | NEYU Health" is added)
  description: string;
  answer: string;         // direct answer, 2–3 sentences
  about: { type: "MedicalTest" | "MedicalProcedure" | "MedicalTherapy" | "Service"; name: string };
  highlights: { v: string; l: string }[];
  itemsTitle: string;
  itemsNote?: string;
  items: LandingItem[];
  steps: { t: string; d: string }[];
  faq: { q: string; a: string }[];
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
  where: string;          // location line
  related: { label: string; href: string }[];
}

const lab = (slug: string) => LAB_TESTS.find((t) => t.id === "labs-" + slug);
const tat = (t: (typeof LAB_TESTS)[number]) => t.facts.find(([k]) => k === "Turnaround")?.[1];
const fromPrice = (xs: { price: number }[]) => money(Math.min(...xs.map((x) => x.price)));

const genome = LAB_TESTS.filter((t) => t.cat === "BioGenome");
const exec = PACKAGES.find((p) => p.id === "executive")!;
const longevity = PACKAGES.find((p) => p.id === "longevity")!;
const atHome = AT_HOME_TESTS.map(lab).filter(Boolean) as typeof LAB_TESTS;
const mon = diagnosticContent["monitoring"];
const holter = mon.tests.find((t) => /holter/i.test(t.name))!;
const abpm = mon.tests.find((t) => /ambulatory/i.test(t.name))!;
const NE = "NEYU Health North East, 201 – 3151 27 St NE, Calgary";
const MM = "NEYU Health Meadow Miles, 250 – 8500 Blackfoot Trail SE, Calgary";

const wgs30 = lab("whole-genome-sequencing-30x"), wgs100 = lab("genome-testing"), wes = lab("whole-exome-sequencing-100x"), pgx = lab("pharmacogenomics-test");
const telo = lab("telomere-length-testing"), gdf = lab("gdf-15"), aia = lab("advanced-inflammation-aging");

export const LANDINGS: Landing[] = [
  {
    path: "/aesthetic-clinic-calgary", kicker: "Aesthetic clinic · Calgary NE",
    h1: "Aesthetic clinic in Calgary", title: "Aesthetic Clinic Calgary — Laser & Injectables",
    description: "Medical aesthetics in Calgary NE with Nea Precision Skin, NEYU Health's partner: Fotona laser, anti-wrinkle injectables, peels and acne, scar and pigment care.",
    answer: `NEYU Health's aesthetic and skin care in Calgary is provided by ${NEA.name}, our partner clinic at ${NEA.address} — the same building as NEYU Health North East. Nea offers Fotona laser treatments, anti-wrinkle injectables, medical-grade peels and facials, and care for acne, scarring, rosacea, pigmentation and hair, starting with a free 15-minute consultation.`,
    about: { type: "MedicalProcedure", name: "Medical aesthetic treatments" },
    highlights: [{ v: String(NEA_TREATMENTS.length), l: "treatments" }, { v: "Free", l: "15-min consultation" }, { v: "Fotona", l: "laser technology" }],
    itemsTitle: "Treatments", itemsNote: "Nea sets prices at the free consultation, based on your plan.",
    items: NEA_TREATMENTS.map((t) => ({ name: t.name, text: t.summary, meta: t.cat })),
    steps: [
      { t: "Free consultation", d: "15 minutes with Nea to talk about your goals and skin." },
      { t: "Your plan", d: "A personal plan and price, often combining laser, peels and skincare." },
      { t: "Treatment", d: "Sessions at Nea in Calgary NE, with aftercare advice." },
      { t: "Follow-up", d: "Progress checks and adjustments to your plan." },
    ],
    faq: [
      { q: "Where is the aesthetic clinic?", a: `${NEA.name} is at ${NEA.address}. Hours: ${NEA.hours}.` },
      { q: "Is the consultation free?", a: "Yes. Treatments start with a free 15-minute consultation." },
      { q: "How much do treatments cost?", a: "Nea does not publish prices online; you get a personal price at your free consultation." },
      { q: "How long do anti-wrinkle injections last?", a: "Nea notes that results appear in about 24 hours, reach full effect in 3 days and last 3–6 months. Treatment takes 10–20 minutes." },
      { q: "What is Fotona laser?", a: "A laser system with two wavelengths (Er:YAG and Nd:YAG) used for skin tightening, resurfacing, scars, pigmentation and more. Nea was one of the first centres to offer it." },
      { q: "How do I book?", a: `Book online through Nea or call ${NEA.phone}.` },
    ],
    primary: { label: "Book a free consultation", href: NEA.consult }, secondary: { label: "Skin health at NEYU", href: "/specialties/skin-health" },
    where: `${NEA.name} · ${NEA.address} · ${NEA.phone}`,
    related: [{ label: "Skin health", href: "/specialties/skin-health" }, { label: "Biological age test", href: "/biological-age-test-calgary" }, { label: "Executive health check", href: "/executive-health-check-calgary" }],
  },
  {
    path: "/dna-test-calgary", kicker: "DNA & genetic testing · Calgary",
    h1: "DNA & genetic testing in Calgary", title: "DNA Test in Calgary — Genome & Genetic Testing",
    description: `Medical DNA testing in Calgary with BioAro Labs: whole genome sequencing from ${money(wgs30?.price ?? 0)}, exome and pharmacogenomics, reviewed with a NEYU Health physician.`,
    answer: `NEYU Health offers medical DNA testing in Calgary through BioAro Labs: whole genome sequencing (30× ${money(wgs30?.price ?? 0)}, 100× ${money(wgs100?.price ?? 0)}), whole exome sequencing (${money(wes?.price ?? 0)}) and pharmacogenomics (${money(pgx?.price ?? 0)}). Results take about ${wgs30 ? tat(wgs30) : "4–6 weeks"} and are reviewed with a NEYU physician; some tests need a prescription.`,
    about: { type: "MedicalTest", name: "Genetic testing" },
    highlights: [{ v: fromPrice(genome), l: "starting price" }, { v: wgs30 ? tat(wgs30) || "" : "4–6 weeks", l: "typical turnaround" }, { v: String(genome.length), l: "DNA tests" }],
    itemsTitle: "DNA tests and prices", itemsNote: "BioAro Labs list prices. The NEYU team confirms the final price before anything is booked.",
    items: genome.map((t) => ({ name: t.name, text: t.why + (t.bestFor ? ` Best for: ${t.bestFor.replace(/\.$/, "")}.` : ""), price: money(t.price), meta: tat(t) })),
    steps: [
      { t: "Choose a test", d: "Pick a test or ask the team which one fits your goal." },
      { t: "Sample", d: "A simple sample is collected; some tests need a prescription first." },
      { t: "Sequencing", d: `BioAro Labs analyzes your DNA (about ${wgs30 ? tat(wgs30) : "4–6 weeks"}).` },
      { t: "Physician review", d: "Results are reviewed with a NEYU physician; Neyu explains them in plain language." },
    ],
    faq: [
      { q: "How much does a DNA test cost in Calgary?", a: `BioAro Labs DNA tests at NEYU Health start at ${fromPrice(genome)}. Whole genome sequencing is ${money(wgs30?.price ?? 0)} (30×) or ${money(wgs100?.price ?? 0)} (100×).` },
      { q: "What's the difference between genome and exome sequencing?", a: "Genome sequencing reads almost all of your DNA. Exome sequencing reads the protein-coding parts, where most known disease-causing variants are found." },
      { q: "How long do results take?", a: `About ${wgs30 ? tat(wgs30) : "4–6 weeks"} for genome, exome and pharmacogenomic tests.` },
      { q: "Do I need a prescription?", a: "Pharmacogenomics, disease-based DNA and cell-free DNA tests require a prescription. The team can help arrange it." },
      { q: "What can a DNA test tell me?", a: "Inherited risk for some conditions, how you respond to certain medicines, and carrier status. It can't predict the future with certainty, so results are reviewed with a physician." },
    ],
    primary: { label: "Request DNA testing", href: "/genomics" }, secondary: { label: "What can a DNA test tell me?", href: "/health-answers/what-does-a-dna-test-tell-you" },
    where: `${NE} · ${MM}`,
    related: [{ label: "Genomics", href: "/genomics" }, { label: "Pharmacogenomics explained", href: "/health-answers/what-is-pharmacogenomics" }, { label: "Biological age test", href: "/biological-age-test-calgary" }],
  },
  {
    path: "/executive-health-check-calgary", kicker: "Executive health · Calgary",
    h1: "Executive health check in Calgary", title: "Executive Health Check in Calgary",
    description: "A complete executive health assessment in Calgary: internal medicine, stress echo, carotid ultrasound, 24-hour blood pressure and advanced labs, in one morning.",
    answer: `NEYU Health's Executive Health assessment in Calgary brings ${exec.clinic.map((c) => c.replace(/^[A-Z][a-z]/, (m) => m.toLowerCase())).join(", ").replace(/, ([^,]*)$/, " and $1")} together with advanced blood tests in one morning. ${exec.neyu}`,
    about: { type: "Service", name: "Executive health assessment" },
    highlights: [{ v: String(exec.clinic.length), l: "clinic assessments" }, { v: String(exec.labs.length), l: "advanced lab panels" }, { v: "1", l: "morning" }],
    itemsTitle: "What's included", itemsNote: `Lab list prices total ${money(pkgLabTotal(exec))} (BioAro Labs). The team confirms the full package price with you.`,
    items: [
      ...exec.clinic.map((c) => ({ name: c, text: "Done at NEYU Health in Calgary.", meta: "Clinic" })),
      ...exec.labs.map((l) => ({ name: l.name, text: lab(l.slug)?.why || "", price: money(l.price), meta: "Lab" })),
    ],
    steps: [
      { t: "Request", d: "Send a request; the team confirms the date and price." },
      { t: "One morning", d: "Assessment, heart and vessel tests, and blood work." },
      { t: "Connected report", d: "Every result in one report in My Health Space." },
      { t: "12-month plan", d: "A physician-reviewed plan, with Neyu tracking progress." },
    ],
    faq: [
      { q: "What's included in the executive health check?", a: `${exec.clinic.join(", ")}, plus ${exec.labs.map((l) => l.name).join(", ")}.` },
      { q: "How long does it take?", a: "The package is designed to be completed in one morning." },
      { q: "Who is it for?", a: exec.for },
      { q: "How much does it cost?", a: `The lab panels have a list price of ${money(pkgLabTotal(exec))}; the team confirms the full price, including clinic assessments, before booking.` },
      { q: "Where do I get my results?", a: "In My Health Space, as one connected report, with Neyu explaining each result." },
    ],
    primary: { label: "Request an executive health check", href: "/packages" }, secondary: { label: "See all packages", href: "/packages" },
    where: `${NE} · ${MM}`,
    related: [{ label: "Stress echo explained", href: "/health-answers/what-is-a-stress-echo" }, { label: "Biological age test", href: "/biological-age-test-calgary" }, { label: "Membership", href: "/membership" }],
  },
  {
    path: "/blood-test-at-home-calgary", kicker: "At-home blood test · Calgary",
    h1: "At-home blood test in Calgary", title: "At-Home Blood Test in Calgary",
    description: `A trained collector comes to your home or office in Calgary. ${atHome.length} popular tests from ${fromPrice(atHome)}, with results explained by Neyu in My Health Space.`,
    answer: `With NEYU Health, a trained collector comes to your home or office in Calgary to take your blood sample, so there's no trip to a lab. Popular at-home tests start at ${fromPrice(atHome)}, nothing is charged online, and results arrive in My Health Space where Neyu explains every value.`,
    about: { type: "MedicalTest", name: "Blood test" },
    highlights: [{ v: String(atHome.length), l: "popular at-home tests" }, { v: fromPrice(atHome), l: "starting price" }, { v: "Calgary", l: "home or office" }],
    itemsTitle: "Popular at-home tests", itemsNote: "BioAro Labs list prices. The team confirms which tests can be collected at home when you book.",
    items: atHome.map((t) => ({ name: t.name, text: t.why, price: money(t.price), meta: tat(t) })),
    steps: [
      { t: "Choose tests", d: "Pick tests, a package, or ask Neyu which fit your goal." },
      { t: "Book a time", d: "Send a request; the team confirms the time and price." },
      { t: "Collection", d: "A trained collector visits; it takes minutes." },
      { t: "Results", d: "Results land in My Health Space, explained by Neyu." },
    ],
    faq: [
      { q: "Can I get a blood test at home in Calgary?", a: "Yes. NEYU Health sends a trained collector to your home or office in the Calgary area." },
      { q: "How much does an at-home blood test cost?", a: `Popular tests start at ${fromPrice(atHome)} (BioAro Labs list prices). The team confirms the price before booking; nothing is charged online.` },
      { q: "Do I need to fast?", a: "Some tests need fasting or a morning sample. The team tells you exactly how to prepare for the tests you choose." },
      { q: "How do I get my results?", a: "Results arrive in My Health Space, next to your past results, and a NEYU physician reviews anything that needs follow-up." },
      { q: "I live outside Calgary. Can I still test?", a: "At-home collection is Calgary-only for now. The team can send a requisition you can use at a collection site near you." },
    ],
    primary: { label: "Request an at-home visit", href: "/at-home#book" }, secondary: { label: "See all tests", href: "/at-home" },
    where: "Calgary area · home or office",
    related: [{ label: "Why am I always tired?", href: "/health-answers/why-am-i-always-tired" }, { label: "What is hs-CRP?", href: "/health-answers/what-is-hs-crp" }, { label: "Lab Result Explainer", href: "/lab-results" }],
  },
  {
    path: "/holter-monitor-calgary", kicker: "Heart monitoring · Calgary",
    h1: "Holter monitor in Calgary", title: "Holter Monitor & 24-Hour BP Monitor in Calgary",
    description: `Holter monitoring (${holter.duration.replace(/\s*\(.*\)/, "")}) and 24-hour ambulatory blood pressure monitoring at NEYU Health in Calgary: how it works, how to prepare and what it shows.`,
    answer: `NEYU Health offers Holter monitoring and 24-hour ambulatory blood pressure monitoring in Calgary. A Holter monitor records every heartbeat for ${holter.duration.replace(/\s*\(.*\)/, "")} to find irregular rhythms, extra beats and pauses; the ambulatory monitor checks your blood pressure through a normal day and night. Most tests need a referral from your physician.`,
    about: { type: "MedicalTest", name: "Holter monitor" },
    highlights: [{ v: holter.duration.replace(/\s*\(.*\)/, ""), l: "Holter recording" }, { v: abpm.duration.replace(/\s*\(.*\)/, ""), l: "blood pressure monitoring" }, { v: "2", l: "Calgary clinics" }],
    itemsTitle: "Monitoring tests",
    items: mon.tests.map((t) => ({ name: t.name, text: "How to prepare: " + t.prep.join("; ") + ".", meta: t.duration })),
    steps: [
      { t: "Referral", d: "Your physician sends a referral, or start with a NEYU consultation." },
      { t: "Fitting", d: "The monitor is fitted at the clinic in a few minutes." },
      { t: "Normal life", d: "Wear it through your day and night; keep a symptom diary." },
      { t: "Results", d: "A NEYU physician reviews the recording and your diary." },
    ],
    faq: [
      { q: "How long do I wear a Holter monitor?", a: `${holter.duration}.` },
      { q: "Can I shower with a Holter monitor?", a: "No. Shower before your appointment; the device must stay dry." },
      { q: "What does a Holter monitor find?", a: "Irregular rhythms such as atrial fibrillation, extra beats, fast rhythms and pauses, and whether your symptoms match a rhythm change." },
      { q: "Do I need a referral?", a: mon.referralNote || "Most diagnostic tests need a referral or order from your physician." },
      { q: "What is 24-hour ambulatory blood pressure monitoring?", a: "A cuff that measures your blood pressure automatically through a full day and night, to confirm high blood pressure and see night-time readings." },
    ],
    primary: { label: "Refer a patient", href: "/referral-centre" }, secondary: { label: "Monitoring details", href: "/diagnostics/monitoring" },
    where: `${NE} · ${MM}`,
    related: [{ label: "Why is my heart racing at night?", href: "/health-answers/why-is-my-heart-racing-at-night" }, { label: "What does a Holter show?", href: "/health-answers/what-does-a-holter-monitor-show" }, { label: "Virtual Hypertension Clinic", href: "/hypertension-clinic" }],
  },
  {
    path: "/biological-age-test-calgary", kicker: "Longevity testing · Calgary",
    h1: "Biological age test in Calgary", title: "Biological Age & Longevity Test in Calgary",
    description: `Measure markers linked to aging in Calgary: telomere length (${money(telo?.price ?? 0)}), GDF-15 (${money(gdf?.price ?? 0)}) and inflammation aging panels, with a NEYU Health Longevity Baseline.`,
    answer: `NEYU Health's Longevity Baseline in Calgary measures markers linked to biological aging, including telomere length (${money(telo?.price ?? 0)}), GDF-15 cellular stress (${money(gdf?.price ?? 0)}) and the Advanced Inflammation Aging panel (${money(aia?.price ?? 0)}), with a longevity consultation. Results give you a baseline to re-test against; they're estimates to guide prevention, not a diagnosis.`,
    about: { type: "MedicalTest", name: "Biological aging biomarkers" },
    highlights: [{ v: String(longevity.labs.length), l: "aging biomarker tests" }, { v: money(pkgLabTotal(longevity)), l: "lab list price total" }, { v: "1", l: "baseline to re-test" }],
    itemsTitle: "What's measured", itemsNote: "BioAro Labs list prices. The team confirms the full Longevity Baseline price with you.",
    items: [
      ...longevity.clinic.map((c) => ({ name: c, text: "At NEYU Health in Calgary.", meta: "Clinic" })),
      ...longevity.labs.map((l) => ({ name: l.name, text: lab(l.slug)?.why || "", price: money(l.price), meta: lab(l.slug) ? tat(lab(l.slug)!) : undefined })),
    ],
    steps: [
      { t: "Consultation", d: "Your goals, history, body and blood pressure assessment." },
      { t: "Blood tests", d: "Aging biomarkers collected at the clinic or at home." },
      { t: "Your baseline", d: "Results in My Health Space, explained by Neyu." },
      { t: "Re-test", d: "Track how your markers change with your plan." },
    ],
    faq: [
      { q: "Can you test your biological age?", a: "No single test gives an exact biological age. A panel of markers such as inflammation, GDF-15 and telomere length gives an estimate you can track over time." },
      { q: "How much does a longevity test cost in Calgary?", a: `Telomere length testing is ${money(telo?.price ?? 0)}, GDF-15 is ${money(gdf?.price ?? 0)} and Advanced Inflammation Aging is ${money(aia?.price ?? 0)} (BioAro Labs list prices).` },
      { q: "Can I improve my results?", a: "Markers linked to aging can improve with activity, sleep, diet and not smoking. Re-testing shows your progress." },
      { q: "Is this a diagnosis?", a: "No. It's an estimate to guide prevention, reviewed with your clinician." },
    ],
    primary: { label: "Request a Longevity Baseline", href: "/packages" }, secondary: { label: "Explore the Longevity Lab", href: "/longevity-lab" },
    where: `${NE} · ${MM}`,
    related: [{ label: "What is biological age?", href: "/health-answers/what-is-biological-age" }, { label: "DNA testing", href: "/dna-test-calgary" }, { label: "Executive health check", href: "/executive-health-check-calgary" }],
  },
];

export const landingByPath = (path: string) => LANDINGS.find((l) => l.path === path);
