import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { NeyuPage } from "@/components/neyu/kit";
import ServicesPage from "@/components/neyu/pages/Services";

export const metadata: Metadata = seo("/services");

function Page() {
  return <NeyuPage><ServicesPage /></NeyuPage>;
}

export default function SeoPage() {
  return <><PageSchema path="/services" /><Page /></>;
}
