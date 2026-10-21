import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { NeyuPage } from "@/components/neyu/kit";
import { Explore } from "@/components/neyu/services";

export const metadata: Metadata = seo("/explore");
function Page() { return <NeyuPage><Explore /></NeyuPage>; }

export default function SeoPage() {
  return <><PageSchema path="/explore" /><Page /></>;
}
