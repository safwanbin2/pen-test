"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FundingSource } from "@/generated/prisma/enums";
import { apiCall, ClientApiError } from "@/lib/client-api";
import { formatGBP, FUNDING_LABEL } from "@/lib/format";

type Programme = { id: string; name: string; fees: Record<string, number> };

export type StudentFormValues = {
  fullName: string;
  email: string;
  dateOfBirth: string; // YYYY-MM-DD or ""
  fundingSource: FundingSource | "";
  programmeId: string;
  academicYear: string;
  status: "ENROLLED" | "DEFERRED";
};

const FIELD_ORDER = ["fullName", "email", "dateOfBirth", "programmeId", "academicYear", "fundingSource", "status"] as const;
const FIELD_ANCHOR: Record<string, string> = { dateOfBirth: "dob-day" };

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="flex items-start gap-1 text-xs font-medium text-destructive">
      <AlertCircle aria-hidden className="mt-px size-3.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

/** Create (no `studentId`) or edit an existing student's details. */
export function StudentForm({
  mode,
  studentId,
  studentNumber,
  initial,
  programmes,
  academicYears,
}: {
  mode: "create" | "edit";
  studentId?: string;
  studentNumber?: string;
  initial: StudentFormValues;
  programmes: Programme[];
  academicYears: string[];
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [dob, setDob] = useState(() => {
    const [y = "", m = "", d = ""] = initial.dateOfBirth.split("-");
    return { d, m, y };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const summaryRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof StudentFormValues>(key: K, value: StudentFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));
  const programme = programmes.find((p) => p.id === values.programmeId);
  const fee = programme?.fees[values.academicYear];

  function validateLocally() {
    const e: Record<string, string> = {};
    if (values.fullName.trim().length < 2) e.fullName = "Enter the student's full name.";
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) e.email = "Enter a valid email address.";
    if (!dob.d || !dob.m || dob.y.length !== 4) e.dateOfBirth = "Enter a date of birth, for example 14 03 2006.";
    if (!values.fundingSource) e.fundingSource = "Choose a funding source.";
    if (mode === "create" && !values.programmeId) e.programmeId = "Choose a programme.";
    return e;
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const local = validateLocally();
    setErrors(local);
    setDuplicateId(null);
    if (Object.keys(local).length) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    const dateOfBirth = `${dob.y}-${dob.m.padStart(2, "0")}-${dob.d.padStart(2, "0")}`;
    const body =
      mode === "create"
        ? { ...values, dateOfBirth }
        : { fullName: values.fullName, email: values.email, dateOfBirth, fundingSource: values.fundingSource };
    startTransition(async () => {
      try {
        const { student } = await apiCall<{ student: { id: string; studentNumber: string } }>(
          mode === "create" ? "/api/students" : `/api/students/${studentId}`,
          { method: mode === "create" ? "POST" : "PATCH", body },
        );
        toast.success(mode === "create" ? `Student created · ${student.studentNumber}` : "Details saved", {
          description: mode === "create" ? `${values.fullName} has been enrolled.` : undefined,
        });
        router.push(`/staff/students/${student.id}`);
        router.refresh();
      } catch (error) {
        if (error instanceof ClientApiError && Object.keys(error.fields).length) {
          const { duplicateStudentId, ...fields } = error.fields;
          setErrors(fields);
          setDuplicateId(duplicateStudentId ?? null);
          requestAnimationFrame(() => summaryRef.current?.focus());
        } else {
          toast.error((error as Error).message);
        }
      }
    });
  }

  const errorList = FIELD_ORDER.filter((f) => errors[f]).map((f) => ({ field: f, message: errors[f] }));
  const invalid = (field: string) => (errors[field] ? { "aria-invalid": true, "aria-describedby": `${field}-err` } : {});

  return (
    <form noValidate onSubmit={submit} className="flex max-w-3xl flex-col gap-5">
      {errorList.length > 0 && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          aria-labelledby="err-h"
          className="grid grid-cols-[16px_1fr] gap-x-3 rounded-lg border border-destructive/40 bg-status-overdue-subtle px-4 py-3 outline-none"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 text-status-overdue" />
          <div>
            <div id="err-h" className="font-medium text-status-overdue">
              Fix {errorList.length === 1 ? "1 problem" : `${errorList.length} problems`} before saving
            </div>
            <ul className="mt-1 list-disc pl-4.5">
              {errorList.map((e) => (
                <li key={e.field}>
                  <a href={`#${FIELD_ANCHOR[e.field] ?? e.field}`} className="text-status-overdue underline underline-offset-3">
                    {e.message.replace(/\.$/, "").split(". ")[0]}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <fieldset className="grid gap-x-4 gap-y-5 rounded-lg border p-5 sm:grid-cols-2">
        <legend className="px-1.5 text-base font-semibold">Personal details</legend>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" autoComplete="off" value={values.fullName} onChange={(e) => set("fullName", e.target.value)} {...invalid("fullName")} />
          <FieldError id="fullName-err" message={errors.fullName} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="off" value={values.email} onChange={(e) => set("email", e.target.value)} {...invalid("email")} />
          {errors.email && (
            <p id="email-err" className="flex items-start gap-1 text-xs font-medium text-destructive">
              <AlertCircle aria-hidden className="mt-px size-3.5 shrink-0" />
              <span>
                {errors.email}{" "}
                {duplicateId && (
                  <Link href={`/staff/students/${duplicateId}`} className="font-medium text-primary underline">
                    Open that record
                  </Link>
                )}
              </span>
            </p>
          )}
        </div>

        <div role="group" aria-labelledby="dob-l" className="flex flex-col gap-1.5">
          <span id="dob-l" className="text-sm font-medium">Date of birth</span>
          <div className="flex gap-2">
            {([
              ["d", "Day", "dob-day", "w-14", 2],
              ["m", "Month", "dob-month", "w-14", 2],
              ["y", "Year", "dob-year", "w-20", 4],
            ] as const).map(([key, label, id, width, max]) => (
              <div key={key} className="flex flex-col gap-1">
                <label htmlFor={id} className="text-xs text-muted-foreground">{label}</label>
                <Input
                  id={id}
                  inputMode="numeric"
                  maxLength={max}
                  className={`${width} font-mono text-[13px]`}
                  value={dob[key]}
                  onChange={(e) => setDob((v) => ({ ...v, [key]: e.target.value.replace(/\D/g, "") }))}
                  {...(errors.dateOfBirth ? { "aria-invalid": true, "aria-describedby": "dateOfBirth-err" } : {})}
                />
              </div>
            ))}
          </div>
          <FieldError id="dateOfBirth-err" message={errors.dateOfBirth} />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Student ID</span>
          <div className="flex h-8 items-center rounded-md border border-dashed bg-muted px-2.5 text-[13px] text-muted-foreground">
            {studentNumber ? <span className="font-mono text-foreground">{studentNumber}</span> : "Assigned when you save"}
          </div>
        </div>
      </fieldset>

      <fieldset className="grid gap-x-4 gap-y-5 rounded-lg border p-5 sm:grid-cols-2">
        <legend className="px-1.5 text-base font-semibold">Study and funding</legend>

        {mode === "create" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="programmeId">Programme</Label>
              <Select value={values.programmeId} onValueChange={(v) => set("programmeId", v)}>
                <SelectTrigger id="programmeId" className="w-full" {...invalid("programmeId")}>
                  <SelectValue placeholder="Choose a programme" />
                </SelectTrigger>
                <SelectContent>
                  {programmes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {programme && (
                <p className="text-xs text-muted-foreground">
                  {fee !== undefined ? (
                    <>Fee <span className="font-mono">{formatGBP(fee)}</span> a year, charged when you save.</>
                  ) : (
                    <>No {values.academicYear} fee is set for this programme yet.</>
                  )}
                </p>
              )}
              <FieldError id="programmeId-err" message={errors.programmeId} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="academicYear">Academic year</Label>
              <Select value={values.academicYear} onValueChange={(v) => set("academicYear", v)}>
                <SelectTrigger id="academicYear" className="w-full font-mono text-[13px]" {...invalid("academicYear")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((y) => (
                    <SelectItem key={y} value={y} className="font-mono">{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError id="academicYear-err" message={errors.academicYear} />
            </div>
          </>
        ) : (
          <p className="text-muted-foreground sm:col-span-2">
            Programme and academic year can&apos;t be changed here: a transfer affects fees and assessments.
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fundingSource">Funding source</Label>
          <Select value={values.fundingSource} onValueChange={(v) => set("fundingSource", v as FundingSource)}>
            <SelectTrigger id="fundingSource" className="w-full" {...invalid("fundingSource")}>
              <SelectValue placeholder="Choose a funding source" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(FUNDING_LABEL) as FundingSource[]).map((f) => (
                <SelectItem key={f} value={f}>{FUNDING_LABEL[f]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Instalments 25% / 25% / 50%.</p>
          <FieldError id="fundingSource-err" message={errors.fundingSource} />
        </div>

        {mode === "create" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">Status</Label>
            <Select value={values.status} onValueChange={(v) => set("status", v as "ENROLLED" | "DEFERRED")}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ENROLLED">Enrolled</SelectItem>
                <SelectItem value="DEFERRED">Deferred (not charged yet)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Later changes go through Change status and need a reason.</p>
          </div>
        )}
      </fieldset>

      <div className="flex justify-end gap-2 pt-1">
        <Button asChild variant="outline">
          <Link href={studentId ? `/staff/students/${studentId}` : "/staff/students"}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create student" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
