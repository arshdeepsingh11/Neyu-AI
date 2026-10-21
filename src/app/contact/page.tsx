import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { NeyuPage } from "@/components/neyu/kit";
import ContactPage from "@/components/neyu/pages/Contact";

export const metadata: Metadata = seo("/contact");

function Page() {
  return <NeyuPage><ContactPage /></NeyuPage>;
}

export default function SeoPage() {
  return <><PageSchema path="/contact" /><Page /></>;
}
