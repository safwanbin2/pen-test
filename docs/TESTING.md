# End-to-end test report

**How:** every feature was exercised in a real Chromium browser driven by Playwright (through Claude Code's Playwright MCP), starting from a fresh `npm run db:seed`. Each check performed the action a Registry user or student would (clicking, typing, uploading files) and read back what the page showed. API rules were also probed directly to confirm they hold without the UI. Unit tests (`npm test`, 86) cover the business rules separately.

**Result:** 137 checks across 13 areas, all passing after fixes. Testing found **3 bugs and 4 rough edges**, all fixed and re-tested (listed at the end). The browser logged no runtime errors; the only console errors were the 4xx responses that negative tests caused on purpose.

| Area | Checks | What was verified |
|---|---|---|
| **A. Shell and roles** | 8 | Fresh visitor lands on the staff dashboard; role switch both ways; "Viewing as" picker changes the student; a student opening a staff URL and staff opening a student URL are redirected; active nav state; styled 404 for unknown records. |
| **B. Dashboard** | 9 | Five queue counts and details match the data; overdue table sorted by days, rows over 14 days highlighted, notes ("Results withheld · Fees outstanding", "Withdrawn · fees remain payable", "Part-paid"); every queue link opens the right filtered page; "Open in Students" shows only overdue students; "Record payment" opens the payment dialog for that student. |
| **C. Students list** | 13 | Search by name, email, student ID (case-insensitive); each filter (programme, status, year, funding) and combinations; count label ("1 of 8 students"); empty states for search and filters; "Clear filters"; active pill styling; row link opens the profile. |
| **D. New student** | 7 | Empty submit lists 5 problems and focuses the summary; duplicate email (any case) **and** under-16 reported together with a link to the existing record; fee helper follows the programme; next year with no fee set is refused with a clear message; valid student gets `SMS-2026-0008`, a toast and the fee charged; Deferred students aren't charged. |
| **E. Edit student** | 2 | Name and funding change is saved and recorded in History; changing to another student's email is refused. |
| **F. Profile** | 7 | "Needs attention" strip; Finance tab overdue chip; Overview cards; Submissions tab with working downloads (correct filename and type); Results tab ("Not yet released"); History with Area filter. |
| **G. Status changes** | 8 | Completed record can't change status; Deferred offers only Enrolled / Withdrawn; withdrawal warning text; reason required; withdrawal updates badge, toast and History; future unpaid instalments cancelled, **prepaid instalments left alone** (re-tested after fix). |
| **H. Payments** | 13 | "Applied to" the oldest unpaid instalment; invalid amount message; overpayment hint; live preview figures (£500 → £1,883.75 still overdue); missing reference; duplicate reference (409) naming the other student, with a link; future date refused; full payment clears the overdue amount, updates balance, History and dashboard; overpayment becomes credit (£348.75) and shows in the list. |
| **I. Programme fees** | 9 | Table and headers; closed year has no edit control; one edit at a time; warning names the students who keep their fee; invalid amount; save and toast; existing students keep £8,250 instalments while a new enrolment is charged £8,400; closed year refused by the API too. |
| **J. Assessments and marking** | 22 | List with counts and status badges; new assessment validation (module, title, past deadline) and creation; roster built from the module's programmes; summary line; filter tabs (All / Late / Not submitted / Unmarked) with correct rows; row notes (resubmitted, within extension, 1 day 3 hours late, withdrawn); marks: "Enter 0–100" for bad input, live classification, autosave, changing a published mark → "Needs re-publish" with "Student still sees 52"; marking without a submission refused; extension validation (student, note, date before original), candidates are enrolled students only, success updates the roster; withdrawn student's menu option disabled; row menu pre-selects the student; file download. |
| **K. Results** | 12 | Default and switching assessments; count chips; Publish, Re-publish, Release with toasts; withhold without a reason refused; fees alert shown only for pending marks with overdue fees, pre-fills reason and note, disappears once withheld; publishing an already published result → 409; withholding without a note → 400 "This field is required." |
| **L. Student views** | 22 | Assessment list (deadlines, extension shown with original struck through, badges); wrong file type and 11 MB file rejected before upload ("Your v2 is still on file"); upload, replace → v3 "replaces v2"; closed assessment has no upload control; **first submission 2 minutes after a deadline accepted and flagged late** (student receipt and staff roster), and can't be replaced; withdrawn student sees a blocked banner and "Uploads are closed"; results show only published marks (Aisha sees 58, not her withheld mark; Mariam sees 64 after re-publish); account cards, schedule and payments; Chen's £120 credit; phone layout: sidebar hidden, bottom tab bar navigates, no sideways scrolling. |
| **M. API rules** | 5 + earlier | Student calling staff APIs → 403; withdrawn student upload → 422 `NOT_ENROLLED`; renamed text file → 422 by content; upload to another programme's assessment → 404; invalid role → 400; unknown student → 404; student downloading another student's file → 403. |

## Regression run

After the fixes, the whole pass was re-run as an assertion-based suite: every check states its expected value and is marked pass or fail automatically, and the suite runs in two parts from a fresh seed each time. The late-submission check creates an assessment due two minutes ahead and uploads after the deadline passes during the run.

| Part | Areas | Result |
|---|---|---|
| 1 | Shell, dashboard, students, new/edit, profile, status changes, payments, fees | **90 / 90** |
| 2 | Assessments and marking, results, student views (incl. phone), API rules | **81 / 81** |

**171 / 171 passed.** The browser console showed only the 4xx responses that negative tests trigger on purpose; no runtime errors or warnings.

## Found by testing, then fixed

| # | Type | What happened | Fix |
|---|---|---|---|
| 1 | **Bug** | Withdrawing a student who had **already paid** cancelled their paid future instalment, silently turning it into credit (an automatic refund decision). | Only future instalments with nothing paid against them are cancelled; paid money is left for finance to decide (D21). |
| 2 | **Bug** | "Next due" showed one instalment when two fell due on the same day (late enrolment), understating what was due. | Next due adds up every instalment due on that date (unit test added). |
| 3 | **Bug** | The "Withheld results" queue opened the Results page on an assessment without the withheld result. | The link opens the assessment that holds it. |
| 4 | Rough edge | API calls missing a field returned "Invalid input: expected string, received undefined". | One global rule: "This field is required." |
| 5 | Rough edge | Extension toast showed `02/10/2026` while the rest of the app shows `2 Oct 2026`. | Uses the shared date formatter. |
| 6 | Rough edge | The first version reported form problems one at a time. | All fixable problems are returned together (D29). |
| 7 | Rough edge | A renamed text file got a self-contradicting message. | Clear message: "isn't a valid PDF file: its contents don't match its name." |

## Known, accepted

- On first paint, the Results page's assessment picker shows its label a moment after hydration (Radix Select behaviour); it is correct once the page loads.
- Native date inputs follow the browser's locale (dd/mm/yyyy in en-GB); the app's own date text is always `2 Oct 2026` in UK time.
