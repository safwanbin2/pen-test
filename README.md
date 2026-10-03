# Registry: Student Management System

The four workflows a Registry Administrator uses every day: **enrolment, fees and payments, assessment submission, and marks and results**. Built for a multi-campus UK higher-education provider whose students are often funded by Student Finance England and whose degrees are awarded by partner universities.

**Stack:** Next.js 16 (App Router) · PostgreSQL · Prisma 7 · Tailwind CSS 4 · shadcn/ui · Zod · Vitest

![Registry dashboard: what needs action today](docs/screenshots/01-dashboard.png)

---

## Run it locally

Requirements: **Node 22+** and a PostgreSQL database. Docker is optional.

```bash
cp .env.example .env     # local-only defaults, no secrets
npm install              # also generates the Prisma client

# 1. Start a database (pick one option below)
npm run db:up

# 2. Run the app: applies any pending migrations, then starts Next.js
npm run dev              # http://localhost:3000

# 3. Load the demo data (separately, whenever you want it)
npm run db:seed
```

Without step 3 the app runs on an empty database and each screen says how to load the demo data. Run `npm run db:seed` again at any time to reset to the demo stories below.

**About `npm install`'s audit warning:** `npm audit --omit=dev` reports **0 vulnerabilities** in what the app ships. The "8 high" shown for the full tree are a single advisory in `braces`, which has no patched release yet and is only reached through development tools (ESLint and the shadcn CLI). Two Prisma CLI sub-dependencies are pinned to patched versions via `overrides` in `package.json`.

### Database: pick one

The app only reads `DATABASE_URL`.

