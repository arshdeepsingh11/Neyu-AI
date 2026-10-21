import type { Metadata } from "next";

// App launch screen for the phone app — not a page for search engines.
export const metadata: Metadata = { title: "NEYU Health", robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
