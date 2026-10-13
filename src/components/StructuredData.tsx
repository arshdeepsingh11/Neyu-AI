// Schema.org JSON-LD: tells Google and AI answer engines exactly who NEYU
// Health is, where the clinics are and what they offer (SEO + AEO).
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, CLINICS } from "@/lib/site";

const SPECIALTIES = ["Cardiovascular", "InternalMedicine", "Endocrine", "Geriatric", "Pulmonary", "DietNutrition", "Dermatology", "Rheumatologic"];

export default function StructuredData() {
  const org = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["MedicalOrganization", "Organization"], "@id": `${SITE_URL}/#org`, name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/logo.png`, description: SITE_DESCRIPTION,
        medicalSpecialty: SPECIALTIES, areaServed: { "@type": "AdministrativeArea", name: "Alberta, Canada" },
        department: CLINICS.map((c, i) => ({ "@id": `${SITE_URL}/#clinic-${i + 1}` })),
      },
      ...CLINICS.map((c, i) => ({
        "@type": "MedicalClinic", "@id": `${SITE_URL}/#clinic-${i + 1}`, name: c.name, url: `${SITE_URL}/contact`, telephone: c.phone, parentOrganization: { "@id": `${SITE_URL}/#org` },
        address: { "@type": "PostalAddress", streetAddress: c.street, addressLocality: c.city, addressRegion: c.region, postalCode: c.postal, addressCountry: "CA" },
        geo: { "@type": "GeoCoordinates", latitude: c.lat, longitude: c.lon }, medicalSpecialty: SPECIALTIES, isAcceptingNewPatients: true,
      })),
      { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: SITE_NAME, publisher: { "@id": `${SITE_URL}/#org` }, inLanguage: "en-CA" },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} />;
}
