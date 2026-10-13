// Public site identity — one place for the domain and clinic facts used by
// metadata, sitemap, structured data and llms.txt. Set NEXT_PUBLIC_SITE_URL
// in .env for other hosts (staging); production is neyuhealth.com.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://neyuhealth.com").replace(/\/+$/, "");
export const SITE_NAME = "NEYU Health";
export const SITE_TAGLINE = "Your health. Reimagined.";
export const SITE_DESCRIPTION = "NEYU Health is a Calgary cardiology and internal medicine clinic with AI-guided care: heart testing, a virtual hypertension clinic, at-home blood collection, longevity and genomics — and My Health Space, one private place for your entire health record.";

// Public, indexable pages (portal, admin, API and share links are excluded).
export const PUBLIC_ROUTES: { path: string; priority: number; freq: "weekly" | "monthly" }[] = [
  { path: "", priority: 1, freq: "weekly" },
  ...["care", "diagnostics", "specialties", "physicians", "prevention", "longevity", "virtual-care", "hypertension-clinic", "at-home", "packages", "membership", "referral-centre"].map((p) => ({ path: p, priority: 0.9, freq: "weekly" as const })),
  ...["diagnostics/cardiac-imaging", "diagnostics/monitoring", "diagnostics/pulmonary", "diagnostics/stress-testing", "diagnostics/vascular",
    "specialties/cardiology", "specialties/heart-failure-clinic", "specialties/internal-medicine", "specialties/endocrinology", "specialties/geriatric-medicine", "specialties/pediatric-rheumatology", "specialties/respiratory-medicine", "specialties/nutrition", "specialties/precision-medicine", "specialties/skin-health",
    "cardiac-symptoms", "genomics", "longevity-lab", "lab-results", "explain-diagnosis", "neyu", "services", "explore"].map((p) => ({ path: p, priority: 0.8, freq: "monthly" as const })),
  ...["about", "careers", "resources", "contact"].map((p) => ({ path: p, priority: 0.6, freq: "monthly" as const })),
];

export const CLINICS = [
  { name: "NEYU Health — North East", street: "201 – 3151 27 St NE", city: "Calgary", region: "AB", postal: "T1Y 0B4", phone: "+1-403-475-4475", lat: 51.0788, lon: -113.9962 },
  { name: "NEYU Health — Meadow Miles", street: "250 – 8500 Blackfoot Trail SE", city: "Calgary", region: "AB", postal: "T2J 7E1", phone: "+1-403-879-7911", lat: 50.9772, lon: -114.0478 },
];
