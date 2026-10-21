// Home — server wrapper so the page gets its own title, description, canonical and
// JSON-LD; the interactive body lives in HomeClient.tsx.
import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";
import HomeClient from "./HomeClient";

export const metadata: Metadata = seo("/");

export default function Home() {
  return <><PageSchema path="/" /><HomeClient /></>;
}
