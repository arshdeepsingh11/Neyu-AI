// NEYU load test (k6). Simulates the busiest hour at the planned maximum of 5,000
// visitors a day: website visitors, patients in My Health Space and staff dashboards.
//
//   k6 run loadtest/k6-neyu.js                               (target 200 people at once)
//   k6 run -e PEAK=500 loadtest/k6-neyu.js                   (stress: 500 at once)
//   k6 run -e BASE=https://staging.neyuhealth.com -e STAFF_USER=... -e STAFF_PASS=... loadtest/k6-neyu.js
//
// Needs the load-test patients from loadtest/seed-volume.sql (load.N@neyu.test). Never run
// against the live site with real patients — use a staging copy.
// AI endpoints (Neyu chat, symptom check) are not included: they call Google Gemini and
// are limited by Gemini's own rate limits, not by this server.
import http from "k6/http";
import { check, sleep, group } from "k6";
import { Trend, Rate } from "k6/metrics";

const BASE = __ENV.BASE || "http://localhost:3000";
const PEAK = Number(__ENV.PEAK || 200);
const HOLD = __ENV.HOLD || "3m";
const STAFF_USER = __ENV.STAFF_USER || ""; // your SUPER_ADMIN_USERNAME
const STAFF_PASS = __ENV.STAFF_PASS || "";
const PATIENT_PASS = __ENV.PATIENT_PASS || "Load-Test-Pass-1";

const pageTime = new Trend("neyu_page_ms", true);
const portalTime = new Trend("neyu_portal_ms", true);
const adminTime = new Trend("neyu_admin_ms", true);
const apiErrors = new Rate("neyu_errors");

// Share of people: 75% website visitors, 22% patients, 3% staff.
const share = (p) => Math.max(1, Math.round(PEAK * p));
const stages = (n) => [{ duration: "1m", target: n }, { duration: HOLD, target: n }, { duration: "30s", target: 0 }];

export const options = {
  scenarios: {
    visitors: { executor: "ramping-vus", exec: "visitor", startVUs: 0, stages: stages(share(0.75)) },
    patients: { executor: "ramping-vus", exec: "patient", startVUs: 0, stages: stages(share(0.22)) },
    staff: { executor: "ramping-vus", exec: "staff", startVUs: 0, stages: stages(share(0.03)) },
  },
  thresholds: {
    neyu_page_ms: ["p(95)<800"],     // public pages
    neyu_portal_ms: ["p(95)<1000"],  // My Health Space
    neyu_admin_ms: ["p(95)<2000"],   // dashboards
    neyu_errors: ["rate<0.01"],      // under 1% errors
  },
  setupTimeout: "5m",
};

const PAGES = ["/", "/", "/specialties", "/specialties/cardiology", "/diagnostics", "/diagnostics/stress-testing", "/diagnostics/monitoring",
  "/physicians", "/care", "/virtual-care", "/hypertension-clinic", "/packages", "/prevention", "/longevity", "/genomics", "/neyu",
  "/contact", "/about", "/services", "/specialties/internal-medicine", "/cardiac-symptoms", "/referral-centre", "/my-health/sign-in"];
const SEARCHES = ["stress echo", "holter", "cardiologist", "blood pressure", "echocardiogram", "book appointment"];

// Each simulated person gets their own network address (the server limits per address).
const ipFor = () => `10.${(__VU >> 8) & 255}.${__VU & 255}.${__ITER % 250 + 1}`;
const hdr = (extra = {}) => ({ headers: { Origin: BASE, "Content-Type": "application/json", "X-Forwarded-For": ipFor(), ...extra } });
const ok = (res, ms, metric) => {
  metric.add(res.timings.duration);
  const good = res.status >= 200 && res.status < 400;
  apiErrors.add(!good);
  return good;
};

// Session cookie from a sign-in response (read from the response itself: on https the
// cookies are "Secure", which k6's cookie jar would not send to an http test server).
const cookieHeader = (res) => Object.values(res.cookies).map((v) => `${v[0].name}=${v[0].value}`).join("; ");

export function setup() {
  // Patients sign in once here (sign-in is deliberately slow: strong password hashing).
  const patients = [];
  const n = Math.max(1, share(0.22));
  for (let i = 1; patients.length < n && i <= n * 2; i++) {
    if (i % 5 === 0) continue; // every 5th load patient is unverified
    const res = http.post(`${BASE}/api/portal/auth/sign-in`, JSON.stringify({ email: `load.${i}@neyu.test`, password: PATIENT_PASS }),
      { headers: { Origin: BASE, "Content-Type": "application/json", "X-Forwarded-For": `10.200.${i >> 8}.${i & 255}` } });
    if (res.status === 200) patients.push(cookieHeader(res));
  }
  const s = http.post(`${BASE}/api/admin/login`, JSON.stringify({ identifier: STAFF_USER, password: STAFF_PASS }), { headers: { Origin: BASE, "Content-Type": "application/json", "X-Forwarded-For": "10.250.0.1" } });
  const staff = cookieHeader(s);
  if (s.status !== 200) console.warn("Staff sign-in failed: " + s.status + " " + s.body);
  console.log(`setup: ${patients.length} patients signed in, staff ${s.status === 200 ? "signed in" : "NOT signed in"}`);
  return { patients, staff };
}

export function visitor() {
  const path = PAGES[Math.floor(Math.random() * PAGES.length)];
  group("visitor", () => {
    ok(http.get(`${BASE}${path}`, hdr()), 0, pageTime);
    ok(http.post(`${BASE}/api/log-visit`, JSON.stringify({ path }), hdr()), 0, pageTime);
    if (Math.random() < 0.3) ok(http.post(`${BASE}/api/log-event`, JSON.stringify({ type: "search", label: SEARCHES[Math.floor(Math.random() * SEARCHES.length)], path }), hdr()), 0, pageTime);
    if (Math.random() < 0.1) ok(http.get(`${BASE}/sitemap.xml`, hdr()), 0, pageTime);
  });
  sleep(3 + Math.random() * 7); // reading the page
}

export function patient(data) {
  const cookie = data.patients[(__VU - 1) % Math.max(1, data.patients.length)];
  if (!cookie) { sleep(5); return; }
  const p = hdr({ Cookie: cookie });
  group("patient", () => {
    for (const ep of ["/api/portal/session", "/api/portal/today", "/api/portal/space", "/api/portal/documents", "/api/portal/insights"]) {
      const res = http.get(`${BASE}${ep}`, p);
      check(res, { "patient 200": (r) => r.status === 200 });
      ok(res, 0, portalTime);
      sleep(1 + Math.random() * 3);
    }
  });
  sleep(5 + Math.random() * 10);
}

export function staff(data) {
  const p = hdr({ Cookie: data.staff });
  group("staff", () => {
    for (const v of ["boot", "overview&range=30D", "inbox", "patients", "insights&range=30D", "analytics&range=90D", "visitors", "referrals", "insights&range=1Y"]) {
      const res = http.get(`${BASE}/api/admin/data?view=${v}`, p);
      check(res, { "staff 200": (r) => r.status === 200 });
      ok(res, 0, adminTime);
      sleep(2 + Math.random() * 4);
    }
  });
  sleep(5);
}
