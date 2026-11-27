# RMA Weekly Monitoring Portal (Public site + RMA + Stakeholder portals)

The app now has a **public website**, an **RMA portal** and a **Management portal**, all on one shared data store.

A frontend MVP for monitoring the credit position, trade balance, available stock, cash in till, TAR and exposure of petroleum retail stations, plus monthly account monitoring (Financial Monitor). It now contains two portals that share one data store:

- **RMA portal** (`/rma`) - the original portal, extended (see "What changed in the RMA portal").
- **Management portal** (`/management`) - new, for Management users and the Head of Retail.

Built with React, TypeScript, Vite, Tailwind CSS, Recharts, React Router, ExcelJS and LocalStorage. There is no backend.

## Run it

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Open http://localhost:5173. `npm run build` type-checks and builds; `npm run typecheck` only type-checks; `npm test` runs the calculation and carry-forward unit tests (`tests/`, Node's built-in test runner via `tsx`, fetched by `npx` on first run).

## Routes

| Route | Who | Page |
|---|---|---|
| `/` | public | Home (hero with real portal screenshots) |
| `/about` | public | About the platform + benefits |
| `/onboarding/station` | public | Station onboarding form (linked from the footer) |
| `/get-started` | public | **Get Started**: choose Sign In or Onboard a Station (every Get Started button opens it) |
| `/sign-in` | public | **Unified Sign In** for every account type (`/rma`, `/management` redirect here) |
| `/sign-up` | public | **Unified Sign Up** (`/rma/register`, `/management/register` redirect here) |
| `/rma/dashboard`, `/rma/stations`, `/rma/stations/:stationId/weekly-log` (Station Log: Weekly Logs tab, Monthly Log tab via `?tab=monthly`), `/rma/weekly-logs`, `/rma/financial-monitor`, `/rma/reports`, `/rma/notifications` | RMA | RMA portal |
| `/management/dashboard`, `/stations`, `/financial-monitor`, `/reports`, `/notifications`, `/outstanding`, `/outstanding-stations`, `/performance` | BM (own scope), Head of Retail, Risk, Management | Stakeholder portal |
| `/management/approvals` | **Risk only** | Pending Approvals |

An RMA typing a management URL is redirected to the RMA dashboard; a normal Management user typing `/management/approvals` is redirected to the Management dashboard.

## Roles and permissions

One sign-in and one sign-up serve everyone. Sign-up asks for an **Account Type**: *RMA* (then BM, Region, Station(s)) or *Stakeholder* (then Department: Head of Retail, Business Manager (BM), Risk, Management). The stakeholder department becomes the user's role; Business Manager is a stakeholder department, not an account type. After sign-in you land on the dashboard for your stored role: RMAs on `/rma/dashboard`, everyone else on `/management/dashboard`.

| Function | RMA | BM | Head of Retail | Risk | Management |
|---|---|---|---|---|---|
| View own assigned stations | Yes | Yes | Yes | Yes | Yes |
| View all stations | No | No | Yes | Yes | Yes |
| Submit weekly reports | Yes | No | No | No | No |
| Download reports | Own scope | Assigned scope | All | All | All |
| View RMA performance | Own | Assigned RMAs | All | All | All |
| View outstanding stations | Own scope | Assigned scope | All | All | All |
| Request amendments | Yes | No | No | No | No |
| Approve / reject amendments | No | No | No | **Yes** | No |
| Nudge outstanding RMAs | No | No | No | No | **Yes** |
| Receive positive TAR notifications | Yes | Yes | Yes | Yes | Yes |

The matrix lives in `src/utils/permissions.ts` and is enforced in the services (`access.ts`, `report.service.ts`, `amendment.service.ts`, `submission.service.ts`, `excel.service.ts`) and in the scoped data hook `useScopedData`, which every dashboard, table, chart and export reads through. The signed-in user is re-loaded from the users collection by id, so the role never comes from browser-side display data. Route guards (`RoleGuard`) are an extra layer, not the only one.

**BM scope**: the RMAs whose `bmId` is that BM, plus the stations of those RMAs and any station whose `bmId` is that BM.

## Demo credentials (password `Demo@1234` for all)

