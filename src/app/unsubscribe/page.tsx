// /unsubscribe?t=TOKEN — email preferences without signing in (link in every reminder / news email).
import type { Metadata } from "next";
import Unsubscribe from "./Unsubscribe";

export const metadata: Metadata = { title: "Email preferences — NEYU Health", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  return <Unsubscribe token={((await searchParams).t || "").slice(0, 80)} />;
}
