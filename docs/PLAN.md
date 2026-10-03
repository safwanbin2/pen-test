# Build plan

The build runs in order. **Every phase ends with a running app, ready for you to commit**, so you can stop after any phase and still have something to submit.

How to use it: tell Claude **"do Phase N"**, or **"do Phase N, P0 only"** if you're short on time. Tasks are tagged `[P0]` / `[P1]` / `[P2]` to match [FEATURES.md](FEATURES.md).

| Phase | What | Depends on | Est. (with AI) |
|---|---|---|---|
| 0 ✅ | Scaffold & infrastructure | — | 30 min |
| 1 ✅ | Schema, domain rules + tests, seed | 0 | 1.5 h |
| 2 ✅ | App shell, role toggle, API plumbing | 1 | 45 min |
| 3 ✅ | Student Enrolment | 2 | 1.5 h |
| 4 ✅ | Fees & Payments (+ overdue on dashboard) | 3 | 1.5 h |
| 5 ✅ | Assessment Submission | 3 | 2 h |
| 6 ✅ | Marksheet & Results | 4, 5 | 1.5 h |
| 7 ✅ | Registry dashboard worklist | 4, 5, 6 | 45 min |
| 8 ✅ | README, decisions, AI log | all | 45 min |
| — | **Minimum complete submission** | | **≈ 10–11 h** |
| 9 | Polish (pick from the list) | 8 | open |

**Fastest path if time is very tight:** do Phases 0 → 1 → 2 → 3 → 4 → 5 → 6 → 8 at **P0 only**, then go back and add P1 items in this order: F-FEE-07 (instalments/overdue), F-RES-06/07 (withhold reasons + fee link), F-ASM-07 (extensions), F-ENR-08 (status history). The schema in Phase 1 already includes the P1 tables, so adding these later won't need a migration rewrite.

---

## Conventions (apply to every phase)

- **Stack:** Next.js (latest stable, App Router, TypeScript, `src/`), Prisma, PostgreSQL 16 via Docker, Tailwind, shadcn/ui, Zod, Vitest.
- **Layout:**
  ```
  prisma/schema.prisma, prisma/seed.ts
  src/app/staff/...        staff pages
  src/app/student/...      student pages
  src/app/api/...          route handlers (all mutations go through here)
  src/lib/db.ts            Prisma client singleton
  src/lib/session.ts       role + actingStudentId from cookie
  src/lib/api.ts           requireStaff(), requireStudent(), error → JSON helpers
  src/lib/domain/*.ts      pure business rules (no Prisma) + *.test.ts
  src/lib/services/*.ts    DB reads/writes used by pages and routes
  storage/uploads/         uploaded files (gitignored)
  ```
- **Reads vs writes:** server components read through `lib/services`. Every write goes through `/api/*` route handlers, with Zod validation and a role check.
- **Errors:** `{ error: { code, message, fields? } }` with 400 / 403 / 404 / 409 / 422.
- **Money:** integer pence. **Time:** stored in UTC, displayed in `Europe/London`.
- **Commits:** done by you, not Claude. At the end of each phase Claude suggests a conventional commit message (e.g. `feat(fees): instalments and overdue calculation`).
- **AI log:** at the end of each phase, add 1–3 lines to `docs/AI_LOG.md`: what AI did, and anything it got wrong that we fixed.

---

## Phase 0 — Scaffold & infrastructure
Features: F-FND-01, F-FND-02, F-FND-03

- [P0] `create-next-app` (TS, App Router, Tailwind, ESLint, `src/`), then init shadcn/ui and add button, input, select, table, badge, card, dialog, form, sonner, tabs.
- [P0] `docker-compose.yml` with Postgres 16 (named volume, port 5432).
- [P0] Prisma installed; `src/lib/db.ts` singleton.
- [P0] `.env.example` (`DATABASE_URL`, `UPLOAD_DIR`, `MAX_UPLOAD_MB`); `.gitignore` covers `.env`, `storage/`.
- [P0] npm scripts: `db:up`, `db:migrate`, `db:seed`, `db:reset`, `test`.
- [P1] Vitest configured.

**Done when:** `docker compose up -d && npm run dev` shows a page, and `npx prisma migrate dev` connects.

---

## Phase 1 — Schema, domain rules, seed
Features: F-FND-02, F-FND-04, F-FND-08, F-FND-09 (schema covers all P0 + P1 tables)