| Role | Email | Notes |
|---|---|---|
| RMA | `rma@demo.com` | Adaeze Okafor (BM Olumide Adeyemi), owns STN-001 to STN-010 |
| RMA | `tunde.bakare@demo.com`, `kelechi.nwankwo@demo.com`, `hauwa.garba@demo.com`, `segun.alabi@demo.com`, `ifeoma.obi@demo.com` | 2-3 stations each |
| Business Manager | `olumide.adeyemi@demo.com` (BM of `rma-001`, `rma-005`), `ngozi.nwosu@demo.com`, `emeka.obi@demo.com`, `fatima.bello@demo.com` | scoped to their own RMAs/stations |
| Head of Retail | `headofretail@demo.com` | organisation-wide view; cannot approve |
| Risk | `risk@demo.com` | organisation-wide view; **approves/rejects amendments** |
| Management | `management@demo.com`, `chioma.eze@demo.com` | organisation-wide view; **nudges RMAs** |

Sessions are **per browser tab** (sessionStorage), so you can be an RMA in one tab and Risk in another and watch them sync.

## Authenticated portals

- **Colour system**: the portals use `#013C1C` (sidebar, primary buttons, active navigation, accents), set once in `tailwind.config.js` (`brand`). The animated brand panel on Sign In / Sign Up uses it too, with drifting light, slow rings, a grid and a pulsing "report" card; `prefers-reduced-motion` stops it. The public website keeps its own palette.
- **TAR = Available Stock - Trade Balance**, **Exposure = TAR - Available Stock + CIT**, **Available Credit = Trade Balance - Credit Limit** (see Calculations). Available Credit has no colour treatment.
- **TAR classification** (`src/utils/tar-colours.ts`, `TarValue`): positive = **Debt**, red text on a very light red background; negative = green; exactly zero = neutral. Used in every table, modal, ranking and chart in both portals. There is no amount threshold.
- **RMA portal**: the Stations button now reads **Create Log**; the weekly log form has an optional **Comments** field saved on the report and shown only in the *View* modal (not a table column); the Weekly Logs table no longer shows the RMA name (the RMA id/name stay on the record for audit and performance); new **Reports** tab (filter by station and period, historical table, Excel download, own stations only).
- **Stakeholder portal**: Stations has **pagination (10 per page)** that works with search, filters and sorting and returns to page 1 when they change; clicking **Outstanding Stations** (dashboard KPI or R.M.A Performance card) opens a station-level detail view (Station Code, Name, Region, Assigned RMA, Assigned BM, Reporting Week, Submission Status) listing only stations without a submitted report for the chosen week; the **Business Manager** dashboard shows Total Assigned Stations, Total Assigned RMAs, Positive TAR Stations, Outstanding Reports, Completed Reports, Submission Performance, Trade Balance, Available Stock, CIT, TAR and Exposure for the BM's scope only.

## November 26 refinements

- RMA dashboard: Total Trade Balance and Total TAR cards removed (six cards remain).
- Stations: the action button reads **Create Log**.
- RMA Performance: clicking an RMA (name or row) opens a pop-up listing every station-week counted under Outstanding
  Reports for the selected week filter: station code, name, reporting week and Pending/Overdue.
- Column titles and button labels never wrap (global `th, button` rule plus `whitespace-nowrap` on button-style
  links); wide tables scroll sideways.
- Unused imports removed; `noUnusedLocals` is on in `tsconfig.json`, so `npm run typecheck` catches new ones.

## Amendment workflow

1. An RMA clicks **Edit** on a submitted report and gives a reason; the request is `Pending Approval` and the report stays locked. Notified: **Risk users and the associated BM** (the station's BM, else the RMA's BM).
2. A **Risk** user approves or rejects in Pending Approvals (no other role can: it is enforced in `decideAmendment`). Notified: the requesting RMA and the associated BM.
3. After approval Trade Balance, Available Stock and CIT are editable (Credit Limit stays as recorded) (reporting week and everything else stay fixed); Total Stock, TAR and Exposure recalculate live.
4. Resubmitting creates **version n+1** (the original stays in the reports collection), writes an amendment-history entry, locks the report again and marks the request `Completed`. Notified: Risk users and the associated BM. The amended figures are evaluated like any new report, so a positive TAR notifies every user.

Amendment notifications go only to the people involved; positive TAR notifications are separate and go to everyone.

