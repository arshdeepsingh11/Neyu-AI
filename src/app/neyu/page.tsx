import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import { NeyuPage } from "@/components/neyu/kit";
import { MeetNeyuPage } from "@/components/neyu/services";

export const metadata: Metadata = seo("/neyu");
function Page() { return <NeyuPage><MeetNeyuPage /></NeyuPage>; }

export default function SeoPage() {
  return <><PageSchema path="/neyu" /><Page /></>;
}
