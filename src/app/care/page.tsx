import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { NeyuPage } from "@/components/neyu/kit";
import { CareHub } from "@/components/neyu/pillars";

export const metadata: Metadata = seo("/care");
function CarePage() { return <NeyuPage><CareHub /></NeyuPage>; }

export default function SeoPage() {
  return <><PageSchema path="/care" /><CarePage /></>;
}