## Notifications and alerts

- **Positive TAR alert**: **any** report whose TAR is above zero (even ₦1) notifies **every registered user**, whatever their role. Negative and zero never notify. The notification names the station, code, TAR amount, reporting week, report version/figures and RMA, and is stored in the shared collection with history. It is deduplicated per report id and user (`tar:<reportId>:<userId>`), so refreshes never repeat it, while every new report (including each amended version) is evaluated independently. The old ₦700,000 threshold and its alert category are gone.
- **Monday reminders (Africa/Lagos, WAT = UTC+1, no DST)**: 9 AM, 11 AM, 1 PM, 3 PM, 5 PM, 7 PM, 9 PM, 11 PM. **Management** users get "N RMAs are yet to submit their report. Click to see who."; RMAs with missing reports get their own reminder. Reminders stop once everyone has submitted. The deadline is explicit (Monday 23:59:59.999 WAT, computed in UTC) and never depends on the browser's time zone.
- **After 11:59 PM WAT**: outstanding stations are Overdue and Management gets "N RMAs failed to submit their weekly reports before the deadline. Click to view outstanding submissions."
- **Nudge**: **Management** users can nudge an RMA with outstanding reports (notification with sender, date/time and the outstanding stations, plus nudge history). Other roles cannot.
- **Delivery in this MVP**: notifications live in the shared LocalStorage collection and reach other open tabs through `BroadcastChannel` and the `storage` event; with permission, the Notification API and the service worker (`public/sw.js`) also show browser notifications; the in-app list and pop-ups are the fallback.

### Limitation (please read)

There is **no backend or push service**. LocalStorage cannot deliver true remote push notifications to a closed browser or another device, and LocalStorage itself can be edited by anyone with access to the browser, so the authorisation here is enforced in application logic for the demo, not as server-side security. The services are structured so a real backend, auth provider and push service can replace them.

## Testing the Monday schedule: the Demo clock

A floating **Demo clock** button (bottom-right) lets you set a simulated date/time in WAT, jump to Monday 9:00 AM, +2 hours, 11:29 PM or just past the deadline, return to real time, or reset all demo data. The scheduler runs every 15 seconds and on every clock change; it is idempotent.

## Shared LocalStorage data

All reads and writes go through `src/services/storage.ts` (repository pattern). Components never touch `localStorage`. Both portals use the same collections:

| Key | Contents |
|---|---|
| `rma_system_users` | users (demo-only plain-text passwords), role, assigned BM |
| `rma_system_stations` | station master data (S4HANA-simulated: code, name, credit limit, `rmaId` = RMA assignment) |
| `rma_system_weekly_reports` | every report **version** (station, week-ending Sunday, `submittedAt`, figures, `version`, `status`) |
| `rma_system_amendment_requests` | amendment requests and their status |
| `rma_system_amendment_history` | original vs updated figures for every completed amendment |
| `rma_system_notifications` | one record per recipient (category, read state, deep link, dedupe key) |
| `rma_system_nudge_history` | nudges sent |
| `rma_system_audit_logs` | audit trail of submissions, requests, decisions, exports, nudges |
| `rma_system_submission_status` | scheduler markers (which reminders/final notices were produced) |
| `rma_system_clock` | demo-clock offset |
| `rma_system_session` | signed-in user id (**sessionStorage**, per tab) |

Seed data comes from `src/data/*.json` (`stations`, `users`, `weekly-reports`, `monthly-logs`, `regions`) and is copied into LocalStorage once; imported JSON is never mutated. 25 stations (22 assigned plus 3 demo stations with no RMA yet, Sangotedo, Alimosho and Satellite Town, so the RMA sign-up station picker can be tried; they have no invented code or credit limit), 14 users (6 RMAs, 4 BMs, Head of Retail, Risk, 2 Management), 4 weeks of history (weeks ending 2026-10-25, 11-01, 11-08, 11-15), a mix of on-time and late submissions, positive, negative and zero TAR values, and a few report comments. RMAs `rma-001`, `rma-005`, `rma-006` and part of `rma-004` have no report for the week ending 2026-11-15, so the overdue/outstanding flows can be tried immediately.

To swap in a real backend, replace the functions in `src/services/` (storage, stationService, report, amendment, submission, notification, user) - hooks and components do not need to change.