### Schema (`prisma/schema.prisma`)
- `Programme` (code unique, name, level)
- `ProgrammeFee` (programmeId, academicYear e.g. `"2026/27"`, amountPence, unique [programmeId, academicYear])
- `Module` (code unique, title, level) ↔ `ModuleProgramme` (moduleId, programmeId): modules can be shared across programmes (D19)
- `Student` (studentNumber unique, fullName, email unique, dateOfBirth, programmeId, academicYear, status enum, fundingSource enum, timestamps)
- `StudentNumberCounter` (year PK, lastValue)
- ~~`StatusChange`~~ folded into `AuditLog` (D25)
- `FeeCharge` (studentId, academicYear, description, amountPence) → `Instalment` (feeChargeId, sequence, dueDate, amountPence)
- `Payment` (studentId, amountPence, paidOn, reference unique, method enum, note, recordedBy)
- `Assessment` (title, moduleId, academicYear, deadline, createdBy): roster rule D26
- `Extension` (studentId, assessmentId, newDeadline, reason enum, note, grantedBy, unique pair) (D23)
- `Submission` (studentId, assessmentId, unique pair) → `SubmissionVersion` (version, originalName, storedPath, mimeType, sizeBytes, submittedAt)
- `Mark` (studentId, assessmentId, unique pair, score Int, markedBy, updatedAt) + release fields **per student per assessment** (D12/D13): releaseStatus enum PENDING/PUBLISHED/WITHHELD/NEEDS_REPUBLISH, publishedScore Int? (snapshot the student sees), withholdReason enum?, releaseNote, releasedBy, releasedAt
- `AuditLog` (actor, actorRole, area enum ENROLMENT/FEES/RESULTS/SUBMISSIONS, action, entityType, entityId, studentId?, summary, reason?, before Json?, after Json?, createdAt): feeds the profile History tab (D22)
- Indexes on things the app filters by: `Student(status)`, `Student(programmeId)`, `Instalment(dueDate)`, `Assessment(deadline)`.

### Domain rules (`src/lib/domain/`, pure functions, each with Vitest tests)
- `classification.ts`: `classify(score)` → Fail / Pass / Merit / Distinction; rejects scores outside 0–100 or non-integers.
- `finance.ts`: `accountSummary(charges, instalments, payments, today)` → `{ totalCharged, totalPaid, balance, dueToDate, overdueAmount, daysOverdue, credit, nextDue, instalments: [{ status: PAID|DUE|OVERDUE, paidAmount, daysOverdue }] }`. Payments are allocated to the oldest unpaid instalment first (D20). `previewPayment(summary, amount)` powers the "new balance after this payment" panel.
- `submission.ts`: `effectiveDeadline(assessment, extension?)`, `canSubmit({ studentStatus, existing, now, effectiveDeadline })` → `{ ok } | { ok: false, reason }`, `isLate(submittedAt, effectiveDeadline)`.
- `studentNumber.ts`: `formatStudentNumber(year, n)` → `SMS-2026-0001`.
- `academicYear.ts`: `academicYearFor(date)`, with 1 September as the boundary.
- `enrolment.ts`: allowed status transitions (e.g. Withdrawn → Enrolled requires a reason; Completed is final).

### Seed (`prisma/seed.ts`)
All dates are **relative to today**, so overdue and late flags still hold whenever a reviewer runs it. Idempotent (wipe + insert).

- 3 programmes (e.g. BA Business Management, LLB Law, BSc Computing) with fees for the current and previous academic year, 2 modules each, and 1–2 assessments per module (some past deadline, some open).
- Instalment plan: 3 instalments (25% / 25% / 50%).
- **Match the designs**: the students, amounts and stories in the table below come from the design canvas (UI_GUIDE.md), which supersedes the brief's data table.

The demo data reproduces the design's screens (see [UI_GUIDE.md](UI_GUIDE.md)). The design's "today" is Thu 22 Oct 2026; the seed keeps the same **offsets from today** (e.g. the BUS4001 deadline is today − 8 days), so the numbers below hold whenever it runs.

Programmes and fees (2025/26 → 2026/27): BA (Hons) Business Management £9,250 → £9,535 · LLB (Hons) Law £9,250 → £9,535 · BSc (Hons) Computing £8,000 → £8,250. BUS4001 Principles of Management is a shared Level 4 module on all three.

