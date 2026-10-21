import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { NeyuPage } from "@/components/neyu/kit";
import { VirtualCare } from "@/components/neyu/services";

export const metadata: Metadata = seo("/virtual-care");
function Page() { return <NeyuPage><VirtualCare /></NeyuPage>; }

export default function SeoPage() {
  return <><PageSchema path="/virtual-care" /><Page /></>;
}
