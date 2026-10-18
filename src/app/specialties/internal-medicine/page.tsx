import SpecialtyExperience from "@/components/specialty/SpecialtyExperience";
import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";

export const metadata: Metadata = seo("/specialties/internal-medicine");

// Tabbed, AI-assisted specialty page — content and tools in src/data/specialtyStudio.ts.
function InternalMedicinePage() {
  return <SpecialtyExperience slug="internal-medicine" />;
}

export default function SeoPage() {
  return <><PageSchema path="/specialties/internal-medicine" /><InternalMedicinePage /></>;
}
