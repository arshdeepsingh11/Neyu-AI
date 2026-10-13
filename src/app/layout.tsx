import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "@phosphor-icons/web/regular";
import "@phosphor-icons/web/fill";
import "./globals.css";
import "./anra.css";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { AlbaProvider } from "@/components/AlbaContext";
import { RegionProvider } from "@/components/RegionContext";
import NavChrome from "@/components/NavChrome";
import Footer from "@/components/Footer";
import AlbaWidget from "@/components/AlbaWidget";
import AlbaFactPopup from "@/components/AlbaFactPopup";
import EmergencyOverlay from "@/components/EmergencyOverlay";
import MotionElements from "@/components/MotionElements";
import PageVisitTracker from "@/components/PageVisitTracker";
import { cn } from "@/lib/utils";
import StructuredData from "@/components/StructuredData";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

// DM Sans powers body and display text (Glacier / NEYU design system).
// 300 is included for the design's light weights.
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"], variable: "--font-dm-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "NEYU Health — Cardiology, Internal Medicine & AI-Guided Care in Calgary", template: "%s" },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["Calgary cardiologist", "cardiology clinic Calgary", "internal medicine Calgary", "hypertension clinic", "stress echocardiogram Calgary", "heart health Alberta", "at-home blood test Calgary", "longevity clinic", "genomics test", "personal health record", "NEYU Health"],
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_CA", url: SITE_URL, title: "NEYU Health — Your health. Reimagined.", description: SITE_DESCRIPTION, images: [{ url: "/og.png", width: 1200, height: 630, alt: "NEYU Health" }] },
  twitter: { card: "summary_large_image", title: "NEYU Health — Your health. Reimagined.", description: SITE_DESCRIPTION, images: ["/og.png"] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
  formatDetection: { telephone: true, address: true, email: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", dmSans.variable)}>
      <head><StructuredData /></head>
      <body
        className={`${dmSans.variable} font-sans min-h-screen text-graphite-900 overflow-x-hidden pb-24 min-[860px]:pb-0`}
        style={{ background: "#F7F6F2" }}
      >
        <LanguageProvider>
          <RegionProvider>
            <AlbaProvider>
              <MotionElements />
              <PageVisitTracker />
              {children}
              <Footer />
              {/* Universal chrome: nav rail / mobile tab bar + search, Neyu, safety screen. */}
              <NavChrome />
              <AlbaWidget />
              <AlbaFactPopup />
              <EmergencyOverlay />
            </AlbaProvider>
          </RegionProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
