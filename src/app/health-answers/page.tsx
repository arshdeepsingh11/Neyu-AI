import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { NeyuPage } from "@/components/neyu/kit";
import { HealthAnswersIndex } from "@/components/neyu/pages/SeoPages";

export const metadata: Metadata = seo("/health-answers");

export default function SeoPage() {
  return <><PageSchema path="/health-answers" /><NeyuPage><HealthAnswersIndex /></NeyuPage></>;
}
