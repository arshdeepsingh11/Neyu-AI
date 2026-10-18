import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { NeyuPage } from "@/components/neyu/kit";
import { DiagnosticsHub } from "@/components/neyu/pillars";

export const metadata: Metadata = seo("/diagnostics");
function DiagnosticsPage() { return <NeyuPage><DiagnosticsHub /></NeyuPage>; }

export default function SeoPage() {
  return <><PageSchema path="/diagnostics" /><DiagnosticsPage /></>;
}
