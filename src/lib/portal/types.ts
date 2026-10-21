// Data shapes exchanged between the My Health Space API and the UI.
// Dates travel as ISO strings; days as YYYY-MM-DD (patient timezone).

import type { MetricKey } from "./metrics";

export type ProviderId = "apple" | "iphone" | "withings" | "oura" | "whoop" | "garmin" | "fitbit" | "android";

export interface ProfileDTO {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null; // YYYY-MM-DD
  age: number | null;
  memberSince: string; // "March 2025"
  timezone: string;
  photoUrl: string | null;
  goals: string[];
  careTeam: { id: string; init: string; name: string; role: string }[];
  connectedDevices: number;
}

export interface SignalDTO { k: MetricKey; label: string; value: string; unit: string; note: string }
export interface InsightDTO { tone: "lavender" | "peach"; eyebrow: string; text: string; detail?: string; source?: string; metric: MetricKey; stats?: { label: string; value: string }[]; cta: string }
export interface DayItemDTO { time: string; title: string; value: string; done: boolean }

export interface TodayDTO {
  dateLabel: string;
  greeting: string;
  hasWearable: boolean;
  syncLabel: string | null; // "Updated 2 min ago"
  picture: { status: "Steady" | "Worth watching" | "Recovering"; headline: string; text: string } | null;
  signals: SignalDTO[];
  insights: InsightDTO[];
  nextStep: { kind: "appointment"; text: string; appointmentId: string } | { kind: "assessment"; text: string } | null;
  dayItems: DayItemDTO[];
  areas: { label: string; on: boolean }[];
  sources: { label: string; icon: string }[];
}

export type Series = [string, number][]; // [day, value]

export interface TrendsDTO {
  today: string;
  series: Partial<Record<MetricKey, Series>>;
  sources: Partial<Record<MetricKey, string>>; // latest source label
  rows: Record<"heart" | "recovery" | "activity", { icon: string; name: string; sub: string; value: string }[]>;
}

export interface ResultDTO {
  id: string;
  code: string;
  name: string;
  fullName: string | null;
  category: string;
  value: number | null;
  valueText: string | null;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  refText: string | null;
  inRange: boolean | null;
  collectedAt: string | null;
  source: string;
  about: string | null;
  guidance: string | null;
  history: { date: string; value: number }[];
  pending: boolean;
  expectedAt: string | null;
}

export interface ResultsDTO { latestLabel: string | null; results: ResultDTO[] }

export interface ProtocolItemDTO {
  id: string; slot: string; title: string; dose: string; source: string; timeOfDay: string | null;
  sections: { h: string; t: string }[]; guidance: string | null; doneToday: boolean;
}
export interface ProtocolDTO { items: ProtocolItemDTO[]; streak: number }

export interface HistoryItemDTO {
  id: string;
  ref: { type: "symptom" | "alba" | "assessment" | "labcheck" | "referral" | "labs" | "protocol" | "appointment"; id: string };
  kind: string; // filter keys, space-separated
  type: string;
  title: string;
  sub: string;
  icon: string;
  ai: boolean;
  at: string; // ISO
  go: "results" | "protocol" | "appointments" | "referrals" | null;
}

export interface HistoryDetailDTO {
  eyebrow: string;
  title: string;
  dateLabel: string;
  sections: { h: string; t: string }[];
  messages?: { role: "user" | "assistant"; text: string }[];
  note: string;
}

export interface AppointmentDTO {
  id: string; title: string; clinician: string; location: string; startsAt: string; durationMin: number;
  status: string; summaryAvailable: boolean; rescheduleRequested: boolean; prepSaved: boolean; questionCount: number;
  prep: { shareTrends: boolean; shareResults: boolean; shareSymptoms: boolean };
}
export interface AppointmentsDTO {
  upcoming: AppointmentDTO[];
  past: AppointmentDTO[];
  questions: { id: string; text: string }[];
  prepSources: { trends: boolean; results: string | null; symptom: { label: string; sub: string } | null };
}

export interface ReferralDTO { id: string; title: string; status: string; steps: { label: string; date: string; done: boolean }[]; appointmentId: string | null }

export interface DeviceDTO {
  id: ProviderId; name: string; icon: string; signals: string[]; available: boolean;
  status: "off" | "pending" | "on" | "waitlist"; lastSyncAt: string | null; dataTypes: string[]; tokenHint: string | null;
  mode: "shortcut" | "oauth" | "app" | "waitlist"; blurb: string; beta: boolean; stale: boolean; lastError: string | null;
  /** Last call from the phone, even when nothing was stored. */
  lastAttemptAt: string | null; lastResult: { stored: number; metrics: string[]; rejected: { field: string; reason: string }[] } | null;
  guide: { needs: string; steps: string[]; meanwhile?: string; note?: string; appSoon?: string };
}

