import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { NeyuPage } from "@/components/neyu/kit";
import AboutPage from "@/components/neyu/pages/About";

export const metadata: Metadata = seo("/about");

function Page() {
  return <NeyuPage><AboutPage /></NeyuPage>;
}

export default function SeoPage() {
  return <><PageSchema path="/about" /><Page /></>;
}
