import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { NeyuPage } from "@/components/neyu/kit";
import PhysiciansPage from "@/components/neyu/pages/Physicians";

export const metadata: Metadata = seo("/physicians");

function Page() {
  return <NeyuPage><PhysiciansPage /></NeyuPage>;
}

export default function SeoPage() {
  return <><PageSchema path="/physicians" /><Page /></>;
}
