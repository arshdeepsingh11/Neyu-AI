// SEO / AEO / GEO for every public page — one place for titles, descriptions,
// canonical links, social cards and the facts answer engines (Google, ChatGPT,
// Perplexity, Gemini) quote. Pages call `seo("/path")`; <PageSchema path> adds
// the matching JSON-LD. Only facts already on the site are used — never invent
// prices, hours or claims here.
import type { Metadata } from "next";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export type PageKind = "page" | "specialty" | "test" | "service" | "tool" | "about" | "contact" | "collection" | "legal";

export interface PageSeo {
  title: string;        // ≤ 60 characters, shown in search results
  description: string;  // 120–160 characters
  crumb: string;        // short name used in breadcrumbs
  kind?: PageKind;
  noindex?: boolean;
}

const B = " | NEYU Health";

export const PAGES: Record<string, PageSeo> = {
  "/privacy": { title: "Privacy Policy" + B, crumb: "Privacy Policy", kind: "legal",
    description: "How NEYU Health collects, uses, shares and protects personal and health information on the website, in My Health Space and in the NEYU app." },
  "/terms": { title: "Terms of Use" + B, crumb: "Terms of Use", kind: "legal",
    description: "The terms for using neyuhealth.com, My Health Space, Neyu and the NEYU app: accounts, your data, safe use, emergencies and Alberta law." },
  "/ai-notice": { title: "Neyu AI Notice — How Our AI Works" + B, crumb: "Neyu AI notice", kind: "legal",
    description: "What Neyu, the NEYU Health AI companion, does and doesn't do, what information it uses, its limits and how to turn its access to your records off." },
  "/cookies": { title: "Cookies" + B, crumb: "Cookies", kind: "legal",
    description: "Every cookie NEYU Health uses, what it does and how long it lasts. No advertising cookies or third-party trackers. Turn anonymous statistics off here." },
  "/accessibility": { title: "Accessibility Statement" + B, crumb: "Accessibility", kind: "legal",
    description: "NEYU Health aims to meet WCAG 2.1 AA on its website, My Health Space and app. How we test, known limits, and how to get help or report a barrier." },
  "/": { title: "NEYU Health — Calgary Cardiology & AI-Guided Care", crumb: "Home", kind: "page",
    description: "Calgary cardiology and internal medicine clinic with AI-guided care: heart testing, a virtual hypertension clinic, at-home blood tests and genomics." },
  "/about": { title: "About NEYU Health" + B, crumb: "About", kind: "about",
    description: "The NEYU story: Alberta's first onsite exercise stress echocardiogram program, a multilingual team and the philosophy Listen · Connect · Flourish." },
  "/at-home": { title: "At-Home Blood Collection in Calgary" + B, crumb: "At-home collection", kind: "service",
    description: "A trained collector comes to your home in Calgary. Results flow into your NEYU health record and Neyu explains each value in plain language." },
  "/cardiac-symptoms": { title: "Cardiac Symptoms: What They Can Mean" + B, crumb: "Cardiac symptoms", kind: "page",
    description: "What chest pain, shortness of breath, palpitations, dizziness, fatigue and swelling can mean, when to call 911, and an AI symptom check with Neyu." },
  "/care": { title: "Care at NEYU — Specialists & Virtual Care" + B, crumb: "Care", kind: "collection",
    description: "Connected care around you in Calgary — specialists, virtual care, the Virtual Hypertension Clinic and referrals, all guided by Neyu, your AI health companion." },
  "/careers": { title: "Careers at NEYU Health in Calgary" + B, crumb: "Careers", kind: "page",
    description: "Join NEYU Health — physicians, sonographers and nurses building connected, AI-assisted cardiology and internal medicine care in Calgary, Alberta." },
  "/contact": { title: "Contact NEYU Health — Two Calgary Clinics" + B, crumb: "Contact", kind: "contact",
    description: "Two Calgary clinics — North East and Meadow Miles. Hours, phone, fax, a map with directions to the nearest clinic, and a secure message form." },
  "/diagnostics": { title: "Heart & Lab Diagnostics in Calgary" + B, crumb: "Diagnostics", kind: "collection",
    description: "Diagnostics that connect the dots in Calgary — cardiac imaging, stress testing, monitoring, vascular and lung tests, lab work and genomics, explained by Neyu." },
  "/diagnostics/cardiac-imaging": { title: "Echocardiogram & Cardiac Imaging Calgary" + B, crumb: "Cardiac imaging", kind: "test", description: "" },
  "/diagnostics/monitoring": { title: "Holter & Blood Pressure Monitoring Calgary" + B, crumb: "Monitoring", kind: "test", description: "" },
  "/diagnostics/pulmonary": { title: "Pulmonary Function Testing in Calgary" + B, crumb: "Pulmonary function", kind: "test", description: "" },
  "/diagnostics/stress-testing": { title: "Stress Echo & Stress Testing in Calgary" + B, crumb: "Stress testing", kind: "test", description: "" },
  "/diagnostics/vascular": { title: "Carotid Ultrasound & ABI Testing Calgary" + B, crumb: "Vascular testing", kind: "test", description: "" },
  "/explain-diagnosis": { title: "Explain My Diagnosis — AI Tool" + B, crumb: "Explain My Diagnosis", kind: "tool",
    description: "Type, attach or scan a diagnosis or doctor's note. Neyu explains what it generally means in plain language and suggests questions to ask your doctor." },
  "/explore": { title: "Explore All NEYU Services" + B, crumb: "Explore", kind: "collection",
    description: "Every NEYU Health service, tool and program in one place — care, diagnostics, prevention and longevity — for patients in Calgary and across Alberta." },
  "/genomics": { title: "Genomics & Precision Testing in Calgary" + B, crumb: "Genomics", kind: "service",
    description: "Whole-genome and exome sequencing, pharmacogenomics and advanced biomarker testing with BioAro Labs — real prices, reviewed with a NEYU physician." },
  "/hypertension-clinic": { title: "Virtual Hypertension Clinic in Alberta" + B, crumb: "Hypertension clinic", kind: "service",
    description: "Manage high blood pressure from home with NEYU's Virtual Hypertension Clinic: home readings, coaching from Neyu and regular review by a physician." },
  "/lab-results": { title: "Lab Result Explainer — AI Tool" + B, crumb: "Lab Result Explainer", kind: "tool",
    description: "Paste your lab values or scan a lab report and Neyu explains each result in plain language — what it measures and what to ask your doctor about it." },
  "/longevity-lab": { title: "Longevity Lab — Biological Aging Explained" + B, crumb: "Longevity Lab", kind: "page",
    description: "Research-backed explainers on biological aging — GDF-15, telomeres, pace of aging and longevity genetics — with Neyu, 3D models and BioAro Labs tests." },
  "/longevity": { title: "Longevity & Healthspan Care" + B, crumb: "Longevity", kind: "collection",
    description: "Move from healthcare to healthspan with NEYU Health in Calgary — assess, understand, personalize and improve your long-term health, guided by Neyu." },
  "/membership": { title: "NEYU Membership — Connected Care All Year" + B, crumb: "Membership", kind: "service",
    description: "NEYU Membership: connected care all year with Neyu, virtual visits, the hypertension clinic, at-home blood collection and annual health assessments." },
  "/neyu": { title: "Meet Neyu — Your AI Health Companion" + B, crumb: "Meet Neyu", kind: "page",
    description: "Neyu is NEYU Health's AI health companion — ask health questions, understand lab results, prepare for visits and explore your health in plain language." },
  "/packages": { title: "Private Health Packages in Calgary" + B, crumb: "Health packages", kind: "service",
    description: "Private health packages at NEYU Health: Heart Health Check, Executive Health, Longevity Baseline, Precision Genomics and Metabolic & Hormone panels." },
  "/physicians": { title: "Our Physicians — Cardiologists in Calgary" + B, crumb: "Physicians", kind: "collection",
    description: "Meet NEYU physicians in Calgary — cardiology, internal medicine, endocrinology, pediatrics and rheumatology — with languages spoken and an AI matcher." },
  "/prevention": { title: "Preventive Health & Risk Assessment" + B, crumb: "Prevention", kind: "collection",
    description: "Find health risks early and act earlier — AI risk assessment, private health packages and executive health exams at NEYU Health in Calgary, Alberta." },
  "/referral-centre": { title: "Referral Centre — Refer a Patient" + B, crumb: "Referral Centre", kind: "tool",
    description: "Refer a patient to NEYU Health in Calgary. Scan or upload your referral, choose specialties and exams, and get a ready-to-send letter in minutes." },
  "/resources": { title: "Patient Resources & Test Preparation" + B, crumb: "Resources", kind: "page",
    description: "Test preparation guides, a condition library, new-patient information and free AI tools — Referral Centre, Lab Result Explainer and Explain My Diagnosis." },
  "/services": { title: "Cardiology Clinic Services in Calgary" + B, crumb: "Services", kind: "collection",
    description: "Consultations and onsite tests in Calgary — echo, stress echo, ECG, Holter, ambulatory BP, carotid ultrasound and perfusion imaging, plus clinical research." },
  "/specialties": { title: "Medical Specialties at NEYU Health" + B, crumb: "Specialties", kind: "collection",
    description: "Cardiology, heart failure, internal medicine, endocrinology, geriatrics and pediatric rheumatology in Calgary, plus partner care for lungs, sleep and nutrition." },
  "/specialties/cardiology": { title: "Cardiologist in Calgary — Cardiology" + B, crumb: "Cardiology", kind: "specialty", description: "" },
  "/specialties/endocrinology": { title: "Endocrinologist in Calgary — Endocrinology" + B, crumb: "Endocrinology", kind: "specialty", description: "" },
  "/specialties/geriatric-medicine": { title: "Geriatric Medicine in Calgary" + B, crumb: "Geriatric Medicine", kind: "specialty", description: "" },
  "/specialties/heart-failure-clinic": { title: "Heart Failure Clinic in Calgary" + B, crumb: "Heart Failure Clinic", kind: "specialty", description: "" },
  "/specialties/internal-medicine": { title: "Internal Medicine Specialist in Calgary" + B, crumb: "Internal Medicine", kind: "specialty", description: "" },
  "/specialties/nutrition": { title: "Nutrition & Dietitian Care in Calgary" + B, crumb: "Nutrition", kind: "specialty", description: "" },
  "/specialties/pediatric-rheumatology": { title: "Pediatric Rheumatology in Calgary" + B, crumb: "Pediatric Rheumatology", kind: "specialty", description: "" },
  "/specialties/precision-medicine": { title: "Precision Medicine in Calgary" + B, crumb: "Precision Medicine", kind: "specialty", description: "" },
  "/specialties/respiratory-medicine": { title: "Respiratory & Sleep Medicine in Calgary" + B, crumb: "Respiratory Medicine", kind: "specialty", description: "" },
  "/specialties/skin-health": { title: "Nea Precision Skin — Skin Health Calgary" + B, crumb: "Skin Health", kind: "specialty",
    description: "Medical aesthetics, Fotona laser, injectables, facials and wellness packages at Nea Precision Skin, NEYU Health's partner skin clinic in Calgary NE." },
  "/virtual-care": { title: "Virtual Care — Video Visits in Alberta" + B, crumb: "Virtual care", kind: "service",
    description: "Secure video visits with NEYU Health physicians — prepared by Neyu, connected to your health record and available to patients across Alberta." },
};

