import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { NeyuPage } from "@/components/neyu/kit";
import { Membership } from "@/components/neyu/services";

export const metadata: Metadata = seo("/membership");
function Page() { return <NeyuPage><Membership /></NeyuPage>; }

export default function SeoPage() {
  return <><PageSchema path="/membership" /><Page /></>;
}
