# UI guide: follow the design

The source of truth for every screen is the Claude Design canvas, pulled into [design/canvas/project/](../design/canvas/project/) (one `*.dc.html` per screen; open the file and read its markup and `<script type="text/x-dc">` data). Live canvas: https://claude.ai/artifact/7Uah6X9XoPaice8LJq56t9. Theme tokens live in [src/app/globals.css](../src/app/globals.css) (original export: [design/registry-globals.css](../design/registry-globals.css)).

**Rules for building any screen**
1. Before building a page, open its design file(s) from the screen map below and match layout, copy, states and data.
2. Build with shadcn/ui components from `src/components/ui` and Tailwind classes. **Never hard-code hex colours.** Map the design's hex values to tokens using the table below.
3. Use the shared components (`StatusBadge`, `Money`, `PageHeader`, `AppShell`) instead of re-styling per page.
4. Copy is part of the design: reuse the exact wording (errors, helper text, empty states) unless it promises something we don't build (see "Deviations").
5. After building a screen, run the app and compare it with the design file before calling it done.

---

## Screen map (design file → route)

| Route | Design file(s) | Notes |
|---|---|---|
| `/staff` | `Main` | Worklist: queue cards + overdue fees table |
| `/staff/students` | `StudentsList`, `StudentsNoResults` | Filters as pill buttons; empty state |
| `/staff/students/new` | `NewStudent` | Error summary on top + inline field errors |
| `/staff/students/[id]` | `StudentProfile` (Finance tab), `StudentHistory` (History tab) | Tabs: Overview, Finance, Submissions, Results, History. Overview/Submissions/Results tabs are not designed: compose them from existing patterns |
| dialog on profile/list | `ChangeStatus` | Destructive button when withdrawing |
| `/staff/fees` | `ProgrammeFees` | Inline row edit; closed years read-only |
| dialog on profile/dashboard | `RecordPayment`, `RecordPaymentDuplicate` | Live "new balance" panel |
| toasts | `Toasts` | Bottom right, two lines (title + detail) |
| `/staff/assessments` | — (not designed) | Table using the roster's table style |
| `/staff/assessments/[id]` | `AssessmentDetail` | Summary line, filter segmented control, roster with inline marks |
| dialog | `GrantExtension` | Original deadline struck through |
| `/staff/results` | `Results`, `ResultsAfter` | Per assessment, per student release status |
| dialog | `WithholdDialog` | Reason prefilled from the fees alert |
| `/student/assessments` | `StudentAssessments` (+ `…Tom`, `…Mariam`, `…James`), `UploadStates`, `Mobile*` | List + side panel (desktop), stacked (mobile) |
| `/student/results` | `StudentResults`, `StudentResultsAisha`, `MobileResults*` | Published marksheet vs "not released yet" |
| `/student/account` | `StudentAccount`, `MobileAccount` | Read-only finance |

Variant boards (`*Tom`, `*Mariam`, `Mobile*`, `*After`, `*Duplicate`) are the same component with different props: read the base file's script for all variants.

---

## Colour: design hex → token

| Design hex | Token / Tailwind class | Used for |
|---|---|---|
| `#115e59` | `primary` (`bg-primary`, `text-primary`, `ring`) | Primary buttons, links, active tab underline, active filter border |
| `#0d4f4b` / `#0b4440` | `hover:bg-primary/90` | Primary hover / link hover |
| `#09090b` | `foreground` | Body text |
| `#52525b` | `muted-foreground` | Secondary text, captions, helper text |
| `#3f3f46` | `sidebar-foreground` / `text-foreground/80` | Inactive nav items |
| `#e4e4e7` | `border` | Card, table and divider borders |
| `#8a8a94` | `input` (`border-input`) | Input, select, outline-button borders |
| `#fafafa` | `sidebar` | Sidebar background |
| `#ececee` | `sidebar-accent` | Active / hover nav item |
| `#f4f4f5` | `muted` / `secondary` | Muted badge bg, outline-button hover, read-only fields |
| `#dc2626` | `destructive` | Destructive button, invalid field border, field error text |
| `#991b1b` | `status-overdue` | Overdue badge (solid), overdue amounts, error-summary heading |
| `#b91c1c` | `status-late` | Late text and badge foreground |
| `#c2410c` | `status-withheld` | Withheld badge (solid) |
| `#92400e` | `status-warning` | Deferred badge, needs re-publish, warning alert text |
| `#15803d` | `status-success` | Enrolled / Paid / Published / receipt icon |
| `#1d4ed8` | `status-info` | Extension badge, info alert icon |
| `#fef2f2` | `status-overdue-subtle` / `status-late-subtle` | Highlighted exception rows, late badge bg, error summary bg |
| `#f0fdf4` | `status-success-subtle` | Success badge bg, success receipt |
| `#fffbeb` | `status-warning-subtle` | Warning alert bg |
| `#eff6ff` | `status-info-subtle` | Info alert bg |
| `#f0f7f6` | `bg-primary/5` | Active filter pill bg |
| Subtle borders (`#bfe3cb`, `#e8a3a3`, `#e4c88f`, `#b9c9f2`) | `border-status-<x>/30` | Borders of subtle badges and alerts |

