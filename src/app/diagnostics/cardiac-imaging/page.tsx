import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { NeyuPage } from "@/components/neyu/kit";
import DiagnosticPage from "@/components/neyu/pages/Diagnostic";

export const metadata: Metadata = seo("/diagnostics/cardiac-imaging");

function Page() {
  return <NeyuPage><DiagnosticPage slug="cardiac-imaging" /></NeyuPage>;
}

export default function SeoPage() {
  return <><PageSchema path="/diagnostics/cardiac-imaging" /><Page /></>;
}
