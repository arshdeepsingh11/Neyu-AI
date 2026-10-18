// /specialties/skin-health — Nea Precision Skin, NEYU's aesthetics & skin partner.
import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import NeaPage from "@/components/nea/NeaPage";

export const metadata: Metadata = seo("/specialties/skin-health");

function SkinHealthPage() {
  return <NeaPage />;
}

export default function SeoPage() {
  return <><PageSchema path="/specialties/skin-health" /><SkinHealthPage /></>;
}