| Option | You need | Start it | `DATABASE_URL` |
|---|---|---|---|
| **A. Docker** (default) | Docker | `npm run db:up` | already set in `.env.example` |
| **B. No Docker, nothing to install** | only Node | `npm run db:local` (Prisma's embedded Postgres) | uncomment the Option B line in `.env` |
| **C. Your own Postgres 14+** | local install, Neon, Supabase, … | — | your own connection string (the database is created on first run if the user may create it) |

`npm run db:check` confirms the connection.

### Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `DATABASE_URL` | Prisma connection string | `postgresql://sms:sms@localhost:5432/sms?schema=public` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` / `POSTGRES_PORT` | Only used by `docker-compose.yml` | `sms` / `sms` / `sms` / `5432` |
| `UPLOAD_DIR` | Where submitted files are stored | `storage/uploads` |
| `MAX_UPLOAD_MB` | Upload size limit | `10` |

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Apply pending migrations, then start Next.js in development |
| `npm run build` / `start` | Production build / server |
| `npm run db:up` / `db:down` | Postgres in Docker |
| `npm run db:local` / `db:local:stop` | Prisma's embedded Postgres (no Docker) |
| `npm run db:seed` | Load (or reset to) the demo data |
| `npm run db:studio` | Browse the data in Prisma Studio |
| `npm test` | 83 unit tests for the business rules |
| `npm run lint` / `typecheck` | ESLint / TypeScript |

---

## Demo walkthrough

**Roles:** use the **Staff | Student** switch in the top bar. As a student, pick who to view as. This is a demo toggle instead of login, but **the role is enforced on the server** in every page and API route.

The seed creates 8 students, each showing one situation a Registry team deals with. All dates are relative to today, so the stories hold whenever you run it.

| Student | What to look at |
|---|---|
| **Aisha Rahman** | Instalment 2 is **21 days overdue** (dashboard, Students list, Finance tab). An earlier result is **withheld for fees**. On **Results → BUS4001**, her pending mark shows the **"Consider withholding" alert**: one click pre-fills the withhold. Nothing is automatic. As a student she sees only "Your results have not been released yet." |
| **Daniel Okafor** | Paid in full. **Resubmitted** BUS4001 before the deadline (v2 replaces v1, both kept). 74 Distinction, published. |
| **Priya Patel** | Sponsor-funded: owes £8,250 but **nothing is due yet**, so she is *not* flagged as overdue. A **Fail (35)** waiting to be published. |
| **Tom Hughes** | Submitted **1 day 3 hours late**: accepted and flagged. Part-paid an instalment, so £883.75 is overdue. |
| **Mariam Hossain** | Has an **extension**: submitted after the original deadline but **not late**. Her mark was **changed after publishing** (58 → 64), so it's "Needs re-publish" and she **still sees 58** until staff re-publish. |
| **James Wilson** | **Withdrawn**: submissions are blocked with a plain-English reason; later instalments were cancelled, but **the one already due is still payable**. |
| **Sofia Rossi** | **Deferred** to next year, so not charged yet. |
| **Chen Wei** | **Completed** last year and overpaid, so **£120 credit**. Completed records are final. |

**Things to try:**
- **Record a payment** for Aisha (dashboard → *Record payment*). Watch the live "after this payment" preview. Then try reference **`BACS-77812`**, which is already used: you get a 409 that names the other student.
- **Create a student** with Aisha's email (any capitalisation) and a 2011 date of birth: both problems are listed at once. Fix them and the student gets the next ID (`SMS-2026-0008`), with the fee charged in three instalments.
- **Withdraw a student** (*Change status* requires a reason). Then check their **History** tab.
- **Mark work** on *Assessments → BUS4001*: marks save as you type, "Enter 0–100" for anything else. **Grant an extension** from the row menu.
- **As a student**, upload a PDF/DOCX. A renamed `.pages` file is rejected by its content, not its name. Try a phone-width window too.

| | |
|---|---|
| ![Student finance](docs/screenshots/02-student-finance.png) | ![Roster and marking](docs/screenshots/03-roster-marking.png) |
| ![Results with fees alert](docs/screenshots/04-results-fees-alert.png) | ![Student view on a phone](docs/screenshots/05-student-mobile.png) |

---

## What's built, against the brief

| Brief | Built | Edge cases handled without being asked |
|---|---|---|
| **1. Enrolment:** create student, ID like `SMS-2025-0001`, four statuses, search and filter | Students list (search by name, email or ID; filters for programme, status, year and funding, kept in the URL), new/edit form, profile with Overview, Finance, Submissions, Results and History tabs | ID from a **per-year counter in a transaction** (safe under concurrent enrolment, never reused); **no deletes**, so withdrawal is a status change with a **required reason**; allowed transitions (Completed is final); duplicate email (case-insensitive) and age ≥ 16 checks, **all reported at once**; full audit history |
| **2. Fees & payments:** fee per programme, payments, live balance, overdue flag | Programme fees per academic year, instalment plans, payment recording with live preview, dashboard overdue list, student account page | **"Overdue" needs due dates**, so fees are charged in **instalments (25/25/50)** and overdue = due-to-date − paid; a balance with nothing due isn't overdue; balance **always derived** (never stored, integer pence); payments clear the **oldest instalment first**; **unique payment references** (409); future-dated payments rejected; overpayment becomes **credit**; fee changes apply to **new charges only**; withdrawal cancels only future instalments |
| **3. Assessment submission:** create assessments, upload PDF/DOCX, one submission with resubmission, late flag | Assessment list and create, roster with filters (Late / Not submitted / Unmarked), student upload with progress and receipt | File type checked by **content (magic bytes)**, 10 MB limit; **every version kept**; late is judged against a **per-student extension**; once the deadline passes, an on-time file **can't be replaced**; withdrawn or deferred students **blocked** with a reason; deadlines stored in UTC and shown in **UK time** (tested across the clock change); students can only download their own files |
| **4. Marksheet & results:** 0–100 marks, Pass/Merit/Distinction, publish/withhold per student, students see published only | Inline marking, Results screen per assessment with Publish / Re-publish / Release / Withhold, student marksheet | Explicit **Fail < 40**; whole-number marks (no 69.5 ambiguity); classification **derived, not stored**; withhold needs a **reason and note**; **overdue fees prompt a withhold, never apply one**; changing a published mark → **"Needs re-publish"** and the student **keeps seeing the last published mark**; the student view never reveals withheld marks, reasons or notes |
| Seed, README, role separation | 8 students, 3 programmes, fees, payments, submissions, marks and history | Seed dates relative to today; seeded submissions have real downloadable files |

---

## How it's built

```
prisma/schema.prisma       15 tables; money in pence, calendar dates as @db.Date
prisma/seed.ts             demo stories, relative to today
src/lib/domain/            pure business rules + Vitest tests (no database)
src/lib/services/          all database access, used by pages and API routes
src/app/api/               JSON route handlers: role check → Zod → service → JSON
src/app/staff/, student/   server-rendered pages; client components only where interactive
src/components/            StatusBadge (one status vocabulary), tables, shells
design/                    the Claude Design source the UI was built from
docs/                      plan, decisions, UI guide, AI log
```

- **Business rules are pure functions** with 83 tests: fee allocation and overdue days, lateness and extensions, submission rules, enrolment transitions, result release, UK time zone handling (including both 2026 clock changes), file type detection, money parsing. The tests use the demo's own figures (e.g. Aisha: £7,151.25 balance, £2,383.75 overdue for 21 days).
- **Every change goes through an API route** with a server-side role check, Zod validation and one error shape: `{ error: { code, message, fields? } }` with 400/403/404/409/422. Sensitive changes write an **audit row in the same transaction**.
- **Pages read through the service layer** and render per request, so data is never stale.
- **End-to-end tested in a real browser:** 137 checks across every workflow; see [docs/TESTING.md](docs/TESTING.md) for the matrix and the bugs it caught.

### API routes

| Method | Route | Role | Purpose |
|---|---|---|---|
| POST | `/api/session` | any | Switch demo role / student |
| GET, POST | `/api/students` | staff | List / create (ID generated, fee charged) |
| GET, PATCH | `/api/students/:id` | staff | Read / edit details |
| POST | `/api/students/:id/status` | staff | Change status (reason required) |
| GET, POST | `/api/students/:id/payments` | staff | Account / record a payment |
| PUT | `/api/programmes/:id/fees` | staff | Set a fee for the current or a future year |
| GET, POST | `/api/assessments` | staff | List / create |
| POST | `/api/assessments/:id/extensions` | staff | Grant or change an extension |
| POST | `/api/assessments/:id/submissions` | student | Upload (multipart) |
| GET | `/api/files/:versionId` | staff or owner | Download a submitted file |
| PUT | `/api/marks` | staff | Enter or change a mark |
| POST | `/api/marks/:id/release` | staff | Publish / re-publish / release / withhold |

---

## Decisions and trade-offs

The brief leaves a lot open; every choice is recorded with its reason in [docs/DECISIONS.md](docs/DECISIONS.md) (33 decisions). The ones that matter most:

- **Overdue needs due dates (D1).** Fees are split into instalments; only instalments past their due date count as overdue.
- **Nothing about money is stored as a total (D3, D20).** Balance, overdue amount and "which instalment a payment paid" are derived from charges and payments every time.
- **Results are released per student, per assessment (D12),** and withholding for fees is **suggested, never automatic**. UK consumer guidance (CMA) limits withholding results to tuition-fee debt, and a person should make that call.
- **A changed published mark doesn't silently change what the student sees (D13).**
- **Modules can be shared across programmes (D19)**, as first-year modules often are.
- **Withdrawal keeps due fees payable and cancels future ones (D21).** A real provider would apply its own fee-liability rules here.
- **Docker is optional (D18).**

**Out of scope, deliberately:** real authentication/SSO, email notifications, attendance and UKVI monitoring, exam boards and degree classification across modules, a Student Finance data feed, object storage for files (local disk, behind a small storage module), and "download all" as a zip.

**What I'd build next:** real authentication with staff roles (Registry vs academic markers), a configurable instalment plan per funding source, bulk publish with a review step, an SFE payment import, and object storage with a deploy to Vercel + a managed Postgres.

---

## How I used AI

I used **Claude Code** (in VS Code) for research, planning, design handoff and implementation, and **Claude Design** for the UI. I treated AI as a fast pair, not an oracle: I set the direction, reviewed every change, and verified behaviour in a real browser and with tests.

1. **Research and planning.** Researched PEN Group's context (franchised UK higher education, multi-campus, Student Finance-funded students), then wrote a prioritised [feature list](docs/FEATURES.md), a [phased plan](docs/PLAN.md) and a [decisions log](docs/DECISIONS.md) before any code.
2. **Design.** Wrote a structured [design brief](docs/DESIGN_BRIEF.md) and [six staged prompts](docs/DESIGN_PROMPTS.md) for Claude Design (with an explicit "don't make it look AI-generated" list). Claude Code then read the resulting canvas directly, saved every screen into [`design/`](design/), and wrote a [UI guide](docs/UI_GUIDE.md) (screen-to-route map, colour tokens, one status vocabulary) that Claude Code loads automatically, so every screen was built to the design.
3. **Build in phases.** Schema and tested business rules first, then each workflow. Each screen was compared with its design file in a real browser, and each workflow exercised end to end.

**Where the AI was wrong, and how it was caught** (more in [docs/AI_LOG.md](docs/AI_LOG.md)):
- npm's "latest" Prisma was a **release candidate**; pinned the stable version.
- The design tool's CSS would have **broken the installed components**; merged it instead of pasting it in.
- Passing icon components across the **server/client boundary** crashed the page; fixed after browser testing.
- `Intl` printed **"Sept"**, but the design says "Sep"; replaced with a tested formatter.
- The seed had Aisha's result already withheld, so **the key fees alert never showed**; found by using the app, fixed in the data.
- The server reported **only the first form error**; now all problems are reported together.
- I checked that a student's withheld mark **doesn't appear anywhere in their page's HTML**, rather than assuming it.