---

## Status vocabulary → `StatusBadge`

Badge anatomy: `h-5 px-1.5 rounded-sm text-xs font-medium border inline-flex items-center gap-1`. Optional Lucide icon (12px) and an optional suffix after a `·` (e.g. `Overdue · 21 days`). Every badge has a text label; colour is never the only signal.

| Domain | State | Style | Icon |
|---|---|---|---|
| Enrolment | Enrolled | success subtle (`bg-status-success-subtle text-status-success border-status-success/30`) | — |
| | Deferred | warning outline (`border-status-warning text-status-warning bg-transparent`) | — |
| | Withdrawn | muted (`bg-muted text-muted-foreground border-muted`) | — |
| | Completed | neutral (`bg-background text-foreground border-border`) | — |
| Fees | Paid | success subtle | `Check` |
| | Due | neutral, suffix = due date | — |
| | Overdue | **solid** `bg-status-overdue text-status-overdue-foreground`, suffix = days | `AlertTriangle` |
| | Credit | neutral text "Credit £120.00" in the balance cell | — |
| Submission | Submitted | muted (`bg-muted text-foreground`) | `Check` |
| | Late | late subtle (`bg-status-late-subtle text-status-late border-status-late/30`), suffix = `1d 3h` | `Clock` |
| | Extension | info subtle, suffix = new date | — |
| | Not submitted | dashed outline (`border-dashed border-input text-muted-foreground`) | — |
| | Closed | muted | `Lock` |
| Result release | Pending | neutral | — |
| | Published | success subtle | — |
| | Withheld | **solid** `bg-status-withheld text-status-withheld-foreground`, plus a reason chip (neutral badge) | `Lock` |
| | Needs re-publish | warning outline | — |
| | Nothing to release | dashed outline | — |
| Classification | Fail / Pass / Merit / Distinction | **plain text, not a badge**: mark in `font-mono`, label in `text-muted-foreground`; **Fail** in `font-semibold text-foreground` | — |

Exception rows (overdue > 14 days, late, pending result with overdue fees) get `bg-status-overdue-subtle`. Everything else stays white.

---

## Layout

**Staff shell** (`Main`, all staff screens)
- Sidebar `w-56` (224px), `bg-sidebar border-r`, padding `p-2 pb-3`. Brand "Registry" (`text-[15px] font-semibold tracking-tight`, 40px row), section label "Staff" (`text-xs font-medium text-muted-foreground`), nav items `h-8 px-2 rounded-md gap-2` with a 16px Lucide icon, active = `bg-sidebar-accent font-medium` + `aria-current="page"`. Footer: "Signed in as Registry staff (demo)" (`text-xs text-muted-foreground border-t`).
- Nav icons: Dashboard `LayoutDashboard`, Students `Users`, Fees `PoundSterling`, Assessments `FileText`, Results `GraduationCap`.
- Top bar `h-12 px-6 border-b`, space-between: left = demo notice pill (`h-6 px-2 border border-dashed border-input rounded-sm text-xs text-muted-foreground`, `Info` icon, "Demo mode — role switcher instead of login"); right = "View as" + segmented control (`p-0.5 bg-muted border rounded-md`; items `h-[26px] px-3 rounded-sm text-[13px] font-medium`, selected = white bg, border, shadow-xs; `aria-pressed`).
- Main `px-6 pt-5 pb-10 flex flex-col gap-4`. Breadcrumb `text-xs text-muted-foreground` with `ChevronRight` 12px. Page title `text-xl font-semibold tracking-tight` (20/28), subtitle `text-muted-foreground`.

**Student shell** (`StudentAssessments`, `StudentResults`, `StudentAccount`)
- ≥ 640px (`sm:`): same sidebar (nav: Assessments, Results, Account) + top bar with "Viewing as **Aisha Rahman** (SMS-2026-0001)" select and the role switch.
- < 640px: sidebar and top bar hidden; a compact top header ("Registry · Student · Aisha R." + demo notice + role switch) and a **sticky bottom tab bar** (Assessments, Results, Account). Main padding `p-4 pb-6`, single column.
- Assessments page: list + 420px side panel (`grid-cols-[minmax(0,1fr)_420px] gap-6`), stacked on mobile.

**Density and controls**
- Base text 14px (`text-sm`), line height 20px. Small text 12px/16px.
- Inputs, selects, buttons: **32px** (`h-8`), `rounded-md` (6px), inputs `border-input shadow-xs px-2.5`. Primary button `bg-primary text-primary-foreground`; outline button `border-input`; destructive `bg-destructive`.
- Tables: header `text-xs font-medium text-muted-foreground`, rows ~40–44px, `border-b`; numbers right-aligned and `font-mono tabular-nums`; sort indicator as `↓`/`↑` after the header label.
- Cards and panels: `border rounded-lg` (8px), padding 16–20px. Fieldsets in forms: `border rounded-lg p-5` with a `legend` 16px semibold.
- Dialogs: width 480px, `p-6 gap-4 rounded-lg`, close button top right, actions right-aligned (Cancel outline + primary/destructive).
- Alerts: `grid-cols-[16px_1fr] gap-x-3 px-4 py-3 rounded-lg border`; info (blue subtle), warning (amber subtle), destructive (red subtle) with a bold first line.
- Toasts (sonner): bottom right, title + muted second line, optional action ("View receipt").
- Focus: global 2px `ring` outline with 2px offset (already in `globals.css`).

