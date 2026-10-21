import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { NeyuPage } from "@/components/neyu/kit";
import { HypertensionClinic } from "@/components/neyu/services";

export const metadata: Metadata = seo("/hypertension-clinic");
function Page() { return <NeyuPage><HypertensionClinic /></NeyuPage>; }

export default function SeoPage() {
  return <><PageSchema path="/hypertension-clinic" /><Page /></>;
}
