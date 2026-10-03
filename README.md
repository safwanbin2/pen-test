# Registry: Student Management System

The four workflows a Registry Administrator uses every day: **enrolment, fees and payments, assessment submission, and marks and results**. Built for a multi-campus UK higher-education provider whose students are often funded by Student Finance England and whose degrees are awarded by partner universities.

**Stack:** Next.js 16 (App Router) · PostgreSQL · Prisma 7 · Tailwind CSS 4 · shadcn/ui · Zod · Vitest

**Contents:** [Run it locally](#run-it-locally) · [What's built](#whats-built) · [How it's built](#how-its-built) · [How I used AI](#how-i-used-ai)

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

Without step 3 the app runs on an empty database and each screen says how to load the demo data. Run `npm run db:seed` again at any time to reset the demo data.

There is no login: switch between Staff and Student in the top bar (as a student, pick who to view as). The role is still enforced on the server.

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

## What's built

- **Enrolment:** search and filters, create and edit, status changes with a required reason and full history. IDs come from a per-year counter in a transaction, so they're never duplicated or reused. Nothing is deleted.
- **Fees and payments:** fees per programme and year, charged in three instalments (25/25/50). Overdue means an instalment is past its due date, not just a balance. Balances are always derived from charges and payments; payments clear the oldest instalment first; references are unique; overpayment becomes credit.
- **Submissions:** PDF/DOCX checked by content, 10 MB limit, every version kept. Late is judged against per-student extensions; an on-time file can't be replaced after the deadline; withdrawn and deferred students can't submit. Deadlines are UK time.
- **Results:** whole-number marks with Fail below 40. Publish or withhold per student and assessment; withholding needs a reason and note. Overdue fees suggest a withhold but never apply one. If a published mark changes, the student keeps seeing the published one until it's re-published.

Every screen works on desktop, tablet (768px) and phone (390px), following the responsive design boards.

Every decision the brief left open is recorded with its reason in [docs/DECISIONS.md](docs/DECISIONS.md). Deliberately out of scope: real authentication, email, attendance and visa monitoring, exam boards, and cloud file storage.

<details>
<summary>Screenshots</summary>

| | |
|---|---|
| ![Student finance](docs/screenshots/02-student-finance.png) | ![Roster and marking](docs/screenshots/03-roster-marking.png) |
| ![Results with fees alert](docs/screenshots/04-results-fees-alert.png) | ![Student view on a phone](docs/screenshots/05-student-mobile.png) |

</details>

## How it's built

```
prisma/schema.prisma       15 tables; money in pence, dates as calendar dates
prisma/seed.ts             demo data, relative to today
src/lib/domain/            business rules as pure functions, with unit tests
src/lib/services/          all database access
src/app/api/               route handlers: role check → Zod validation → service
src/app/staff/, student/   pages (server-rendered)
design/, docs/             UI design source, plan, decisions, UI guide, test report
```

- Every change goes through the API routes below; errors return `{ error: { code, message, fields? } }`.
- Sensitive changes (status, payments, fees, extensions, results) write an audit entry in the same transaction.
- Tests: 83 unit tests for the business rules (`npm test`); browser test results in [docs/TESTING.md](docs/TESTING.md).

| Method | Route | Role | Purpose |
|---|---|---|---|
| POST | `/api/session` | any | Switch demo role / student |
| GET, POST | `/api/students` | staff | List / create |
| GET, PATCH | `/api/students/:id` | staff | Read / edit |
| POST | `/api/students/:id/status` | staff | Change status |
| GET, POST | `/api/students/:id/payments` | staff | Account / record payment |
| PUT | `/api/programmes/:id/fees` | staff | Set a fee |
| GET, POST | `/api/assessments` | staff | List / create |
| POST | `/api/assessments/:id/extensions` | staff | Grant extension |
| POST | `/api/assessments/:id/submissions` | student | Upload |
| GET | `/api/files/:versionId` | staff or owner | Download |
| PUT | `/api/marks` | staff | Enter mark |
| POST | `/api/marks/:id/release` | staff | Publish / re-publish / release / withhold |

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