| Student | ID | Programme · funding | Story it demonstrates |
|---|---|---|---|
| Aisha Rahman | SMS-2026-0001 | Business · Student Finance | Instalment 2 (£2,383.75) **21 days overdue**; balance £7,151.25; BUS4002 58 **withheld: Fees outstanding** (by Hannah Price); BUS4001 61 Merit **pending**, so Results shows the overdue-fees alert |
| Daniel Okafor | SMS-2026-0002 | Business · Self-funded | Paid in full; BUS4001 **v2** resubmitted before deadline; **74 Distinction**, published; BUS4004 v2 receipt |
| Priya Patel | SMS-2026-0003 | Computing · Sponsor | Balance £8,250 but **nothing due yet**; BUS4001 **35 Fail**, pending |
| Tom Hughes | SMS-2026-0004 | Law · Self-funded | BUS4001 **late by 1d 3h**; 52 Pass, published; part-paid → £883.75 overdue 4 days |
| Mariam Hossain | SMS-2026-0005 | Law · Student Finance | **Extension** to deadline + 7 days; submitted before it → **not late**; mark changed 58 → 64 → **needs re-publish** |
| James Wilson | SMS-2026-0006 | Computing · Student Finance | **Withdrawn** (reason "Personal circumstances"); submissions blocked; due fees remain payable (D21) |
| Sofia Rossi | SMS-2026-0007 | Business · Self-funded | **Deferred** to 2027/28; balance £0 |
| Chen Wei | SMS-2025-0012 | Computing · Self-funded | **Completed** 2025/26; overpaid → **credit £120.00** |

Also seed: staff names for history (Hannah Price, Registry Officer; Owen Grant, Registry Administrator), payment references from the design (e.g. `SFE-2026-118204`, `BACS-77812` for the duplicate-reference demo), more assessments per module (BUS4003, BUS4004, LAW4002, COM4003), and set the 2025 student-number counter so Chen is `SMS-2025-0012`.

**Done when:** `npm run db:setup` migrates and seeds on a fresh database for **both** Docker (`db:up`) and the no-Docker option (`db:local`), and `npm test` passes.

---

## Phase 2 — App shell, role toggle, API plumbing
Features: F-FND-05, F-FND-06, F-FND-07, F-FND-10

- [P0] Header with a role switch (Staff / Student) and, in Student mode, a "Viewing as: <student>" select. Stored in a cookie via `POST /api/session`.
- [P0] `/` redirects to `/staff` or `/student` depending on the role. Staff nav: Dashboard, Students, Fees, Assessments, Results. Student nav: Assessments, Results, Account.
- [P1] `lib/api.ts`: `requireStaff()` / `requireStudent()` (403), `parseBody(schema)` (400 with field errors), a Prisma error mapper (P2002 → 409, P2025 → 404).
- [P1] `lib/audit.ts`: `audit(tx, { action, entityType, entityId, before, after })`, called inside the same transaction as the change.
- [P1] A banner that makes clear this is a demo role toggle, not authentication.

**Done when:** switching roles changes the nav, and a student-cookie call to a staff API returns 403.

---

## Phase 3 — Student Enrolment
Features: F-ENR-01 … F-ENR-11

- [P0] `/staff/students`: table with search (name, email, student number) and filters (programme, status, academic year). Filters live in the URL query.
- [P0] `/staff/students/new` + `POST /api/students`: form with Zod validation; the student number is generated on the server.
- [P0] `/staff/students/[id]` + `PATCH /api/students/[id]`: edit details.
- [P1] Student number from `StudentNumberCounter` via an upsert + increment inside `$transaction`.
- [P1] `POST /api/students/[id]/status`: requires a reason, checks the transition, writes a `StatusChange` + audit entry.
- [P1] Duplicate email → 409 shown on the field; DOB → age ≥ 16.
- [P1] Funding source field; status badges with consistent colours.
- [P1] On create, charge the programme fee for that academic year and generate 3 instalments (shared with Phase 4).
- [P2] Pagination.

**Done when:** you can create, find, edit and withdraw a student, and the history shows the reason.

---

## Phase 4 — Fees & Payments
Features: F-FEE-01 … F-FEE-12, F-STU-03, F-DSH-01

- [P0] `/staff/fees`: programme fees per academic year (view/edit) via `PUT /api/programmes/[id]/fees`.
- [P0] Finance panel on the student page: charges, instalments (paid / due / overdue badges), payments, balance.
- [P0] `POST /api/students/[id]/payments`: amount (£ input → pence), date, reference, method.
- [P0] `/staff` dashboard (first version): **Overdue fees** table with student, amount overdue, days overdue and funding source, sorted by days overdue.
- [P1] Unique reference → 409; amount > 0; date not in the future; payments on Withdrawn students allowed (debt still exists).
- [P1] Credit shown when overpaid.
- [P1] Changing a programme fee affects **new** charges only (show a note in the UI).
- [P1] `/student/account`: read-only balance, instalments, payments.
- [P2] Adjustments (discount/scholarship) as negative charges.

