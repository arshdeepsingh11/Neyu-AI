import SpecialtyExperience from "@/components/specialty/SpecialtyExperience";
import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";

export const metadata: Metadata = seo("/specialties/cardiology");

// Tabbed, AI-assisted specialty page — content and tools in src/data/specialtyStudio.ts.
function CardiologyPage() {
  return <SpecialtyExperience slug="cardiology" />;
}

export default function SeoPage() {
  return <><PageSchema path="/specialties/cardiology" /><CardiologyPage /></>;
}
