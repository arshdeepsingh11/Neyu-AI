import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { NeyuPage } from "@/components/neyu/kit";
import CareersPage from "@/components/neyu/pages/Careers";

export const metadata: Metadata = seo("/careers");

function Page() {
  return <NeyuPage><CareersPage /></NeyuPage>;
}

export default function SeoPage() {
  return <><PageSchema path="/careers" /><Page /></>;
}
