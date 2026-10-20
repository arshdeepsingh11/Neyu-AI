// Page-level JSON-LD (server component): breadcrumbs, what the page is about and
// question/answer pairs built only from facts already on the site. Answer engines
// (Google AI Overviews, ChatGPT, Perplexity, Gemini) quote these directly.
import { PAGES, abs } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { STUDIO } from "@/data/specialtyStudio";
import { diagnosticContent } from "@/data/diagnosticContent";
import { physicians } from "@/data/physicians";

type QA = { q: string; a: string };

const SPECIALTY_TYPE: Record<string, string> = {
  cardiology: "Cardiovascular", "heart-failure-clinic": "Cardiovascular", "internal-medicine": "InternalMedicine", endocrinology: "Endocrine",
  "geriatric-medicine": "Geriatric", "pediatric-rheumatology": "Rheumatologic", nutrition: "DietNutrition", "respiratory-medicine": "Pulmonary",
  "precision-medicine": "Genetic", "skin-health": "Dermatology",
};

function breadcrumbs(path: string) {
  const parts = path.split("/").filter(Boolean);
  const items = [{ name: "Home", url: SITE_URL }];
  let acc = "";
  for (const p of parts) { acc += "/" + p; items.push({ name: PAGES[acc]?.crumb || p, url: abs(acc) }); }
  return { "@type": "BreadcrumbList", itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })) };
}

function list(xs: string[]) { return xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`; }

export function pageFacts(path: string): { about?: object; faq: QA[]; extra: object[] } {
  const slug = path.split("/").pop() || "";
  const faq: QA[] = [];
  const extra: object[] = [];
  let about: object | undefined;

  if (path.startsWith("/specialties/") && STUDIO[slug]) {
    const s = STUDIO[slug];
    about = { "@type": "MedicalSpecialty", name: s.label };
    if (s.whenToSee) faq.push({ q: `When should I see a ${s.label.toLowerCase()} specialist?`, a: s.whenToSee });
    if (s.conditions?.length) faq.push({ q: `What does NEYU Health's ${s.label} team help with?`, a: `${s.label} at NEYU Health in Calgary helps with ${list(s.conditions.slice(0, 8)).toLowerCase()}.` });
    const docs = physicians.filter((d) => (s.disciplines || []).some((x) => d.disciplines.includes(x)));
    if (docs.length) extra.push({ "@type": "ItemList", name: `${s.label} physicians at NEYU Health`, itemListElement: docs.map((d, i) => ({ "@type": "ListItem", position: i + 1, item: physician(d) })) });
  }
  if (path.startsWith("/diagnostics/") && diagnosticContent[slug]) {
    const d = diagnosticContent[slug];
    about = { "@type": "MedicalTest", name: d.label, description: d.overview };
    faq.push({ q: `What is ${d.label.toLowerCase()} used for?`, a: d.overview });
    for (const t of d.tests) {
      if (t.duration) faq.push({ q: `How long does a ${t.name.replace(/\s*\(.*\)/, "")} take?`, a: `About ${t.duration} at NEYU Health in Calgary.` });
      if (t.prep?.length) faq.push({ q: `How do I prepare for a ${t.name.replace(/\s*\(.*\)/, "")}?`, a: t.prep.join(". ") + "." });
    }
  }
  if (path === "/physicians") {
    extra.push({ "@type": "ItemList", name: "NEYU Health physicians", itemListElement: physicians.map((d, i) => ({ "@type": "ListItem", position: i + 1, item: physician(d) })) });
  }
  return { about, faq, extra };
}

function physician(d: (typeof physicians)[number]) {
  return {
    "@type": "Physician", name: d.name, url: `${SITE_URL}/physicians`, jobTitle: d.title, knowsLanguage: d.languages,
    medicalSpecialty: d.disciplines, address: { "@type": "PostalAddress", streetAddress: d.address, addressLocality: "Calgary", addressRegion: "AB", addressCountry: "CA" },
    telephone: d.phone, worksFor: { "@id": `${SITE_URL}/#org` },
  };
}

export default function PageSchema({ path }: { path: string }) {
  const p = PAGES[path];
  if (!p || p.noindex) return null;
  const url = abs(path);
  const { about, faq, extra } = pageFacts(path);
  const specialty = SPECIALTY_TYPE[path.split("/").pop() || ""];
  const page: Record<string, unknown> = {
    "@type": p.kind === "legal" ? "WebPage" : p.kind === "contact" ? "ContactPage" : p.kind === "about" ? "AboutPage" : p.kind === "collection" ? "CollectionPage" : "MedicalWebPage",
    "@id": `${url}#page`, url, name: p.title, description: p.description, inLanguage: "en-CA",
    isPartOf: { "@id": `${SITE_URL}/#website` }, publisher: { "@id": `${SITE_URL}/#org` }, breadcrumb: breadcrumbs(path),
    ...(about ? { about } : {}), ...(specialty && path.startsWith("/specialties/") ? { specialty } : {}),
    ...(p.kind === "tool" ? { audience: { "@type": "PeopleAudience", geographicArea: { "@type": "AdministrativeArea", name: "Alberta" } } } : {}),
  };
  const graph: object[] = [page, ...extra];
  if (faq.length) graph.push({ "@type": "FAQPage", "@id": `${url}#faq`, mainEntity: faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) });
  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
