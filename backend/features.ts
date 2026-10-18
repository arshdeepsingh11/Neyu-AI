// Admin profiles (Phase 4). Two kinds of staff:
//
//   Super admin → everything (role "super_admin").
//   Admin       → only the features a super admin ticks for that person. Each admin has a
//                 private role "admin_<staffId>" holding exactly those permissions, so the
//                 Phase 3 permission checks work unchanged.
//
// Some permissions can never be given to an admin (SUPER_ONLY).

export type FeatureKey =
  | "overview" | "inbox" | "patients" | "records" | "edit_records"
  | "referrals" | "requests" | "insights" | "reports" | "ai";

export interface Feature {
  key: FeatureKey;
  label: string;
  description: string;
  perms: { key: string; scope: "full" | "reason" }[];
  needs?: FeatureKey[]; // turned on automatically with this feature
}

export const FEATURES: Feature[] = [
  { key: "overview", label: "Overview", description: "Today's numbers: sign-ups, visits, referrals, requests", perms: [{ key: "overview.read", scope: "full" }] },
  { key: "inbox", label: "Inbox", description: "Emergency-flagged symptom checks, reschedule requests, new requests", perms: [{ key: "inbox.manage", scope: "full" }] },
  { key: "patients", label: "Patients", description: "See the patient list", perms: [{ key: "patients.list", scope: "full" }] },
  { key: "records", label: "Patient records", description: "Open a patient's full record — a reason is asked every time and saved", perms: [{ key: "patients.record.read", scope: "reason" }], needs: ["patients"] },
  { key: "edit_records", label: "Edit patient records", description: "Add labs, readings, appointments, care plan; help with account access", perms: [{ key: "patients.record.update", scope: "reason" }, { key: "appointments.manage", scope: "full" }], needs: ["records", "patients"] },
  { key: "referrals", label: "Send to doctor (referrals)", description: "Send or link a patient to a doctor and track referrals", perms: [{ key: "referrals.manage", scope: "full" }] },
  { key: "requests", label: "Service requests", description: "Website booking and service requests", perms: [{ key: "requests.manage", scope: "full" }] },
  { key: "insights", label: "Insights", description: "What people view, search and ask Neyu; where visitors come from; trends (anonymous)", perms: [{ key: "insights.read", scope: "full" }, { key: "analytics.read", scope: "full" }] },
  { key: "reports", label: "Reports & exports", description: "Download CSV reports", perms: [{ key: "exports.create", scope: "full" }] },
  { key: "ai", label: "AI activity", description: "Read Neyu conversations and symptom checks", perms: [{ key: "ai.logs.read", scope: "full" }] },
];

/** Permissions only a super admin can ever have. */
export const SUPER_ONLY = ["staff.invite", "staff.roles.manage", "platform.settings.manage", "platform.orgs.manage", "audit.read", "privacy.deletion.manage", "privacy.export.manage"];

export const FEATURE_KEYS = FEATURES.map((f) => f.key);

/** Adds the features a chosen feature needs (e.g. records → patients). */
export function withNeeds(keys: string[]): FeatureKey[] {
  const out = new Set<FeatureKey>();
  const add = (k: FeatureKey) => { if (out.has(k)) return; out.add(k); FEATURES.find((f) => f.key === k)?.needs?.forEach(add); };
  keys.filter((k): k is FeatureKey => (FEATURE_KEYS as string[]).includes(k)).forEach(add);
  return FEATURE_KEYS.filter((k) => out.has(k));
}

/** Permission rows for a set of features (strongest scope wins). */
export function permsForFeatures(keys: FeatureKey[]) {
  const m = new Map<string, "full" | "reason">();
  for (const k of keys) for (const p of FEATURES.find((f) => f.key === k)!.perms) {
    if (SUPER_ONLY.includes(p.key)) continue;
    if (!m.has(p.key) || (m.get(p.key) === "reason" && p.scope === "full")) m.set(p.key, p.scope);
  }
  return [...m.entries()].map(([permissionKey, scope]) => ({ permissionKey, scope }));
}

/** Which features a set of permissions adds up to (for showing the ticks). */
export function featuresFromPerms(perms: Record<string, string>): FeatureKey[] {
  return FEATURES.filter((f) => f.perms.every((p) => perms[p.key])).map((f) => f.key);
}

export const adminRoleKey = (staffId: string) => `admin_${staffId}`;
