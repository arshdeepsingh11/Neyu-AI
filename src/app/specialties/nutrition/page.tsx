import SpecialtyExperience from "@/components/specialty/SpecialtyExperience";
import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";

export const metadata: Metadata = seo("/specialties/nutrition");

// Tabbed, AI-assisted specialty page — content and tools in src/data/specialtyStudio.ts.
function NutritionPage() {
  return <SpecialtyExperience slug="nutrition" />;
}

export default function SeoPage() {
  return <><PageSchema path="/specialties/nutrition" /><NutritionPage /></>;
}
