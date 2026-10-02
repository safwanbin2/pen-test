# Design brief — Registry (Student Management System)

Design the UI for **Registry**, an internal web app used by the Registry team of a multi-campus UK higher-education provider. The college teaches degrees awarded by partner universities. Many students are funded by Student Finance England, paying tuition in termly instalments. It is a working tool used all day by administrators, not a marketing site. Design it like Linear, Stripe Dashboard or a well-made government service: calm, dense, fast to scan, and honest about status.

## Who uses it and what they need

**Registry Administrator / staff (primary user, desktop, 1440px).** Their day is a queue of exceptions. They need to see straight away:
- who owes money that is past due
- who submitted late
- what is waiting to be marked
- what results are ready to publish or are being withheld, and why

Then they need to act on it in one or two clicks. Every screen should answer "what do I need to do next?"

**Student (secondary user, must also work at 390px mobile).** Needs to:
- submit coursework before a deadline and know it was received
- see whether the submission was late
- see results only once they are released
- see what they owe and when

## Hard constraints (the design must be buildable with exactly this)

- Next.js App Router + **shadcn/ui (Radix base, "Nova" preset)** + **Tailwind CSS v4**. Use only shadcn/ui component patterns: Table, Badge, Card, Dialog, Tabs, Select, Input, Textarea, Alert, Tooltip, DropdownMenu, Separator, Sonner toasts, Button variants. No custom component library and no illustrations.
- Icons: **Lucide** only, used sparingly and always with a text label or tooltip.
- Fonts: **Geist Sans** for UI; **Geist Mono** (or `tabular-nums`) for student IDs, payment references, money and dates in tables.
- Theme tokens expressed as shadcn CSS variables (`--background`, `--foreground`, `--primary`, `--muted`, `--destructive`, `--border`, etc.), plus a small set of extra semantic status tokens. Light mode first; dark mode should work through the same tokens.
- Locale: **en-GB**. Money in GBP (`£9,535.00`). Dates like `14 Oct 2026`; deadlines with time and zone, e.g. `14 Oct 2026, 23:59 (UK time)`.
- No real organisation branding. The product is just called "Registry".
- WCAG 2.2 AA: contrast ≥ 4.5:1 for text, visible focus rings, and **status never shown by colour alone** (always a text label, optionally an icon).

## Do NOT do any of this (it reads as AI-generated)

- No gradients, glassmorphism, glows, blurred blobs, or purple/indigo "AI" palettes.
- No hero sections, welcome banners, illustrations, emoji, or "Good morning, Admin 👋".
- No vanity KPI cards with invented trend arrows or sparklines. A number only appears if it is a queue someone acts on, and it links to that queue.
- No oversized cards with lots of padding showing one number each. Prefer tables and lists.
- No rainbow badge soup. Colour is reserved for meaning (overdue, late, withheld), and everything else is neutral.
- No placeholder "Lorem ipsum" or "John Doe". Use the realistic data below.
- No rounded-everything pill overload; keep radius modest and consistent.

## Design principles

1. **Tables first.** Dense rows (~40px), sticky headers, right-aligned numbers, tabular figures, row click opens the record.
2. **Exceptions stand out; normal is quiet.** Most rows are neutral. Overdue / Late / Withheld use the only strong colours on screen.
3. **One semantic colour system across the whole app** (see below). The same word always has the same badge.
4. **Every destructive or sensitive action asks for a reason** (withdraw student, withhold results) in a Dialog with a required field. Show who did it and when afterwards.
5. **Explain blocked states in plain English** instead of hiding or disabling buttons silently. For example: "Submissions are closed because your enrolment status is Withdrawn. Contact Registry."
6. **Money and time are exact.** Show the amount *and* days overdue; show the deadline *and* time remaining; show an extension *instead of* the original deadline, with the original struck through or noted.

## Status vocabulary (design one badge set and use it everywhere)

| Domain | States | Notes |
|---|---|---|
| Enrolment | Enrolled · Deferred · Withdrawn · Completed | Withdrawn = muted, Deferred = amber outline, Enrolled = neutral/subtle positive, Completed = neutral |
| Fees (instalment / student) | Paid · Due · Overdue · Credit | Overdue is the strongest red in the app; show "21 days" with it |
| Submission | Submitted · Late · Extension · Not submitted · Closed | Late = destructive; Extension = info (blue) with new date in tooltip |
| Result release | Pending · Published · Withheld · Needs re-publish | Withheld shows a reason chip (Fees outstanding / Academic misconduct / Awaiting exam board / Other) |
| Classification | Fail (<40) · Pass (40–59) · Merit (60–69) · Distinction (70+) | Restrained: mark number + label; don't turn this into traffic lights |

## Screens to design

### App shell (both roles)
- Left sidebar nav and a slim top bar.
- **Role switcher** in the top bar: segmented "Staff | Student". In Student mode, also a "Viewing as: Aisha Rahman (SMS-2026-0001)" select.
- A thin, clearly labelled **"Demo mode — role switcher instead of login"** notice that is visible but unobtrusive.
- Staff nav: Dashboard, Students, Fees, Assessments, Results.
- Student nav: Assessments, Results, Account.

### Staff
1. **Dashboard (worklist).** A row of compact queue summaries: Overdue fees · Late submissions (7 days) · Awaiting marking · Marked, not published · Withheld results. Each has a count and links to its filtered list. Below that, the **Overdue fees** table: student, student ID, programme, funding source, amount overdue, days overdue, last payment, action "Record payment". Sorted by days overdue.
2. **Students list.**
   - Search (name, email, student ID), filters (programme, status, academic year, funding) and a "New student" button.
   - Columns: student ID (mono), name + email, programme, year, status badge, funding, balance (with an Overdue badge if relevant).
   - Show an empty state and a "no results for filters" state.
