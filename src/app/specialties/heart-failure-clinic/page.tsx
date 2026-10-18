import SpecialtyExperience from "@/components/specialty/SpecialtyExperience";
import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";

export const metadata: Metadata = seo("/specialties/heart-failure-clinic");

// Tabbed, AI-assisted specialty page — content and tools in src/data/specialtyStudio.ts.
function HeartFailureClinicPage() {
  return <SpecialtyExperience slug="heart-failure-clinic" />;
}

export default function SeoPage() {
  return <><PageSchema path="/specialties/heart-failure-clinic" /><HeartFailureClinicPage /></>;
}
