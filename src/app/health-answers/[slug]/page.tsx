import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { NeyuPage } from "@/components/neyu/kit";
import { HealthAnswerPage } from "@/components/neyu/pages/SeoPages";
import { HEALTH_ANSWERS, haBySlug } from "@/data/healthAnswers";

export const dynamicParams = false;
export function generateStaticParams() {
  return HEALTH_ANSWERS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return haBySlug(slug) ? seo(`/health-answers/${slug}`) : {};
}

export default async function SeoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = haBySlug(slug);
  if (!a) notFound();
  const path = `/health-answers/${slug}`;
  return <><PageSchema path={path} /><NeyuPage><HealthAnswerPage a={a} /></NeyuPage></>;
}