export interface SettingsDTO {
  shareWearables: boolean; shareLabs: boolean; shareRecords: boolean; albaAccess: boolean; learnUsage: boolean; aiInsights: boolean;
  notifDaily: boolean; notifWorth: boolean; notifProtocol: boolean; notifAppt: boolean;
  city: string | null; province: string | null; briefEmail: boolean; leaderboardName: string | null;
}

export interface BootstrapDTO { profile: ProfileDTO; today: TodayDTO; settings: SettingsDTO }

// ── Health Universe ─────────────────────────────────────────────────────
export interface WeatherDTO {
  place: string; // "Calgary, AB"
  tempC: number | null; condition: string | null; high: number | null; low: number | null;
  windKmh: number | null; feelsLikeC: number | null; uv: number | null;
  aqhi: number | null; aqhiMax: number | null; aqhiRisk: string | null; // Low | Moderate | High | Very high
  alerts: string[];
  updatedAt: string;
}
export interface BriefItemDTO { icon: string; title: string; text: string; tone: "teal" | "lavender" | "peach" | "neutral"; go?: string }
export interface BriefDTO {
  day: string;
  headline: string; // one warm sentence
  message: string; // 1–3 sentences (Neyu-written when available)
  byAlba: boolean;
  weather: WeatherDTO | null;
  needsLocation: boolean;
  moveAdvice: { verdict: "outside" | "indoors" | "easy" | null; text: string } | null;
  items: BriefItemDTO[];
  points: number; // reward balance
  streak: number; // days in a row with a check-in
}

export interface BpReadingDTO { id: string; sys: number; dia: number; pulse: number | null; takenAt: string; source: string; note: string | null }
export interface HeartDTO {
  readings: BpReadingDTO[]; // last 90 days, newest first
  avg7: { sys: number; dia: number; n: number } | null;
  avg30: { sys: number; dia: number; n: number } | null;
  status: { level: "none" | "normal" | "elevated" | "high" | "urgent"; title: string; text: string };
  daily: { day: string; sys: number; dia: number }[]; // daily averages, 90 days
  readiness: { have: number; want: number; text: string } | null; // before the next visit
  rhr: { value: string; note: string } | null;
  hrv: { value: string; note: string } | null;
  withings: "on" | "off" | "unavailable";
}

export interface LifestyleDayDTO { day: string; water: number; caffeine: number; alcohol: number; mood: number | null; stress: number | null; meals: { id: string; text: string; at: string }[] }
export interface LifestyleDTO {
  today: LifestyleDayDTO;
  week: LifestyleDayDTO[]; // last 7 days, oldest first
  lateCaffeine: boolean; // caffeine after 2 pm today
  sleepCoach: { title: string; tips: string[]; bedtimeTarget: string | null; avgSleep: string | null; consistency: string | null } | null;
  patterns: string[]; // "On nights after alcohol you slept 40 min less"
}

export interface RetestDTO { code: string; name: string; last: string; due: string; overdue: boolean; months: number }

export interface FamilyDTO {
  caregivers: { id: string; email: string; name: string | null; relation: string; status: string; since: string }[];
  caringFor: { id: string; ownerId: string; name: string; relation: string; since: string }[];
  invites: { id: string; from: string; relation: string }[]; // pending invites to me
}
export interface CareSummaryDTO {
  name: string; relation: string; updated: string;
  signals: { label: string; value: string; note: string }[];
  bp: { avg7: string | null; status: string; last: string | null };
  protocol: { done: number; total: number };
  nextAppointment: string | null;
  alerts: string[];
}
export interface ShareLinkDTO { id: string; label: string; scope: string[]; expiresAt: string; revoked: boolean; views: number; lastViewedAt: string | null; url?: string }

export interface ChallengeDTO {
  id: string; code: string; name: string; metric: string; metricLabel: string; goal: number; startDay: string; endDay: string; org: string | null;
  mine: boolean; daysLeft: number; status: "upcoming" | "active" | "ended";
  board: { name: string; me: boolean; total: number; daysHit: number }[];
}

export interface RewardsDTO {
  balance: number; earnedTotal: number; streak: number;
  recent: { label: string; points: number; day: string }[];
  rules: { label: string; points: number }[];
  tiers: { points: number; label: string; percent: number }[];
  codes: { code: string; label: string; created: string }[];
}

export interface StoryDTO {
  month: string; // YYYY-MM
  label: string; // "September 2026"
  title: string;
  paragraphs: string[];
  byAlba: boolean;
  stats: { label: string; value: string; note?: string }[];
  months: string[]; // available months
}
