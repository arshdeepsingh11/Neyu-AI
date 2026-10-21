# Legal pages — how to keep them correct

Pages: `/privacy`, `/terms`, `/ai-notice`, `/cookies`, `/accessibility` (Phase 8).
`/app-privacy` (linked from Health Connect and the app stores) redirects to `/privacy#app`.

## 1 · Facts still to confirm

All in **`src/lib/legal.ts`** — one file, no other code to touch. Until a field is filled, the pages
use a safe fallback (no invented names or addresses):

| Field | Fallback shown on the pages |
|---|---|
| `legalName` — registered company name | "NEYU Health" |
| `privacyEmail` — e.g. privacy@neyuhealth.com | phone + mailing address only |
| `privacyOfficerName` | "our Privacy Officer" |
| `mailingAddress` | the North East clinic address |
| `hostingCountry` — where the servers are | no country named |
| `minAge` | 18 |

## 2 · Changing a policy

1. Edit the page text (`src/app/<page>/page.tsx`) and/or `src/lib/legal.ts`.
2. Set `effectiveDate` and the matching `versions.*` in `src/lib/legal.ts`.
3. Add a migration that inserts the new `PolicyVersion` rows (copy `prisma/migrations/20261020000000_phase8_legal`).
4. Patients who agreed to an older Terms / Privacy Policy see "We updated our …" in My Health Space;
   "I agree" is recorded as a consent (method `review`) with the new version.

Have a lawyer or the clinic's privacy lead review the text before the public launch.

## 3 · Where each statement comes from

| Statement | Source in the code |
|---|---|
| Never sold, no advertising | No ad or analytics scripts in the site; `/cookies` lists every cookie |
| Visit statistics without IP, DNT/GPC respected, switch on /cookies | `backend/logging.ts`, `src/lib/track.ts`, `src/lib/statsConsent.ts`, `/api/log-visit`, `/api/log-event` |
| Neyu uses Google Gemini, only when asked, can be switched off | `backend/ai.ts`, Neyu access switch (`albaAccess`) |
| Safety rules (no diagnosis, no doses, 911) | `backend/albaKnowledge.ts`, `backend/ai.ts` (`unsafeAiText`) |
| Email via Resend | `backend/email.ts` |
| Push via Firebase / Apple, no health details | `backend/push.ts`, `backend/daily.ts` |
| Weather: city only | `backend/weather.ts` (api.weather.gc.ca) |
| Files encrypted AES-256 | `backend/storage.ts` |
| 30-day deletion hold, deletion certificate, 7-day exports | `backend/privacy.ts` |
| Visit records 13 months | `backend/jobs.ts` (retention) |
| Sessions 30 days (patients) / 8 hours (staff) | `backend/patientAuth.ts`, `backend/staffAuth.ts` |
| Backups 30 days | `deploy/backup.sh` |
| Share links 1/7/30 days, can be cancelled | `/api/portal/share` |
| Age 18+ | `/api/portal/auth/sign-up` (date of birth checked when given; sign-up checkbox) |
| YouTube privacy-enhanced mode | `src/components/specialty/SpecialtyExperience.tsx` |

If any of these change in the code, update the policy text in the same commit.
