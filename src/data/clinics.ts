import type { LucideIcon } from "lucide-react";
import { HeartPulse, Activity, Stethoscope, Droplet, Users, Baby, Wind, Apple, Sparkles } from "lucide-react";

export interface Clinic {
  id: string;              // URL slug: neyuhealth.com/{id}
  label: string;
  icon: LucideIcon;
  partner?: string;        // set only for externally-partnered clinics
  group?: "anra-medical";  // set only for Dr. Kapoor's own in-house specialties
}

// All 9 individual clinics — flat, used for URL lookups (/cardiology,
// /nutrition, etc.) regardless of how they're grouped for navigation.
export const clinics: Clinic[] = [
  { id: "cardiology", label: "Cardiology", icon: HeartPulse, group: "anra-medical" },
  { id: "heart-failure", label: "Heart Failure Clinic", icon: Activity, group: "anra-medical" },
  { id: "internal-medicine", label: "Internal Medicine", icon: Stethoscope, group: "anra-medical" },
  { id: "endocrinology", label: "Endocrinology", icon: Droplet, group: "anra-medical" },
  { id: "geriatric", label: "Geriatric Medicine", icon: Users, group: "anra-medical" },
  { id: "pediatric-rheumatology", label: "Pediatric Rheumatology", icon: Baby, group: "anra-medical" },
  { id: "respiratory", label: "Respiratory Medicine", icon: Wind, partner: "Advanced Respiratory Care Network" },
  { id: "nutrition", label: "Nutrition", icon: Apple, partner: "Nea Precision Nutrition" },
  { id: "precision-skin", label: "Precision Skin Health", icon: Sparkles, partner: "Nea Precision Skin" },
];

// The 6 specialties that live under Dr. Kapoor's own in-house practice —
// shown together on /specialties, not as separate top-level intro cards.
export const specialties = clinics.filter((c) => c.group === "anra-medical");

// The 3 externally-partnered clinics — each gets its own top-level card.
export const partnerClinics = clinics.filter((c) => !c.group);

export function getClinicById(id: string): Clinic | undefined {
  return clinics.find((c) => c.id === id);
}

// What the intro's ClinicSelector actually shows: 4 top-level options —
// one umbrella card for the 6 in-house specialties, plus the 3 partner
// clinics. Adding a 5th partner later = one line here.
export interface IntroOption {
  id: string;
  label: string;
  icon: LucideIcon;
  partner?: string;
  href: string;
}

export const introOptions: IntroOption[] = [
  { id: "medical-specialties", label: "Medical Specialties", icon: HeartPulse, href: "/specialties" },
  ...partnerClinics.map((c) => ({ id: c.id, label: c.label, icon: c.icon, partner: c.partner, href: `/${c.id}` })),
];