import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { NeyuPage } from "@/components/neyu/kit";
import { Packages } from "@/components/neyu/services";

export const metadata: Metadata = seo("/packages");
function Page() { return <NeyuPage><Packages /></NeyuPage>; }

export default function SeoPage() {
  return <><PageSchema path="/packages" /><Page /></>;
}
