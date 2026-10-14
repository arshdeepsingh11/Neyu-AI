// Shapes returned by /api/admin/data. Shared by the server (backend/adminData.ts)
// and the admin console UI (src/components/admin). All dates are already
// formatted for display in Mountain Time.

export type Go = { s: "patient" | "visitor"; id: string; tab?: string } | { ref: string } | { ai: string } | { s: "inbox" | "settings" | "referrals" };

export interface Consent { wearables: boolean; labs: boolean; clinical: boolean; alba: boolean }

export type QueueType = "urgent" | "referrals" | "appointments" | "labs" | "prep" | "accounts" | "devices";
export type Priority = "Emergency" | "High" | "Normal" | "Low";

export interface QueueItem {
  id: string; // stable key, e.g. "appt:<id>"
  type: QueueType;
  label: string;
  who: string;
  whoId: string | null; // patient id or visitor id
  whoKind: "patient" | "visitor" | "none";
  test: boolean;
  time: string;
  mins: number; // minutes ago (sorting)
  priority: Priority;
  status: string;
  owner: string;
  action: string;
  detail: string;
  aiId?: string;
  refId?: string;
  targetId?: string; // appointment / device / lab id
}

export interface ActivityItem { time: string; title: string; who: string; icon: string; go: Go | null; at: number }

export interface Metric { label: string; n: string; d: string }
export interface FunnelStep { label: string; n: string; pct: string; conv: string; w: string; notFirst: boolean }
export interface Bar { label: string; v: string; w: string }

export interface OverviewDTO { queue: QueueItem[]; metrics: Metric[]; funnel: FunnelStep[]; rangeLabel: string; activity: ActivityItem[] }

export interface AnalyticsDTO {
  metrics: Metric[]; funnel: FunnelStep[]; rangeLabel: string;
  weekly: { v: number; h: string; label: string; tip: string }[];
  bySpec: Bar[]; byUrg: Bar[]; topPages: Bar[]; aiUse: Bar[];
  outbound: { label: string; domain: string; why: string; v: string; w: string; pct: string }[];
  outTotalL: string; outPctL: string;
}

export interface PatientRow {
  id: string; name: string; initials: string; email: string; phone: string; age: number | null;
  verified: boolean; lastActive: string; lastMins: number; devices: number; staleDevice: boolean; consent: Consent;
  nextAppt: string; nextApptAt: number | null; since: string; home: string; locked: boolean; acct: string; test: boolean;
}

export interface ApptDTO {
  id: string; clinician: string; specialty: string; date: string; time: string; location: string; type: string;
  status: string; prep: string; notes: string; upcoming: boolean; startsAt: string; // ISO
  rescheduleRequested: boolean; prepSubmitted: boolean;
}
export interface CareDTO { id: string; name: string; role: string; specialty: string; location: string }
export interface ProtocolDTO { id: string; name: string; dose: string; timing: string; guidance: string; source: string; status: "Active" | "Paused"; rate: number; hasRate: boolean; start: string; startIso: string }
export interface DeviceDTO { id: string; name: string; status: "Connected" | "Not syncing" | "Waiting for first sync" | "Disconnected"; lastSync: string; data: string }
export interface SessionDTO { id: string; device: string; browser: string; ip: string; last: string; active: boolean }
export interface TimelineDTO { id: string; date: string; time: string; title: string; source: string; icon: string; tone: "teal" | "urgent" | "ai" | "neutral"; detail: string; pre: boolean; at: number }
export interface RefDTO {
  id: string; code: string; pid: string | null; patient: string; test: boolean; type: string; urgency: string; specialty: string;
  requested: string; referring: string; status: "Received" | "Reviewed" | "Scheduled" | "Closed"; received: string; mins: number;
  scheduled: string; reviewer: string; exams: string; notes: string; staffNote: string; sourceText: string;
  phone: string; referringPhone: string; referringAddress: string; visitorId: string | null;
  history: { status: string; when: string; by: string }[];
}
export interface AuditDTO {
  id: string; who: string; role: string; kind: "View" | "Reveal" | "Change" | "Export" | "Account"; action: string; resource: string;
  subject: string; subjectId: string | null; subjectType: string | null; ts: string; ip: string; result: string;
  reason: string; before: string; after: string;
}

export interface Patient360DTO extends Omit<PatientRow, "devices"> {
  upcoming: ApptDTO[]; past: ApptDTO[]; questions: string[]; care: CareDTO[]; goals: string[];
  protocol: ProtocolDTO[]; devices: DeviceDTO[]; sessions: SessionDTO[];
  labsN: number; aisN: number; healthHidden: boolean; labsHidden: boolean;
  refs: RefDTO[]; timeline: TimelineDTO[]; audit: AuditDTO[]; visitorIds: string[];
}

export interface HealthRevealDTO {
  metrics: { label: string; value: string; unit: string; note: string }[];
  readings: { id: string; type: string; value: string; unit: string; when: string; source: string; by: string }[];
}
export interface LabDTO { id: string; test: string; value: string; unit: string; range: string; status: "Pending" | "Final"; flag: "above" | "below" | null; date: string; panel: string; source: string; explanation: string }

export type AiKind = "symptom" | "alba" | "assessment" | "lab";
export interface AiRow {
  key: string; // "<kind>:<db id>"
  id: string; // display code, e.g. SC-3F9K
  kind: AiKind; who: string; whoId: string | null; isVisitor: boolean; test: boolean;
  date: string; time: string; mins: number; status: string; emergency: boolean; pre: boolean; line: string; title: string;
}
export interface AiDetailDTO extends AiRow {
  from: string; desc?: string; urgency?: string; specialty?: string;
  messages?: { from: "patient" | "alba" | "system"; text: string }[];
  answers?: { q: string; a: string }[]; summary?: string; focus?: string[]; next?: string;
  provided?: string; results?: { t: string; v: string; r: string }[]; explanation?: string;
  reviewedBy?: string; reviewedAt?: string;
}

export interface VisitorRow {
  id: string; first: string; last: string; lastMins: number; pages: number; tools: string[]; referral: string | null;
  status: "Converted" | "Active" | "Idle"; pid: string | null; pname: string; device: string; test: boolean;
}
export interface VisitorDTO extends VisitorRow {
  pagesL: { url: string; when: string; dur: string }[];
  ais: AiRow[]; refs: RefDTO[];
  tlv: { t: string; title: string; icon: string; detail: string }[];
  audit: AuditDTO[]; convertedOn: string;
}

export interface SettingsDTO {
  emailConfigured: boolean; mailFrom: string; signupOpen: boolean;
  locations: { name: string; address: string }[];
  counts: { patients: number; visitors: number; referrals: number; audit: number };
}

export interface BootDTO {
  actor: string; role: string; queueCount: number; emergencyCount: number; latestReferral: { id: string; code: string; label: string } | null;
  emailConfigured: boolean; hasTestData: boolean; activity: ActivityItem[];
}

export interface SearchDTO {
  patients: { id: string; name: string; initials: string; sub: string; meta: string }[];
  visitors: { id: string; sub: string; meta: string }[];
  referrals: { id: string; title: string; sub: string; meta: string }[];
}
