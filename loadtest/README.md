# NEYU load test (Phase 5)

Checks that NEYU stays fast at the planned maximum of **5,000 visitors a day**
(about 100 people at once in the busiest hour; the test uses 200, and 500 as a stress test).

**Use a staging copy of the database, never the live one.**

1. Fill one year of test traffic (1.8M visitors, 5.4M page views, 15k test patients — about 2 minutes):
   `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f loadtest/seed-volume.sql`
2. Start the app as on the server (`npm run build && npm start`, Redis on). Wait 2 minutes: the worker fills the daily totals and dashboard cache.
3. Install k6 (https://grafana.com/docs/k6/latest/set-up/install-k6/) and run:
   - `k6 run -e BASE=http://localhost:3000 -e STAFF_USER=<super admin> -e STAFF_PASS=<password> loadtest/k6-neyu.js` — 200 people at once
   - add `-e PEAK=500` for the stress test
   Run k6 from **another machine** for real numbers (on the same machine it competes for CPU).
4. Pass = all four lines green: pages p95 < 0.8 s, My Health Space p95 < 1 s, dashboards p95 < 2 s, errors < 1 %.
5. Remove the test data: `psql "$DATABASE_URL" -f loadtest/remove-volume.sql`

Who is simulated: 75 % website visitors (pages, page-view logging, searches), 22 % patients in
My Health Space (Today, My Health, records, insights), 3 % staff (all dashboards incl. a full year).
Neyu AI chat is not included — it is limited by Google Gemini, not by this server.
