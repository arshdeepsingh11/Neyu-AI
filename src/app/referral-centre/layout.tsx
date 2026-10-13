import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Referral Centre — Refer a Patient · NEYU Health",
  description: "Refer a patient to NEYU Health in Calgary. Scan or upload your referral, choose specialties and exams, and get a ready-to-send letter in minutes.",
  alternates: { canonical: "/referral-centre" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