## Stakeholder portal pages

- **Dashboard**: org-wide for Head of Retail / Risk / Management (stations, credit limit, available credit, trade balance, available stock, CIT, total stock, TAR, exposure, positive TAR stations, outstanding stations) and BM-scoped for Business Managers; TAR chart, Top stations by TAR, submission performance, credit utilisation, recent notifications. All from each station's latest report (never a sum of history).
- **Stations**: read-only table with search, RMA / BM / TAR-status filters, sort, pagination and per-station history (all versions + amendment trail).
- **Reports**: same workspace as the RMA Reports tab, limited to the user's scope. Excel workbook: one worksheet per week named by the Sunday date (`YYYY-MM-DD`), oldest first; columns Station Code, Station Name, Credit Limit, Available Credit, Trade Balance, Available Stock, CIT, Total Stock, TAR, Exposure, RMA, BM; Naira formatting; bold header, frozen row, filters, SUBTOTAL totals; conditional formatting (positive TAR red, negative green); missing reports are marked NOT SUBMITTED, never copied from another week.
- **Notifications**, **Outstanding Submissions** (by RMA; Nudge button for Management only) and **Outstanding Stations** (by station).
- **Pending Approvals** (Risk only).
- **R.M.A Performance**: totals, compliance and a per-RMA table from real submission timestamps versus each week's deadline, with an Outstanding Stations card, filters and trend charts; scoped for BMs.

## Calculations

All in `src/utils/calculations.ts`:

### TAR Monitor (weekly)

The RMA enters **Trade Balance** (the field formerly labelled Total Exposure), **Available Stock** and **Cash in Till
(CIT)**. Credit Limit is read-only and comes from S4HANA, simulated in `src/services/s4hana.service.ts` behind an
`S4HanaSource` interface (`getCreditLimit`); swap `export const s4hana = mockS4Hana` for a real client without touching
the UI. Nothing on the weekly log is generated at random.

```
Available Credit = Trade Balance - Credit Limit        (null while no credit limit is on file)
Total Stock      = Available Stock + CIT
TAR              = Available Stock - Trade Balance
Exposure         = TAR - Available Stock + CIT
Notification     = TAR > 0 (positive TAR alert, every user)
```

Worked example: AS 5,000,000, TB 3,000,000, CIT 500,000, CL 4,000,000 -> Available Credit -1,000,000, Total Stock
5,500,000, TAR 2,000,000, Exposure -2,500,000. The figures are calculated once when a log is submitted or amended and
stored on the log, so history never changes when a credit limit moves.

Weekly Logs column order: Reporting Week, Station Code, Station Name, Credit Limit, Available Credit, Trade Balance,
Available Stock, CIT, Total Stock, TAR, Exposure (then BM, Status, Action).

### Account Monitoring (monthly) and Financial Monitor

Stations -> **Create Log** opens the Station Log page (name + code at the top) with two tabs: **Weekly Logs**
(default) and **Monthly Log**. The RMA picks a reporting month and enters **Closing Stock**, **Closing C.I.T**,
**Turnover**, **Payment** and, if there is one, **Non-stock margin** (left blank = 0). **Opening Stock**,
**Opening C.I.T** and **Opening Balance** are locked: they are copied separately from the same station's most recent
earlier monthly log (closing -> opening) and stored on the new log (`openingSource`, `carriedFromLogId`,
`carriedFromMonth`). A station's first log opens at ₦0; if a month was skipped the most recent earlier log is used.
One log per station per month; future months and back-filling before the station's latest log are refused (a back-fill
would silently change the openings of later months). Openings are computed in `monthly-log.service.ts`, never accepted
from the UI.

```
Opening All       = Opening Stock + Opening C.I.T   (= previous month's Closing All)
Opening Networth  = Opening C.I.T - Opening Stock
Closing Balance   = Opening Balance + Turnover - Payment - NSM
Closing Networth  = Closing C.I.T - Closing Stock
Closing All       = Closing Stock + Closing C.I.T
Security Balance  = 10,000,000 (default)
Change in Balance = Closing Balance - Opening Balance
Change in Stock   = Closing All - Opening All
Net Effect        = Change in Stock - Change in Balance   (red positive, green negative, grey zero)
```

