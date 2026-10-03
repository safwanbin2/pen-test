import Link from "next/link";
import { Suspense } from "react";
import { Plus, SearchX } from "lucide-react";
import { EmptyRow, TableFrame, Td, Th, THead, Tr } from "@/components/data-table";
import { Money } from "@/components/money";
import { EmptyDatabaseHint } from "@/components/empty-database-hint";
import { PageHeader } from "@/components/page-header";
import { EnrolmentBadge, OverdueBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import type { FundingSource, StudentStatus } from "@/generated/prisma/enums";
import { SEVERE_OVERDUE_DAYS } from "@/lib/domain/finance";
import { FUNDING_LABEL, STATUS_LABEL } from "@/lib/format";
import { balanceNote, listAcademicYears, listProgrammes, listStudents } from "@/lib/services/students";
import { StudentFilters, type FilterDef } from "./student-filters";

export const metadata = { title: "Students · Registry" };

const STATUSES = Object.keys(STATUS_LABEL) as StudentStatus[];
const FUNDING = Object.keys(FUNDING_LABEL) as FundingSource[];

export default async function StudentsPage({ searchParams }: PageProps<"/staff/students">) {
  const sp = await searchParams;
  const get = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);
  const status = STATUSES.find((s) => s === get("status"));
  const funding = FUNDING.find((f) => f === get("funding"));

  const [{ rows, total }, programmes, years] = await Promise.all([
    listStudents({
      q: get("q"),
      programmeId: get("programme"),
      status,
      academicYear: get("year"),
      funding,
      overdue: get("overdue") === "1",
    }),
    listProgrammes(),
    listAcademicYears(),
  ]);

  const filters: FilterDef[] = [
    { key: "programme", label: "Programme", allLabel: "All", options: programmes.map((p) => ({ value: p.id, label: p.name })) },
    { key: "status", label: "Status", allLabel: "All", options: STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] })) },
    { key: "year", label: "Academic year", allLabel: "All years", options: years.map((y) => ({ value: y, label: y })) },
    { key: "funding", label: "Funding", allLabel: "All", options: FUNDING.map((f) => ({ value: f, label: FUNDING_LABEL[f] })) },
  ];
  const countLabel = rows.length === total ? `${total} students` : `${rows.length} of ${total} students`;
  const q = get("q");

  return (
    <>
      <PageHeader
        title="Students"
        description="Everyone registered, across all programmes and academic years."
        actions={
          <Button asChild>
            <Link href="/staff/students/new">
              <Plus aria-hidden />
              New student
            </Link>
          </Button>
        }
      />
      {total === 0 && <EmptyDatabaseHint what="No students yet." />}
      <Suspense>
        <StudentFilters filters={filters} countLabel={countLabel} />
      </Suspense>

      <TableFrame label="Students">
        <THead>
          <Th sort="ascending">Student ID</Th>
          <Th>Name</Th>
          <Th>Programme</Th>
          <Th>Year</Th>
          <Th>Status</Th>
          <Th>Funding</Th>
          <Th align="right">Balance</Th>
        </THead>
        <tbody>
          {rows.length === 0 && (
            <EmptyRow colSpan={7}>
              <div className="flex flex-col items-center gap-2 py-6">
                <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-muted">
                  <SearchX aria-hidden className="size-5" />
                </div>
                <div className="font-semibold text-foreground">No students match these filters</div>
                <div className="max-w-md">
                  {q
                    ? `Nothing matches “${q}”. Search by name, email or a full student ID such as SMS-2026-0001.`
                    : "Try removing a filter."}
                </div>
                <Button asChild variant="outline" size="sm" className="mt-2">
                  <Link href="/staff/students">Clear filters</Link>
                </Button>
              </div>
            </EmptyRow>
          )}
          {rows.map((s) => {
            const a = s.account;
            const note = balanceNote(a, s.status);
            return (
              <Tr key={s.id} highlight={a.daysOverdue > SEVERE_OVERDUE_DAYS}>
                <Td mono>{s.studentNumber}</Td>
                <Td className="max-w-64">
                  <Link href={`/staff/students/${s.id}`} className="block font-medium hover:underline">
                    {s.fullName}
                  </Link>
                  <span className="block truncate text-xs text-muted-foreground">{s.email}</span>
                </Td>
                <Td>{s.programme.name}</Td>
                <Td mono>{s.academicYear}</Td>
                <Td><EnrolmentBadge status={s.status} /></Td>
                <Td className="whitespace-nowrap">{FUNDING_LABEL[s.fundingSource]}</Td>
                <Td align="right">
                  <div className="flex flex-col items-end gap-0.5">
                    {a.creditPence > 0 ? (
                      <span className="flex items-center gap-1.5">
                        <StatusBadge tone="submitted">Credit</StatusBadge>
                        <Money pence={a.creditPence} />
                      </span>
                    ) : (
                      <Money pence={a.balancePence} className={a.overduePence ? "font-medium text-status-overdue" : ""} />
                    )}
                    {a.overduePence > 0 ? (
                      <OverdueBadge days={a.daysOverdue} />
                    ) : (
                      note && <span className="text-xs text-muted-foreground">{note}</span>
                    )}
                  </div>
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </TableFrame>
      <p className="text-xs text-muted-foreground">
        Balance is the total still to pay. Highlighted rows are more than {SEVERE_OVERDUE_DAYS} days overdue.
      </p>
    </>
  );
}
