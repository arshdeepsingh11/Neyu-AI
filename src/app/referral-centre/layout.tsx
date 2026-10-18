import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import PageSchema from "@/components/PageSchema";

export const metadata: Metadata = seo("/referral-centre");
export default function Layout({ children }: { children: React.ReactNode }) { return <><PageSchema path="/referral-centre" />{children}</>; }
