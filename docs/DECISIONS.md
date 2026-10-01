# Decisions & trade-offs

Every place where the brief was silent or ambiguous, with what we chose and why. This gets condensed into the README.

| # | Question the brief leaves open | Decision | Why |
|---|---|---|---|
| D1 | What makes a balance "overdue"? A balance alone has no due date. | Fees are split into instalments with due dates (default 25% / 25% / 50%). Overdue = amount due to date − amount paid > 0. | Registry teams chase missed instalments, not total balances. A student midway through the year with money owed but nothing due yet shouldn't be flagged. Student Finance also pays providers in termly instalments. |
| D2 | Is the fee a property of the programme or the student? | `ProgrammeFee` per programme **per academic year**. The amount is copied onto the student's `FeeCharge` when charged. | Fees change year to year. Existing students' debts must not change when next year's price is set. |
| D3 | Store the balance or calculate it? | Calculate it from the ledger (charges − payments). Money stored as integer pence. | "Real time" by definition; no drift; no floating-point errors. |
| D4 | How is the Student ID generated? | `SMS-<intake year>-<4-digit sequence>` from a per-year counter row, incremented inside a transaction. Never reused. | `count()+1` produces duplicates under concurrent enrolment and reuses numbers after deletes. |
| D5 | Can students be deleted? | No. Withdrawal is a status change with a required reason and history. | Records are needed for audits by the awarding university and for funding reconciliation. |
| D6 | Resubmission: overwrite or keep? | Keep every version; the latest is the one marked. | Academic-integrity investigations need the trail. |
| D7 | Late resubmission? | First submission after the deadline: allowed, flagged late. Resubmitting after the deadline when an on-time version exists: blocked. | Stops an on-time submission being turned into a late one, and stops students using lateness to get extra time. |
| D8 | Extensions? | Per-student extension moves that student's effective deadline; lateness is judged against it. | Mitigating circumstances are routine in UK higher education; without this, legitimately extended work gets flagged late. |
| D9 | Time zones | Stored in UTC, shown and entered in Europe/London. | Deadlines must not shift across the clock changes. |
| D10 | Decimal marks? Boundary at 69.5? | Integer marks 0–100 only. | Removes rounding ambiguity at the class boundaries. |
| D11 | Classification stored? | Calculated from the mark. Fail < 40 added explicitly. | Can't go out of sync with the mark. |
| D12 | Withholding results | Per student, with a required reason (Fees outstanding / Academic misconduct / Awaiting exam board / Other). Overdue tuition fees *prompt* staff to withhold; never automatic. | Common UK practice, but consumer guidance (CMA) limits withholding to tuition-fee debt, and a person should make the call. |
| D13 | Mark edited after publishing | Release status → `NEEDS_REPUBLISH`; change audited. | Stops a student silently seeing a changed mark without a staff decision. |
| D14 | Who can submit? | Only `Enrolled` students. Deferred/Withdrawn blocked; Completed read-only. | Status has to mean something across modules. |
| D15 | Auth | Cookie-based role toggle, **but checked in every API route**. | The brief allows a toggle; enforcing it on the server shows the boundary is real. |
| D16 | File storage | Local disk (`UPLOAD_DIR`), metadata in Postgres, type checked by magic bytes, 10 MB limit. | Simple to run locally; S3 would replace it behind the same service function. |
| D17 | Seed dates | Relative to "today" at seed time. | Overdue and late examples still work whenever a reviewer runs the app. |
| D18 | How does a reviewer get Postgres? | Docker is optional. The app reads only `DATABASE_URL`. Three documented options: Docker Compose (Postgres 16), `npm run db:local` (Prisma's embedded Postgres, no Docker or install needed), or any Postgres 14+. One Docker-agnostic `npm run db:setup` (migrate deploy + seed). | A reviewer must be able to run it whatever their machine has. Docker gives a pinned, isolated version; the embedded option removes every prerequisite except Node. |
