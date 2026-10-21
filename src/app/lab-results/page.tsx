import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { NeyuPage } from "@/components/neyu/kit";
import { LabResults } from "@/components/neyu/pages/AiTools";

export const metadata: Metadata = seo("/lab-results");

function Page() {
  return <NeyuPage><LabResults /></NeyuPage>;
}

export default function SeoPage() {
  return <><PageSchema path="/lab-results" /><Page /></>;
}
