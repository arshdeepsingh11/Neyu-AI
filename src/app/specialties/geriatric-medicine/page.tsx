import SpecialtyExperience from "@/components/specialty/SpecialtyExperience";
import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";

export const metadata: Metadata = seo("/specialties/geriatric-medicine");

// Tabbed, AI-assisted specialty page — content and tools in src/data/specialtyStudio.ts.
function GeriatricMedicinePage() {
  return <SpecialtyExperience slug="geriatric-medicine" />;
}

export default function SeoPage() {
  return <><PageSchema path="/specialties/geriatric-medicine" /><GeriatricMedicinePage /></>;
}