**Done when:** recording a payment updates the balance straight away, and Aisha shows as overdue while Priya doesn't.

---

## Phase 5 — Assessment Submission
Features: F-ASM-01 … F-ASM-13, F-STU-01

- [P0] `/staff/assessments` list + create (`POST /api/assessments`: title, module, deadline as a London-time input → UTC).
- [P1] Seed sample files for the seeded submissions so downloads work (D27).
- [P0] `/student/assessments`: assessments for the student's programme, with status: Open / Submitted / Submitted late / Closed / Not submitted.
- [P0] `POST /api/assessments/[id]/submissions` (multipart): stores the file in `UPLOAD_DIR`, creates or updates the `Submission`, adds a `SubmissionVersion`.
- [P0] Late badge (red) wherever a submission appears.
- [P1] Magic-byte check (`%PDF` / DOCX zip containing `word/document.xml`), 10 MB limit, safe stored filename (uuid).
- [P1] `canSubmit` rules: must be Enrolled; after the effective deadline, allowed only if there is no earlier submission.
- [P1] `/staff/assessments/[id]`: every student on the programme with status, version count, submitted time, late flag; filter by Late / Not submitted.
- [P1] Grant extension dialog (`POST /api/assessments/[id]/extensions`) with a reason; the late flag is recalculated.
- [P1] `GET /api/submissions/[versionId]/file`: staff, or the owning student.

**Done when:** Tom shows as late, Mariam isn't late because of her extension, and James is blocked with a clear message.

---

## Phase 6 — Marksheet & Results
Features: F-RES-01 … F-RES-09, F-STU-02

- [P0] Marks entry on `/staff/assessments/[id]`: an integer input per student (`PUT /api/marks`), with the classification badge shown next to it.
- [P0] `/staff/results`: per student, their marks, release status and **Publish** / **Withhold** actions (`POST /api/students/[id]/results`).
- [P0] `/student/results`: marksheet only when PUBLISHED; otherwise "Results not yet released".
- [P1] Withhold dialog with a required reason (enum) and optional note; audited.
- [P1] If the student has overdue fees: warning "£X overdue for N days, consider withholding (fees outstanding)", with the action pre-filled. Never automatic.
- [P1] Mark changed after publishing → release status becomes `NEEDS_REPUBLISH` (the student keeps seeing the last published snapshot or "not released"; decide and record in DECISIONS), and the change is audited.
- [P1] The student view never shows the withhold reason or any mark values while withheld.
- [P2] Grid marksheet (students × assessments) for fast entry.

**Done when:** Aisha's results are withheld with a reason, Daniel sees his Distinction, and Priya sees "not yet released".

---

## Phase 7 — Registry dashboard worklist
Features: F-DSH-02, F-DSH-03, (F-DSH-04)

- [P1] Tiles: Overdue fees · Late submissions (last 7 days) · Awaiting marking · Marked, not published · Withheld (by reason).
- [P1] Each tile links to a filtered list page.
- [P2] Enrolment counts by status and programme.

**Done when:** the dashboard answers "what needs my attention today?" without clicking into anything.

---

## Phase 8 — Docs & submission
Features: F-DOC-01 … F-DOC-05

- [P0] README: overview, stack, **run locally** (clone → `cp .env.example .env` → `docker compose up -d` → `npm i` → `npm run db:reset` → `npm run dev`), **env vars** table, **AI usage**.
- [P1] README → **Decisions & trade-offs** (condensed from `docs/DECISIONS.md`).
- [P1] README → **Demo walkthrough**: the seeded students table plus "what to click".
- [P1] README → **What I'd build next** / **Out of scope**.
- [P1] `docs/AI_LOG.md` tidied up: tools used, how prompts were structured, 3+ concrete corrections.
- [P0] Final check on a clean clone: fresh DB, seed, run, `npm test`, `npm run build` passes.

**Done when:** a reviewer can go from clone to seeded app in under 5 minutes by following the README only.

---

## Phase 9 — Polish (pick any, in this order of value)
1. F-DOC-06 Live deployment (Vercel + Neon), link at the top of the README.
2. F-DOC-07 3-minute Loom walking through the seeded stories.
3. F-RES-10 Grid marksheet.
4. F-ENR-12 Student 360° profile page.
5. F-DOC-08 Playwright smoke test (create student → pay → submit → mark → publish).
6. F-FEE-13/14 Payment methods, adjustments.
7. Empty/loading/error states and mobile layout pass.
