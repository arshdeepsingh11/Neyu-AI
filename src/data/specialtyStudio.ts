// Config for the redesigned specialty pages (shared SpecialtyExperience).
// Page text comes from specialtyContent / content.ts / respiratory.ts;
// this file adds the look (accent, video), the interactive tools, the
// related BioAro Labs tests and Neyu prompts for each specialty.

import { specialtyContent } from "./specialtyContent";
import { services, cardiacSymptoms } from "./content";
import { ARC, RESP_ITEMS } from "./respiratory";

export type ToolKey = "bp" | "hrzones" | "nyha" | "weight" | "bmi" | "a1c" | "falls" | "jia" | "plate" | "tests" | "stopbang" | "ahi" | "symptoms-cardio" | "symptoms-resp";

export interface CareItem { name: string; desc: string; icon: string; group?: string }
export interface StudioConfig {
  slug: string;
  label: string;
  icon: string;                  // Phosphor
  accent: [string, string];      // gradient
  morph: string[];               // rotating hero words
  tagline: string;
  overview: string[];
  video?: { kind: "mp4"; src: string; poster?: string } | { kind: "youtube"; id: string };
  heroLine?: string;             // line over the video
  care: CareItem[];              // services / what we treat
  conditions: string[];
  whenToSee?: string;
  tools: ToolKey[];
  tests: string[];               // BioAro Labs slugs
  disciplines: string[];         // physicians filter
  physicianNote?: string;
  partner?: { name: string; phone: string; tel: string; site: string; note: string };
  ask: string[];                 // Neyu quick questions
}

const sc = specialtyContent;
const conditionCare = (xs: string[], icon: string): CareItem[] => xs.map((x) => ({ name: x.split(" (")[0], desc: x, icon }));

const CARDIAC_SLUGS = ["cardiology-consultation", "exercise-stress-echo", "ecg", "holter-monitoring", "echocardiography", "carotid-ultrasound", "myocardial-perfusion-imaging", "ambulatory-bp-monitoring"];
const ICON: Record<string, string> = { "cardiology-consultation": "ph-stethoscope", "exercise-stress-echo": "ph-person-simple-run", ecg: "ph-wave-sine", "holter-monitoring": "ph-watch", echocardiography: "ph-heart", "carotid-ultrasound": "ph-waveform", "myocardial-perfusion-imaging": "ph-scan", "ambulatory-bp-monitoring": "ph-gauge" };

