import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { NeyuPage } from "@/components/neyu/kit";
import ResourcesPage from "@/components/neyu/pages/Resources";

export const metadata: Metadata = seo("/resources");

function Page() {
  return <NeyuPage><ResourcesPage /></NeyuPage>;
}

export default function SeoPage() {
  return <><PageSchema path="/resources" /><Page /></>;
}
