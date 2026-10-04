"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { EnrolmentBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { StudentStatus } from "@/generated/prisma/enums";
import { apiCall, ClientApiError } from "@/lib/client-api";
import { allowedTransitions } from "@/lib/domain/enrolment";
import { STATUS_LABEL } from "@/lib/format";

const CONSEQUENCE: Partial<Record<StudentStatus, { title: string; body: string }>> = {
  WITHDRAWN: {
    title: "Withdrawing this student",
    body: "Student will no longer be able to submit work. Outstanding fees remain payable; instalments not yet due are cancelled.",
  },
  DEFERRED: { title: "Deferring this student", body: "Student can't submit work while deferred. Fees already charged stay on the account." },
  COMPLETED: {
    title: "Completing this record",
    body: "Completed records are final and become read-only. Needs every assessment closed and all submitted work marked. Outstanding fees remain payable.",
  },
  ENROLLED: {
    title: "Enrolling this student",
    body: "Student can submit work. Their academic year's tuition fee becomes payable: it's charged now if it isn't on the account, and cancelled instalments are reinstated. Dates already passed move to today.",
  },
};

export function ChangeStatusDialog({
  student,
}: {
  student: { id: string; fullName: string; studentNumber: string; status: StudentStatus; programmeName: string };
}) {
  const router = useRouter();
  const options = allowedTransitions(student.status);
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState<StudentStatus | "">(options[0] ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const consequence = to ? CONSEQUENCE[to] : undefined;

  function submit() {
    if (!to) return;
    if (reason.trim().length < 3) {
      setError("Give a reason for the change.");
      return;
    }
    startTransition(async () => {
      try {
        await apiCall(`/api/students/${student.id}/status`, { body: { status: to, reason } });
        toast.success(`${student.fullName} is now ${STATUS_LABEL[to].toLowerCase()}`, {
          description: "Saved to their history with your name and the time.",
        });
        setOpen(false);
        setReason("");
        router.refresh();
      } catch (e) {
        setError(e instanceof ClientApiError ? (e.fields.status ?? e.fields.reason ?? e.message) : (e as Error).message);
      }
    });
  }

  if (options.length === 0) {
    return (
      <Button variant="outline" disabled title="Completed records are final">
        Change status
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); setError(null); }}>
      <DialogTrigger asChild>
        <Button variant="outline">Change status</Button>
      </DialogTrigger>
      <DialogContent className="gap-4 p-6 sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Change status</DialogTitle>
          <DialogDescription>
            {student.fullName} · <span className="font-mono text-[13px]">{student.studentNumber}</span> · {student.programmeName}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-[1fr_24px_1fr] items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">From</span>
            <div className="flex h-8 items-center rounded-md border bg-muted px-2.5">
              <EnrolmentBadge status={student.status} />
            </div>
          </div>
          <ArrowRight aria-hidden className="mx-auto mb-2 size-4 text-muted-foreground" />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cs-to">To</Label>
            <Select value={to} onValueChange={(v) => setTo(v as StudentStatus)}>
              <SelectTrigger id="cs-to" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {consequence && (
          <div role="note" className="grid grid-cols-[16px_1fr] gap-x-3 rounded-lg border border-status-warning/30 bg-status-warning-subtle px-4 py-3">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 text-status-warning" />
            <div>
              <div className="font-medium text-status-warning">{consequence.title}</div>
              <div>{consequence.body}</div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cs-reason">
            Reason <span className="font-normal text-muted-foreground">(required)</span>
          </Label>
          <Textarea
            id="cs-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-invalid={!!error}
            aria-describedby="cs-help"
          />
          <p id="cs-help" className={error ? "text-xs font-medium text-destructive" : "text-xs text-muted-foreground"}>
            {error ?? `Saved to ${student.fullName.split(" ")[0]}'s history with your name and the time.`}
          </p>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant={to === "WITHDRAWN" ? "destructive" : "default"} onClick={submit} disabled={pending || !to}>
            {pending ? "Saving…" : to === "WITHDRAWN" ? "Withdraw student" : `Change to ${to ? STATUS_LABEL[to] : "…"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