Worked example: Opening Stock 2,000,000, Opening C.I.T 600,000, Closing Stock 3,000,000, Closing C.I.T 500,000,
Opening Balance 1,000,000, Turnover 4,000,000, Payment 3,500,000, NSM 100,000 -> Opening All 2,600,000,
Closing All 3,500,000, Closing Balance 1,400,000, Change in Balance 400,000, Change in Stock 900,000, Net Effect 500,000.

**Financial Monitor** (sidebar, RMA and stakeholder portals, role-scoped like everything else) lists each station's
latest monthly log or a chosen month with the columns Station Code, Station Name, Opening Stock, Opening C.I.T,
Opening All, Opening Balance, Opening Networth, Turnover, Payment, NSM, Closing Balance, Closing Networth,
Closing Stock, Closing C.I.T, Closing All, Security Balance, Change in Balance, Change in Stock, Net Effect.
Formulas are not shown on screen. A submitted monthly log appears immediately (same tab and other open tabs).
Search, month, Net Effect filter, sort, pagination and an Excel export (same columns; Net Effect cells: red positive,
green negative). The page has no KPI cards. Stations without a log are shown as such, never filled in.

### Data migration

`2026-11-v7-monthly-turnover-payment` adds Turnover, Payment, Non-stock margin, Opening/Closing Balance and
Security Balance to monthly logs. Untouched demo logs take the new seed figures; logs an RMA already entered keep
their values and read the new fields as 0.

`SEED_VERSION` is `2026-11-v6-entered-trade-balance`. On first load after the update, existing LocalStorage weekly
logs are converted: logs identical to the old seed are replaced by the new seed; anything the user created keeps its
Available Stock, takes its Trade Balance from the old Total Exposure (the same RMA-entered figure under its new name)
and CIT 0, and keeps the old values under `legacy` (`totalExposure`, `tarDebt`); the CIT cell shows "Not recorded" for
those. `2026-11-v6-entered-trade-balance` also repairs data saved by the previous build, whose Trade Balance was
simulated: converted logs take it back from `legacy.totalExposure` and untouched seed logs are refreshed. Amendment
requests/history are mapped to the new fields. Monthly logs live in `rma_system_monthly_logs`. The seed JSON is
regenerated by `npm run migrate:seed` (`scripts/migrate-seed-data.ts`) from the original RMA-entered seed in
`scripts/legacy-weekly-reports.json`.

## How to test the main scenarios

1. **Sign up**: `/sign-up` -> Account Type *RMA* shows BM, Region and Station(s) (only unassigned stations in the region can be taken: try Lekki-Ajah -> Sangotedo Station); *Stakeholder* shows Department. Sign in at `/sign-in` and check the dashboard for the role.
2. **Positive TAR**: as `rma@demo.com` create a weekly log for STN-001 (week ending 2026-11-15) with Available Stock = Trade Balance + 1: every user, including Risk, BM, Head of Retail and Management, gets a notification. Use a negative or zero TAR: none.
3. **Amendment**: as the RMA click Edit on that log with a reason; as `headofretail@demo.com` or `management@demo.com` confirm there is no Pending Approvals item; as `risk@demo.com` approve; as the RMA amend and resubmit. The associated BM (`olumide.adeyemi@demo.com`) sees the workflow notices.
4. **BM scope**: sign in as a BM and check that only that BM's stations/RMAs appear everywhere, including Reports and Performance.
5. **Nudge**: as `management@demo.com` open Outstanding Submissions and click Nudge; the RMA's badge updates without refresh. Other roles cannot nudge.
6. **Schedule**: use the Demo clock (Monday 9:00 AM, +2 hours, past deadline) and watch the reminders and the final notice.
7. **Reports / Excel**: RMA, BM or stakeholder -> Reports -> pick station and weeks -> Download Excel report.
8. **Monthly log**: Stations -> Create Log -> Monthly Log tab; the openings show last month's closings (locked). Submit, then open Financial Monitor in either portal.
9. **Onboarding**: `/onboarding/station` -> the station appears in the assigned RMA's Stations tab (Create Log) and in the stakeholder Stations tab.

## Project structure (additions)

