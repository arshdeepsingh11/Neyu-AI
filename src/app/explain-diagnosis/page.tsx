import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { NeyuPage } from "@/components/neyu/kit";
import { ExplainDiagnosis } from "@/components/neyu/pages/AiTools";

export const metadata: Metadata = seo("/explain-diagnosis");

function Page() {
  return <NeyuPage><ExplainDiagnosis /></NeyuPage>;
}

export default function SeoPage() {
  return <><PageSchema path="/explain-diagnosis" /><Page /></>;
}
