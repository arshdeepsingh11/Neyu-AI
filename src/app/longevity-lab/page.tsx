import LongevityLab from "@/components/lab/LongevityLab";
import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";

export const metadata: Metadata = seo("/longevity-lab");

// Content: src/data/longevityScience.ts · components: src/components/lab/*
function LongevityLabPage() {
  return <LongevityLab />;
}

export default function SeoPage() {
  return <><PageSchema path="/longevity-lab" /><LongevityLabPage /></>;
}
