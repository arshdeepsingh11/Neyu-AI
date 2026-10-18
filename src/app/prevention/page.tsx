import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { NeyuPage } from "@/components/neyu/kit";
import { PreventionHub } from "@/components/neyu/pillars";

export const metadata: Metadata = seo("/prevention");
function PreventionPage() { return <NeyuPage><PreventionHub /></NeyuPage>; }

export default function SeoPage() {
  return <><PageSchema path="/prevention" /><PreventionPage /></>;
}