3. **Student profile.**
   - Header: name, `SMS-2026-0001`, status badge, programme, academic year, funding source, and actions (Edit, Change status).
   - Tabs:
     - **Overview**
     - **Finance:** a charges → instalments timeline with Paid/Due/Overdue, a payments table, a balance summary and "Record payment"
     - **Submissions**
     - **Results**
     - **History:** status changes with reason, who changed it and when
4. **New / edit student form.** Full name, email, date of birth, programme, academic year, funding source, status. Inline validation states, including "This email is already registered" and "Student must be at least 16".
5. **Change status dialog.** From → to, required reason, and a warning when withdrawing ("Student will no longer be able to submit work. Outstanding fees remain payable.").
6. **Fees: programme fees.** A table of programme × academic year with the fee amount. When editing, show the note "Changes apply to new charges only; existing students keep the fee they were charged."
7. **Record payment dialog.** Amount (£), payment date (not in the future), reference (unique — show the duplicate-reference error state), method. Show the resulting new balance before confirming.
8. **Assessments list.** Title, module code, deadline (UK time), submitted count / cohort, late count, marked count.
9. **Assessment detail (roster + marking).**
   - One row per student on the programme: submission status badge, submitted time, versions (e.g. "v2"), extension (with new deadline), download, **inline mark input (0–100)** with live classification label.
   - Filters: All / Late / Not submitted / Unmarked.
   - "Grant extension" dialog with a new deadline and a reason.
10. **Results.**
    - Per student: mark summary, release status badge, actions Publish / Withhold.
    - The **Withhold dialog** has a required reason select plus a note.
    - When the student has overdue fees, show an inline **Alert**: "£2,383.75 overdue for 21 days. Consider withholding (Fees outstanding)." with a one-click prefilled action. It must never auto-withhold.
    - A "Needs re-publish" state for when a mark changed after publishing.

### Student (design at 1440 and 390)
11. **My assessments.**
    - Cards or rows: title, module, deadline with relative time ("due in 2 days"), status.
    - Upload area: PDF/DOCX only, 10 MB max. Show the file-type/size error state, the success receipt (file name, time received, version), and the resubmit-before-deadline flow.
    - Late badge after the deadline; extension shown instead of the original deadline.
    - The blocked state for Withdrawn/Deferred students.
12. **My results.**
    - Published: a marksheet table of assessment, module, mark, classification.
    - Not published or withheld: one calm message, "Your results have not been released yet." It must not reveal the marks or the withhold reason.
13. **My account.** Balance, instalment schedule with due dates and Paid/Due/Overdue status, payment history. Read-only, with "Contact Registry" for queries.

## Realistic data to use in the designs

Programmes:
- BA (Hons) Business Management (£9,535 / year)
- LLB (Hons) Law (£9,535 / year)
- BSc (Hons) Computing (£8,250 / year)

Academic year **2026/27**. Instalments are split 25% / 25% / 50%.

| Student | ID | Situation to show |
|---|---|---|
| Aisha Rahman | SMS-2026-0001 | Student Finance; 2nd instalment **21 days overdue**; results **withheld (Fees outstanding)** |
| Daniel Okafor | SMS-2026-0002 | Self-funded, fully paid; resubmitted (v2) before the deadline; **Distinction 74**, published |
| Priya Patel | SMS-2026-0003 | Sponsor; has a balance but **nothing due yet**; one **Fail 35**; results pending |
| Tom Hughes | SMS-2026-0004 | **Late submission** by 1 day 3 hours; Pass 52; published |
| Mariam Hossain | SMS-2026-0005 | **Extension** to 21 Oct; submitted after the original deadline but **not late** |
| James Wilson | SMS-2026-0006 | **Withdrawn** (reason: "Personal circumstances"); submission blocked |
| Sofia Rossi | SMS-2026-0007 | **Deferred** to 2027/28 |
| Chen Wei | SMS-2025-0012 | **Completed**; overpaid → **£120.00 credit**; all published |

Assessments, e.g. "BUS4001 Principles of Management — Report (2,500 words)", "LAW4002 Contract Law — Problem Question", "COM4003 Programming Fundamentals — Portfolio".

## Required states (show them, not just the happy path)

Empty tables, loading skeletons for tables, form validation errors, the duplicate reference (409) error, the upload rejected error, the blocked submission, the withheld/not-released student view, needs re-publish, and success toasts ("Payment of £500.00 recorded. New balance £1,883.75.").

## Deliverables

1. The 13 screens above. Staff screens at 1440px; student screens at 1440px and 390px.
2. A **component and status sheet**: every badge variant from the status vocabulary, table row states (default/hover/selected/exception), buttons, inputs with error, dialogs, alerts, toasts.
3. **Design tokens** as shadcn CSS variables for light (and dark), plus semantic status tokens (e.g. `--status-overdue`, `--status-late`, `--status-withheld`, `--status-info`, `--status-warning`, `--status-success`) with contrast-checked foreground pairs.
4. A short rationale (under 10 bullets) explaining layout and colour choices in terms of the Registry user's workflow.
5. If you output code, use React + Tailwind v4 class names that follow shadcn/ui component APIs, so it can be ported directly into the codebase.