**Typography**
- Geist Sans for UI, **Geist Mono** for student IDs, references, module codes, money, dates in tables and date inputs (13px in mono).
- Money: `£9,535.00` (always two decimals, en-GB grouping). Dates `14 Oct 2026`; with time `14 Oct 2026, 23:59 (UK time)`. Durations `1d 3h` in badges, `1 day 3 hours` in prose. Relative: `Due in 2 days`, `in 102 days`, `Closed 8 days ago`.

---

## Behaviour the design specifies (build it this way)

- **Dashboard**: five queue cards (count + one-line detail) link to filtered lists; overdue table sorted by days overdue, rows > 14 days highlighted; row note under the name ("Results withheld · Fees outstanding", "Withdrawn · fees remain payable").
- **Students list**: search by name, email or student ID; pill filters (Programme, Status, Academic year, Funding) with active state; count label "8 students" / "2 of 8 students"; balance column shows Overdue badge + days, or a muted note ("Nothing due yet", "Next due 1 Feb 2027", "Paid in full"); credit shown as "Credit £120.00"; empty state with "Clear filters".
- **New student**: error summary (`role="alert"`) listing problems as anchor links + inline errors; duplicate email error names the existing student and links to the record; programme helper shows the fee; funding helper shows "Instalments 25% / 25% / 50%"; Student ID shown as "Assigned when you save".
- **Student profile**: header with ID, programme, year, funding, email; actions Edit / Change status; "Needs attention" strip (overdue + withheld); Finance tab = charge summary, instalment timeline, instalments table, payments table, balance sidebar with "Record payment"; History tab = audit table (When, Area, Change from → to badges, Reason, By + role), newest first, read-only, filter by Area.
- **Record payment**: amount validation with helpful messages ("Enter an amount in pounds, for example 500.00", overpay → "becomes credit"); date "Today or earlier"; reference unique (409 message names the other student and date, with a link); "Applied to: oldest unpaid instalment first"; live "New balance after this payment" panel.
- **Programme fees**: table of programmes × years (closed years read-only), "Charged in 2026/27" count, inline edit with "was £X" and the warning "Changes apply to new charges only…" naming affected students.
- **Assessment detail**: summary sentence ("5 / 6 submitted · 4 / 5 marked · 1 extension"), segmented filter (All, Late, Not submitted, Unmarked with counts), roster: student + ID, status badge + note, submitted time, version (tooltip "v2 replaces v1 …"), extension, file download, mark input (0–100, invalid → "Enter 0–100"), classification text, actions menu. Withdrawn row: no mark ("Not required"). Footer: "Marks save as you type · last saved 10:42. Publishing happens in Results."
- **Grant extension**: new date + time (UK time, must be after the original), reason select (required) + note (required); info alert explains lateness is judged against the new deadline.
- **Results**: filtered by assessment + year; count chips (Pending, Published, Withheld, Needs re-publish); per row: mark + classification + mark note, release badge + status note ("Student sees: not yet released", "Student still sees 58 until you re-publish"), actions Publish / Re-publish / Release / Withhold…; overdue-fees alert inside the row with a prefilled "Withhold (Fees outstanding)…" action. Toast after publish.
- **Withhold dialog**: reason select (prefilled when opened from the alert) + required note; "What Aisha will see" panel.
- **Student assessments**: list rows (title, code, module, deadline with struck original if extended, relative time, status badge); side panel for the selected assessment: deadline, time left, upload area, receipt (file, received time, version), late notice, replace-file note; blocked state for withdrawn/deferred students with "Contact Registry".
- **Upload states**: empty drop zone, uploading with progress, success receipt, rejected file ("Only PDF or DOCX files up to 10 MB" + what was wrong + "Nothing was submitted. Your v1 is still on file."), resubmit before deadline.
- **Student results**: published marksheet table, or a single calm "Your results have not been released yet." card (no marks, no reason).
- **Student account**: three summary cards (Overdue now, Next due, Left to pay), instalment schedule, payment history, "Contact Registry".

## Deviations from the design (deliberate)

- **No email is sent** (out of scope), so drop "We've also emailed it to you." from receipts. Keep "Keep this receipt."
- **"Contact Registry"** links to a `mailto:` placeholder address configured in one place.
- Upload progress uses real progress events if cheap; otherwise an indeterminate "Uploading…" state.
- Overview / Submissions / Results tabs on the profile and the assessments list page are not designed; build them from the same table and badge patterns.
- The roster's **"Download all (5)"** button is not built (D31); each submission has its own download.