// Descriptions for pages built from data (specialties, diagnostics) — written by
// hand so each one is unique and the right length.
const FILLED: Record<string, string> = {
  "/diagnostics/cardiac-imaging": "Echocardiogram and cardiac imaging at NEYU Health in Calgary — how long each test takes, how to prepare and what the pictures show about your heart.",
  "/diagnostics/monitoring": "Holter and ambulatory blood pressure monitoring at NEYU Health in Calgary — how long you wear each monitor, how to prepare and what the results show.",
  "/diagnostics/pulmonary": "Pulmonary function testing in Calgary with the Advanced Respiratory Care Network — what lung tests measure, how long they take and how to prepare.",
  "/diagnostics/stress-testing": "Stress echocardiogram, treadmill and nuclear stress testing in Calgary — how your heart works under exertion, how long tests take and how to prepare.",
  "/diagnostics/vascular": "Carotid ultrasound and ankle-brachial index (ABI) testing in Calgary — checking blood flow in your neck and legs, test length and how to prepare.",
  "/specialties/cardiology": "Cardiology in Calgary at NEYU Health — Alberta's first onsite exercise stress echo program, with echo, Holter, ECG and blood-pressure monitoring.",
  "/specialties/endocrinology": "Endocrinology in Calgary at NEYU Health — care for diabetes, thyroid and hormone conditions, with AI tools and lab tests explained by Neyu.",
  "/specialties/geriatric-medicine": "Geriatric medicine in Calgary at NEYU Health — healthy aging, mobility, memory and medication support for older adults, with tools explained by Neyu.",
  "/specialties/heart-failure-clinic": "NEYU Health's heart failure clinic in Calgary — specialized, ongoing care for people living with heart failure, with monitoring and tools.",
  "/specialties/internal-medicine": "Internal medicine in Calgary at NEYU Health — whole-person care for complex, chronic and multi-system conditions, with connected tests and follow-up.",
  "/specialties/nutrition": "Nutrition care in Calgary with NEYU Health — personalized nutrition coaching built around your health goals, with meal tools guided by Neyu.",
  "/specialties/pediatric-rheumatology": "Pediatric rheumatology in Calgary at NEYU Health — care for autoimmune and inflammatory joint conditions in children and youth, with family tools.",
  "/specialties/precision-medicine": "Precision medicine in Calgary at NEYU Health — genomics, pharmacogenomics and advanced biomarkers to personalize your care with a physician.",
  "/specialties/respiratory-medicine": "Respiratory and sleep medicine in Calgary with the Advanced Respiratory Care Network — care for sleep apnea, snoring, asthma and COPD.",
};
for (const [p, d] of Object.entries(FILLED)) if (PAGES[p]) PAGES[p].description = d;

export const abs = (path: string) => (path === "/" ? SITE_URL : SITE_URL + path);

/** Full Next.js metadata for a public page: title, description, canonical, social cards. */
export function seo(path: string, extra: Partial<Metadata> = {}): Metadata {
  const p = PAGES[path];
  if (!p) throw new Error(`seo(): no entry for ${path} in src/lib/seo.ts`);
  const url = abs(path);
  const image = { url: "/og.png", width: 1200, height: 630, alt: p.title };
  return {
    title: p.title,
    description: p.description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: SITE_NAME, locale: "en_CA", url, title: p.title, description: p.description, images: [image] },
    twitter: { card: "summary_large_image", title: p.title, description: p.description, images: ["/og.png"] },
    ...(p.noindex ? { robots: { index: false, follow: false } } : {}),
    ...extra,
  };
}
