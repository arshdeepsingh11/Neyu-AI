import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { NeyuPage } from "@/components/neyu/kit";
import { LongevityHub } from "@/components/neyu/pillars";

// Longevity pillar: Assess → Understand → Personalize → Improve. The healthy-aging
// assessment, Longevity Lab, Nutrition Starter Plan and longevity score live here.
export const metadata: Metadata = seo("/longevity");
function LongevityPage() { return <NeyuPage><LongevityHub /></NeyuPage>; }

export default function SeoPage() {
  return <><PageSchema path="/longevity" /><LongevityPage /></>;
}