export const STUDIO: Record<string, StudioConfig> = {
  cardiology: {
    slug: "cardiology", label: "Cardiology", icon: "heart", accent: ["#1FA7B4", "#2273D6"],
    morph: ["your heart.", "your rhythm.", "your pressure.", "your future."],
    tagline: "Advanced heart care in Calgary — home of Alberta’s first onsite exercise stress echocardiogram program.",
    overview: ["NEYU Health combines specialist physicians, advanced diagnostics, genomics, artificial intelligence and preventive medicine to deliver personalized heart care for every stage of life.", "From a first consultation to stress echo, Holter and ambulatory blood-pressure monitoring, testing and follow-up happen under one roof."],
    video: { kind: "mp4", src: "/videos/cardiology-hero.mp4", poster: "/videos/cardiology-hero.jpg" }, heroLine: "Healthcare designed around you",
    care: services.filter((s) => CARDIAC_SLUGS.includes(s.slug)).map((s) => ({ name: s.name, desc: s.long || s.short, icon: ICON[s.slug] || "ph-heartbeat", group: "Diagnostics & care" })),
    conditions: cardiacSymptoms.map((s) => s.name),
    whenToSee: "Chest discomfort, palpitations, shortness of breath, fainting, swelling or high blood pressure are all reasons to ask your doctor for a cardiology referral. Sudden or severe symptoms: call 911.",
    tools: ["symptoms-cardio", "bp", "hrzones"],
    tests: ["high-sensitive-crp-hs-crp", "gdf-15", "pai-1-total", "core-inflammation-aging", "advanced-inflammation-aging", "pharmacogenomics-test"],
    disciplines: ["Cardiology"],
    ask: ["What is an exercise stress echo?", "How do I prepare for a Holter monitor?", "What does high blood pressure do to the heart?", "Which heart tests does NEYU offer?"],
  },
  "heart-failure-clinic": {
    slug: "heart-failure-clinic", label: sc["heart-failure-clinic"].label, icon: "heartPulse", accent: ["#1FA7B4", "#2273D6"],
    morph: ["every day.", "your energy.", "your breath.", "staying home."],
    tagline: sc["heart-failure-clinic"].tagline, overview: sc["heart-failure-clinic"].overview,
    care: conditionCare(sc["heart-failure-clinic"].conditionsTreated, "ph-heart-break"), conditions: sc["heart-failure-clinic"].conditionsTreated, whenToSee: sc["heart-failure-clinic"].whenToSee,
    tools: ["nyha", "weight"], tests: ["high-sensitive-crp-hs-crp", "gdf-15", "cystatin-c", "timp-1"],
    disciplines: sc["heart-failure-clinic"].physicianDisciplines || [], physicianNote: sc["heart-failure-clinic"].physicianNote,
    ask: ["What is heart failure with preserved ejection fraction?", "Why track my weight every day?", "What do the NYHA classes mean?", "How is heart failure followed at NEYU?"],
  },
  "internal-medicine": {
    slug: "internal-medicine", label: sc["internal-medicine"].label, icon: "stethoscope", accent: ["#1FA7B4", "#2273D6"],
    morph: ["the whole picture.", "complex care.", "clear answers.", "you."],
    tagline: sc["internal-medicine"].tagline, overview: sc["internal-medicine"].overview,
    care: conditionCare(sc["internal-medicine"].conditionsTreated, "ph-stethoscope"), conditions: sc["internal-medicine"].conditionsTreated, whenToSee: sc["internal-medicine"].whenToSee,
    tools: ["bmi", "bp"], tests: ["essential-vitamin-health", "vitamin-d2-d3", "cystatin-c", "high-sensitive-crp-hs-crp", "core-inflammation-aging"],
    disciplines: sc["internal-medicine"].physicianDisciplines || [],
    ask: ["What does an internist do?", "What is a pre-operative assessment?", "How are blood pressure and diabetes connected?", "When should I see internal medicine?"],
  },
  endocrinology: {
    slug: "endocrinology", label: sc.endocrinology.label, icon: "thyroid", accent: ["#1FA7B4", "#2273D6"],
    morph: ["your hormones.", "your sugar.", "your thyroid.", "your balance."],
    tagline: sc.endocrinology.tagline, overview: sc.endocrinology.overview,
    care: conditionCare(sc.endocrinology.conditionsTreated, "ph-drop-half"), conditions: sc.endocrinology.conditionsTreated, whenToSee: sc.endocrinology.whenToSee,
    tools: ["a1c"], tests: ["hormone-health", "ultra-hormone-health", "cortisol", "testosterone", "estradiol-e2", "shbg-sex-hormone-binding-globulin", "vitamin-d2-d3"],
    disciplines: sc.endocrinology.physicianDisciplines || [],
    ask: ["What does my HbA1c mean?", "What is prediabetes?", "What are common signs of thyroid problems?", "Which hormone tests are available?"],
  },
  "geriatric-medicine": {
    slug: "geriatric-medicine", label: sc["geriatric-medicine"].label, icon: "elder", accent: ["#1FA7B4", "#2273D6"],
    morph: ["independence.", "your memory.", "steady steps.", "every year."],
    tagline: sc["geriatric-medicine"].tagline, overview: sc["geriatric-medicine"].overview,
    care: conditionCare(sc["geriatric-medicine"].conditionsTreated, "ph-users"), conditions: sc["geriatric-medicine"].conditionsTreated, whenToSee: sc["geriatric-medicine"].whenToSee,
    tools: ["falls"], tests: ["brain-health", "p-tau-217", "beta-amyloid-40-42", "vitamin-d2-d3", "telomere-length-testing"],
    disciplines: sc["geriatric-medicine"].physicianDisciplines || [], physicianNote: sc["geriatric-medicine"].physicianNote,
    ask: ["How can falls be prevented?", "What is a comprehensive geriatric assessment?", "What memory changes are normal with age?", "What is polypharmacy?"],
  },
  "pediatric-rheumatology": {
    slug: "pediatric-rheumatology", label: sc["pediatric-rheumatology"].label, icon: "child", accent: ["#1FA7B4", "#2273D6"],
    morph: ["your child.", "their joints.", "playtime.", "growing up."],
    tagline: sc["pediatric-rheumatology"].tagline, overview: sc["pediatric-rheumatology"].overview,
    care: conditionCare(sc["pediatric-rheumatology"].conditionsTreated, "ph-baby"), conditions: sc["pediatric-rheumatology"].conditionsTreated, whenToSee: sc["pediatric-rheumatology"].whenToSee,
    tools: ["jia"], tests: [],
    disciplines: sc["pediatric-rheumatology"].physicianDisciplines || [], physicianNote: sc["pediatric-rheumatology"].physicianNote,
    ask: ["What is juvenile idiopathic arthritis?", "When should a child's joint pain be checked?", "What happens at a pediatric rheumatology visit?", "Can kids outgrow arthritis?"],
  },
  nutrition: {
    slug: "nutrition", label: sc.nutrition.label, icon: "apple", accent: ["#1FA7B4", "#2273D6"],
    morph: ["your plate.", "your energy.", "your gut.", "your goals."],
    tagline: sc.nutrition.tagline, overview: sc.nutrition.overview,
    care: conditionCare(sc.nutrition.conditionsTreated, "ph-carrot"), conditions: sc.nutrition.conditionsTreated, whenToSee: sc.nutrition.whenToSee,
    tools: ["plate", "bmi"], tests: ["the-biogut-test", "essential-vitamin-health", "vitamin-d2-d3", "vitamin-a-retinol", "vitamin-k1"],
    disciplines: sc.nutrition.physicianDisciplines || [],
    ask: ["How much fibre should I eat?", "What does a balanced plate look like?", "What is a gut microbiome test?", "How can I lower cholesterol with food?"],
  },
  "precision-medicine": {
    slug: "precision-medicine", label: sc["precision-medicine"].label, icon: "dna", accent: ["#1FA7B4", "#2273D6"],
    morph: ["your DNA.", "your biology.", "your risk.", "you."],
    tagline: sc["precision-medicine"].tagline, overview: sc["precision-medicine"].overview,
    care: conditionCare(sc["precision-medicine"].conditionsTreated, "ph-dna"), conditions: sc["precision-medicine"].conditionsTreated, whenToSee: sc["precision-medicine"].whenToSee,
    tools: ["tests"], tests: ["whole-genome-sequencing-30x", "genome-testing", "whole-exome-sequencing-100x", "disease-based-dna-test", "pharmacogenomics-test", "telomere-length-testing", "comprehensive-cell-free-dna-analysis"],
    disciplines: sc["precision-medicine"].physicianDisciplines || [], physicianNote: sc["precision-medicine"].physicianNote,
    ask: ["What is pharmacogenomics?", "Genome vs exome sequencing — what's the difference?", "What can a DNA test tell me about heart risk?", "How are genetic results used in care?"],
  },
  "respiratory-medicine": {
    slug: "respiratory-medicine", label: "Respiratory Medicine", icon: "lungs", accent: ["#1FA7B4", "#2273D6"],
    morph: ["every breath.", "better sleep.", "your lungs.", "living better."],
    tagline: "Sleep well. Breathe easy. Live better — with the Advanced Respiratory Care Network.",
    overview: [ARC.about, ARC.promise],
    video: { kind: "youtube", id: ARC.video }, heroLine: "Sleep well. Breathe easy. Live better.",
    care: RESP_ITEMS.map((i) => ({ name: i.name, desc: i.desc, icon: i.icon, group: i.group })),
    conditions: ["Obstructive sleep apnea", "Snoring and daytime sleepiness", "Asthma", "COPD", "Allergies affecting breathing", "Home oxygen needs"],
    whenToSee: "Loud snoring, gasping at night, daytime sleepiness, ongoing cough, wheeze or breathlessness are reasons to ask your family doctor for a referral. Severe trouble breathing: call 911.",
    tools: ["symptoms-resp", "stopbang", "ahi"], tests: [],
    disciplines: [],
    partner: { name: ARC.name, phone: ARC.phone, tel: ARC.tel, site: ARC.site, note: ARC.area },
    ask: ["What happens in a home sleep study?", "What is CPAP?", "Is snoring always sleep apnea?", "What does a pulmonary function test measure?"],
  },
};
