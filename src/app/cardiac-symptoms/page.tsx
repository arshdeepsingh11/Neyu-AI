import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { NeyuPage } from "@/components/neyu/kit";
import SymptomsPage from "@/components/neyu/pages/Symptoms";

export const metadata: Metadata = seo("/cardiac-symptoms");

function Page() {
  return <NeyuPage><SymptomsPage /></NeyuPage>;
}

export default function SeoPage() {
  return <><PageSchema path="/cardiac-symptoms" /><Page /></>;
}