```
src/components/shared/      TarValue, StatusBadge, NotificationsList, NotificationWatcher, DemoClockPanel
src/components/management/  layout, dashboard, stations, reports, notifications, pending-approvals, rma-performance
src/components/rma/         notifications
src/components/weekly-logs/ EditRequestModal, AmendReportModal (new) + existing table/page
src/context/                AuthContext, SharedDataContext
src/hooks/                  useNotifications, useAmendments, useSubmissionStatus, useWeeklyReports, ...
src/services/               storage, clock, access, audit, notification, report, amendment, submission, seed, excel, ...
src/routes/                 AppRoutes, guards (RoleGuard), paths
```

Demo authentication only: passwords are plain text in LocalStorage and are not production-grade.


## Public website

- Separate **Home** and **About** pages, a sticky navbar (logo -> Home, Home / About, prominent **Get Started**, mobile menu, active-page indicator) and a **Get Started** page with three options: *RMA* -> `/rma`, *Stakeholder* -> `/management` (existing authentication and role permissions, unchanged), *Onboard a Station* -> `/onboarding/station`.
- Its own identity, using only: yellow `#F8CE2D`, dark green `#04200A`, light green `#9DC356`, dark `#313232`, white (see `tailwind.config.js` -> `pub.*` and the "Public website" block in `src/index.css`). The portals keep their existing brand green.
- **Get Started** (navbar, hero and CTAs) goes straight to the unified Sign In page. Footer: Brand, Navigation, Platform and Support columns that stack on small screens.
- The hero uses your two real screenshots (`src/assets/screenshots/rma-dashboard.jpeg`, `rma-stations.jpeg`) inside browser frames, cropped (never stretched). **Only RMA screenshots were supplied**, so no Management screenshot is shown; add one as another layer in `src/components/public/HeroShowcase.tsx`.
- Motion is CSS + `IntersectionObserver` (Framer Motion is not installed): staged hero entrance, drifting background light, pointer parallax, scroll reveals and a page fade. `prefers-reduced-motion` turns it all off.
- Benefit cards use the `.pub-glass` class: translucent gradient, `backdrop-filter: blur(18px)`, glossy sheen, thin light border, over lit dark green.

## Station onboarding

The form has exactly five business fields: Station Name, Address, Region, Assigned RMA, BM, all required.

- **Assigned RMA**: registered users with the RMA role (full name shown, user id stored). **BM**: registered users with the Business Manager role (full name shown, id stored). Neither is hardcoded in the page.
- Submitting runs `onboardStation()` (`src/services/stationOnboarding.service.ts`): validates, rejects a missing/non-RMA/unknown RMA or BM (no silent fallback), blocks duplicates (same name + address), generates a unique station id and writes ONE record to the shared `rma_system_stations` collection, an onboarding record to `rma_system_station_onboarding`, an audit entry and notifications to the assigned RMA and Management.
- The station is linked through the **existing assignment field `rmaId`** (the RMA's list is `station.rmaId === loggedInUser.id`); the BM is stored in the new `bmId`. Both portals read the same record, so it appears immediately in the RMA's Stations tab (ready for its first weekly report) and in Management.
- No report, exposure or stock is created. `stationCode` and `creditLimit` stay **null** (shown as "Pending" / "Not available") until S4HANA supplies them. Until a credit limit exists, Available Credit for that station's reports is null rather than guessed. Existing stations are untouched; `onboardedAt` and `onboardingStatus` (`Onboarded`) are recorded (existing stations are `Active`).
- **Regions**: the existing data had no region field, so `src/data/regions.json` introduces five Lagos regions (Lagos Island, Lagos Mainland, Lekki-Ajah, Ikeja-Ikorodu, Festac-Badagry) and existing stations were mapped from their names (e.g. Ajah -> Lekki-Ajah). This mapping is my assumption: edit `regions.json` and `stations.json` to match your real structure. The dropdown always includes any region already present on a station.
- Data created by the earlier version is migrated automatically on load (new fields are added; nothing is replaced).

## Portal refinements

- RMA **Weekly Logs** and Management **Stations** now use the shared `SearchInput` / `FilterSelect` / `FilterBar` components: one row, identical 44px height, matching border/radius/typography, search icon inside the input, wrapping on small screens. Search and filter logic is unchanged.
- Thin, light, rounded scrollbars (`#b8c2bd`, hover `#8f9e95`) are applied globally in `src/index.css`.
