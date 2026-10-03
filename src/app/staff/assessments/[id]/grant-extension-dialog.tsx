"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarClock, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ExtensionReason } from "@/generated/prisma/enums";
import { apiCall, ClientApiError } from "@/lib/client-api";
import { EXTENSION_REASON_LABEL, formatDate, formatUkDateTime } from "@/lib/format";

type Candidate = { id: string; fullName: string; studentNumber: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessment: { id: string; code: string; title: string; deadline: Date };
  candidates: Candidate[];
  initialStudentId: string | null;
  suggestedDate: string; // YYYY-MM-DD, original deadline + 7 days
};

export function GrantExtensionDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="gap-4 p-6 sm:max-w-[480px]">
        {/* Content unmounts on close and is keyed by student, so the form starts fresh each time. */}
        <ExtensionForm key={props.initialStudentId ?? "any"} {...props} />
      </DialogContent>
    </Dialog>
  );
}

function ExtensionForm({ onOpenChange, assessment, candidates, initialStudentId, suggestedDate }: Props) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(initialStudentId ?? "");
  const [date, setDate] = useState(suggestedDate);
  const [time, setTime] = useState("23:59");
  const [reason, setReason] = useState<ExtensionReason>("MITIGATING_CIRCUMSTANCES");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const student = candidates.find((c) => c.id === studentId);

  function submit() {
    const local: Record<string, string> = {};
    if (!studentId) local.studentId = "Choose a student.";
    if (note.trim().length < 3) local.note = "Add a note for the record.";
    setErrors(local);
    if (Object.keys(local).length) return;
    startTransition(async () => {
      try {
        await apiCall(`/api/assessments/${assessment.id}/extensions`, {
          body: { studentId, newDeadlineDate: date, newDeadlineTime: time, reason, note },
        });
        toast.success(`Extension granted to ${student?.fullName}`, {
          description: `${assessment.code} now due ${formatDate(new Date(`${date}T00:00:00Z`))}, ${time} (UK time).`,
        });
        onOpenChange(false);
        setNote("");
        router.refresh();
      } catch (e) {
        if (e instanceof ClientApiError) setErrors(Object.keys(e.fields).length ? e.fields : { _: e.message });
        else toast.error((e as Error).message);
      }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Grant extension</DialogTitle>
        <DialogDescription>
          {student ? (
            <>
              {student.fullName} · <span className="font-mono text-[13px]">{student.studentNumber}</span>
              <br />
            </>
          ) : null}
          <span className="font-mono text-[13px]">{assessment.code}</span> {assessment.title}
        </DialogDescription>
      </DialogHeader>

      {!initialStudentId && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gx-student">Student</Label>
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger id="gx-student" className="w-full" aria-invalid={!!errors.studentId}>
              <SelectValue placeholder="Choose a student" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.fullName} <span className="font-mono text-xs text-muted-foreground">{c.studentNumber}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.studentId && <p className="text-xs font-medium text-destructive">{errors.studentId}</p>}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 rounded-md border bg-muted px-3 py-2 text-xs text-muted-foreground">
        <span>Original deadline</span>
        <s className="font-mono text-[13px] text-foreground/80">{formatUkDateTime(assessment.deadline)} (UK time)</s>
      </div>

      <div className="grid grid-cols-[1fr_112px] gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gx-date">New deadline date</Label>
          <Input
            id="gx-date"
            type="date"
            className="font-mono text-[13px]"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={!!errors.newDeadlineDate}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gx-time">Time</Label>
          <Input
            id="gx-time"
            type="time"
            className="font-mono text-[13px]"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
        <p
          className={`col-span-2 -mt-1 text-xs ${errors.newDeadlineDate ? "font-medium text-destructive" : "text-muted-foreground"}`}
        >
          {errors.newDeadlineDate ?? "UK time. Must be later than the original deadline."}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="gx-reason">
          Reason <span className="font-normal text-muted-foreground">(required)</span>
        </Label>
        <Select value={reason} onValueChange={(v) => setReason(v as ExtensionReason)}>
          <SelectTrigger id="gx-reason" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(EXTENSION_REASON_LABEL) as ExtensionReason[]).map((r) => (
              <SelectItem key={r} value={r}>
                {EXTENSION_REASON_LABEL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="gx-note">
          Note <span className="font-normal text-muted-foreground">(required)</span>
        </Label>
        <Textarea
          id="gx-note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-invalid={!!errors.note}
        />
        <p className={`text-xs ${errors.note ? "font-medium text-destructive" : "text-muted-foreground"}`}>
          {errors.note ??
            `Saved to ${student ? `${student.fullName.split(" ")[0]}'s` : "the student's"} history with your name and the time. ${student ? student.fullName.split(" ")[0] : "The student"} sees the new deadline, not the note.`}
        </p>
      </div>

      <div
        role="note"
        className="grid grid-cols-[16px_1fr] gap-x-3 rounded-lg border border-status-info/30 bg-status-info-subtle px-4 py-3"
      >
        <Info aria-hidden className="mt-0.5 size-4 text-status-info" />
        <div>
          Work submitted by the new deadline is not marked late. The roster shows the new deadline in place of the
          original.
        </div>
      </div>
      {errors._ && <p className="text-xs font-medium text-destructive">{errors._}</p>}

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button onClick={submit} disabled={pending}>
          <CalendarClock aria-hidden />
          {pending ? "Saving…" : "Grant extension"}
        </Button>
      </DialogFooter>
    </>
  );
}
