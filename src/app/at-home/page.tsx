import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { NeyuPage } from "@/components/neyu/kit";
import { AtHome } from "@/components/neyu/services";

export const metadata: Metadata = seo("/at-home");
function Page() { return <NeyuPage><AtHome /></NeyuPage>; }

export default function SeoPage() {
  return <><PageSchema path="/at-home" /><Page /></>;
}
