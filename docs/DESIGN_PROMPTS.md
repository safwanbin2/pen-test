# Claude Design — prompt sequence

Use these in order, in **one** Claude Design project, so every screen inherits the same system.

Attach [DESIGN_BRIEF.md](DESIGN_BRIEF.md) to Prompt 1. After each prompt, check the output against the **Review checklist** at the bottom before moving on. Allow at most two correction rounds per prompt.

---

## Prompt 1 — Foundations (tokens + component/status sheet)

```
I'm attaching a design brief for "Registry", an internal Student Management System for a UK higher-education Registry team. Read all of it, especially the constraints, the "Do NOT do" list, the status vocabulary and the realistic data.

Do NOT design screens yet. In this step produce only the foundations:

1. Design tokens as shadcn/ui CSS variables (light and dark): background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, radius, plus chart-free semantic status tokens: --status-success, --status-warning, --status-info, --status-overdue, --status-late, --status-withheld, each with a foreground pair that passes WCAG AA. Neutral, calm base palette (zinc/slate family); one restrained primary colour; red reserved for Overdue/Late; no purple/indigo.
2. Typography scale for a dense admin tool (base 14px): page title, section title, table header, body, caption, mono (IDs, references, money).
3. A component and status sheet showing every badge from the brief's status vocabulary (Enrolment, Fees, Submission, Result release, Classification), buttons (all shadcn variants and sizes), input/select/textarea including error and disabled states, a table with default/hover/selected/exception rows, a dialog with a required "reason" field, alerts (info/warning/destructive), toasts, an empty state and a table loading skeleton.

Render everything with shadcn/ui (Radix, Nova preset) conventions, Tailwind v4, Lucide icons, Geist Sans + Geist Mono. Output the tokens as a single copy-pasteable CSS block (:root and .dark).
```

## Prompt 2 — The two anchor screens

```
Using exactly these foundations, design the two screens that set the pattern for the rest of the app, at 1440px:

1. Staff Dashboard (worklist): app shell (sidebar + top bar with Staff|Student role switcher and the "Demo mode — role switcher instead of login" notice), a compact row of queue links (Overdue fees, Late submissions (7 days), Awaiting marking, Marked not published, Withheld results) each with a count, then the Overdue fees table sorted by days overdue. Use the seed students: Aisha Rahman must be the obvious top exception (£2,383.75, 21 days overdue, Student Finance).

2. Assessment detail — "BUS4001 Principles of Management — Report (2,500 words)", deadline 14 Oct 2026, 23:59 (UK time): header with deadline and counts, filter tabs (All / Late / Not submitted / Unmarked), and a roster table with submission status, submitted time, version (v2), extension, download, inline 0–100 mark input with live classification label. Show Daniel (v2, Distinction 74), Tom (Late by 1 day 3 hours, Pass 52), Mariam (Extension to 21 Oct, not late), Priya (Fail 35), James (Withdrawn, no submission), and one unmarked row. Include the "Grant extension" dialog as a second frame.

Normal rows stay neutral; only Overdue, Late and Withheld use strong colour.
```

## Prompt 3 — Students (staff)

```
Same system and shell as the Dashboard and Assessment screens. Design at 1440px:

1. Students list: search (name, email, student ID), filters (programme, status, academic year, funding), "New student" button; columns: student ID (mono), name + email, programme, year, status badge, funding, balance (+ Overdue badge where relevant). Also show the "no results for these filters" state.
2. Student profile for Aisha Rahman (SMS-2026-0001): header with status, programme, year, funding and actions (Edit, Change status); tabs Overview, Finance, Submissions, Results, History. Show the Finance tab open: charge → 3 instalments (25/25/50) timeline with Paid / Overdue (21 days) / Due, payments table, balance summary, "Record payment" button.
3. Same profile, History tab: status changes with from → to, reason, who and when.
4. New student form with inline validation errors ("This email is already registered", "Student must be at least 16").
5. Change status dialog: Enrolled → Withdrawn with required reason and the warning "Student will no longer be able to submit work. Outstanding fees remain payable."
```

## Prompt 4 — Fees and Results (staff)

