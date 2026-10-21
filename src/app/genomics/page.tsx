import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { NeyuPage } from "@/components/neyu/kit";
import GenomicsPage from "@/components/neyu/pages/Genomics";

export const metadata: Metadata = seo("/genomics");

function Page() {
  return <NeyuPage><GenomicsPage /></NeyuPage>;
}

export default function SeoPage() {
  return <><PageSchema path="/genomics" /><Page /></>;
}
