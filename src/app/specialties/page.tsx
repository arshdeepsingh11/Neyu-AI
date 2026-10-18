import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { NeyuPage } from "@/components/neyu/kit";
import SpecialtiesPage from "@/components/neyu/pages/Specialties";

export const metadata: Metadata = seo("/specialties");

function Page() {
  return <NeyuPage><SpecialtiesPage /></NeyuPage>;
}

export default function SeoPage() {
  return <><PageSchema path="/specialties" /><Page /></>;
}
