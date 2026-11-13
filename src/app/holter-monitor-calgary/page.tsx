import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { NeyuPage } from "@/components/neyu/kit";
import { LandingPage } from "@/components/neyu/pages/SeoPages";
import { landingByPath } from "@/data/seoLanding";

const PATH = "/holter-monitor-calgary";
export const metadata: Metadata = seo(PATH);

export default function SeoPage() {
  const d = landingByPath(PATH);
  if (!d) notFound();
  return <><PageSchema path={PATH} /><NeyuPage><LandingPage d={d} /></NeyuPage></>;
}