```
Same system. Design at 1440px:

1. Programme fees: table of programme × academic year (2025/26, 2026/27) with amounts, edit state showing the note "Changes apply to new charges only; existing students keep the fee they were charged."
2. Record payment dialog for Aisha: amount (£), payment date, reference, method, and a live "New balance after this payment" line. Second frame: duplicate reference error ("Reference BACS-77812 is already recorded for Daniel Okafor on 2 Oct 2026").
3. Results page: one row per student with mark summary, release status badge (Pending / Published / Withheld / Needs re-publish) and Publish / Withhold actions. Aisha's row shows the inline alert "£2,383.75 overdue for 21 days. Consider withholding (Fees outstanding)" with a prefilled action — never automatic.
4. Withhold dialog: required reason select (Fees outstanding / Academic misconduct / Awaiting exam board / Other) + note, explaining that the student will only see "Results not yet released".
5. Success toasts: "Payment of £500.00 recorded. New balance £1,883.75." and "Results published for Daniel Okafor."
```

## Prompt 5 — Student views (desktop + mobile)

```
Same system, Student role (shell shows "Viewing as: <student>"). Design each at 1440px AND 390px:

1. My assessments (as Daniel): list with title, module, deadline + relative time ("due in 2 days"), status. Upload panel: PDF/DOCX only, 10 MB max; states: empty drop zone, uploading, success receipt (file name, received time, version v2), rejected file ("Only PDF or DOCX files up to 10 MB"), resubmit-before-deadline.
2. My assessments (as Tom): a Late badge on a submitted assessment, with the deadline and the submitted time shown.
3. My assessments (as Mariam): extension shown instead of the original deadline (original noted/struck through).
4. My assessments (as James, Withdrawn): blocked state in plain English — "Submissions are closed because your enrolment status is Withdrawn. Contact Registry."
5. My results: published marksheet (Daniel) vs not released (Aisha) — the not-released view must reveal no marks and no withhold reason.
6. My account (Aisha): balance, instalment schedule with Paid / Overdue / Due, payment history, "Contact Registry" link.
```

## Prompt 6 — Consistency audit and handoff spec

```
Audit every screen in this project against the brief and fix inconsistencies: same badge for the same status everywhere, same table density and alignment (numbers right-aligned, tabular figures), same dialog structure, same spacing scale, AA contrast, no colour-only status, no items from the "Do NOT do" list.

Then produce a handoff spec as a single document:
1. Final tokens CSS block (:root and .dark), ready to paste into globals.css.
2. Component inventory: each UI pattern used → the shadcn/ui component(s) it maps to → variants/props → where it's used.
3. Status badge mapping table: domain + state → token + icon (Lucide name) + label.
4. Screen index: screen name → intended route (/staff, /staff/students, /staff/students/[id], /staff/students/new, /staff/fees, /staff/assessments, /staff/assessments/[id], /staff/results, /student/assessments, /student/results, /student/account) → key components.
5. Layout rules: sidebar width, content max width, page padding, table row height, spacing scale, breakpoints.
6. Under 10 bullets of design rationale tied to the Registry workflow.
```

---

## Corrective prompts (use when needed)

- "Too much colour. Normal rows must be neutral; colour only for Overdue, Late and Withheld."
- "Increase density: 40px table rows, smaller headings, less card padding. This is used all day."
- "Replace the KPI cards with compact queue links: label + count, linking to a filtered list. No trend arrows."
- "This doesn't match the foundations from step 1. Use the same tokens, badges and table style."
- "Remove decorative elements: no gradients, illustrations, emoji, or welcome text."
- "Status must not rely on colour alone. Every badge needs a text label."

## Review checklist (after every prompt)

- [ ] What needs action is obvious within 5 seconds; everything else is calm.
- [ ] Same status → same badge on every screen.
- [ ] Money, IDs and references are monospaced/tabular and right-aligned in tables.
- [ ] Real seed data used; numbers add up (£9,535 × 25% = £2,383.75).
- [ ] Nothing from the brief's "Do NOT do" list.
- [ ] Buildable with stock shadcn/ui components (nothing exotic).
- [ ] Student screens work at 390px.
