"use client";

import { useState, useTransition } from "react";
import { Eye } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { WithholdReason } from "@/generated/prisma/enums";
import { WITHHOLD_REASON_LABEL } from "@/lib/format";

export type WithholdTarget = {
  markId: string;
  studentName: string;
  studentNumber: string;
  assessmentLabel: string;
  prefill?: { reason: WithholdReason; note: string };
};

export function WithholdDialog({
  target,
  onClose,
  onConfirm,
}: {
  target: WithholdTarget | null;
  onClose: () => void;
  onConfirm: (reason: WithholdReason, note: string) => Promise<string | null>;
}) {
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="gap-4 p-6 sm:max-w-[480px]">
        {/* Keyed so each opening starts from the target's prefill, without syncing state in an effect. */}
        {target && (
          <WithholdForm
            key={`${target.markId}-${target.prefill?.reason ?? ""}`}
            target={target}
            onConfirm={onConfirm}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function WithholdForm({
  target,
  onConfirm,
}: {
  target: WithholdTarget;
  onConfirm: (reason: WithholdReason, note: string) => Promise<string | null>;
}) {
  const [reason, setReason] = useState<WithholdReason | "">(target.prefill?.reason ?? "");
  const [note, setNote] = useState(target.prefill?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const first = target.studentName.split(" ")[0];

  function confirm() {
    if (!reason) return setError("Choose a reason.");
    if (note.trim().length < 3) return setError("Add a note for the record.");
    startTransition(async () => {
      const problem = await onConfirm(reason, note);
      if (problem) setError(problem);
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Withhold results</DialogTitle>
        <DialogDescription>
          {target.studentName} · <span className="font-mono text-[13px]">{target.studentNumber}</span> ·{" "}
          {target.assessmentLabel}
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wh-reason">
          Reason <span className="font-normal text-muted-foreground">(required)</span>
        </Label>
        <Select value={reason} onValueChange={(v) => setReason(v as WithholdReason)}>
          <SelectTrigger id="wh-reason" className="w-full">
            <SelectValue placeholder="Choose a reason" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(WITHHOLD_REASON_LABEL) as WithholdReason[]).map((r) => (
              <SelectItem key={r} value={r}>
                {WITHHOLD_REASON_LABEL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {target.prefill && (
          <p className="text-xs text-muted-foreground">
            Prefilled from the overdue-fees alert. Change it if another reason applies.
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wh-note">
          Note <span className="font-normal text-muted-foreground">(required)</span>
        </Label>
        <Textarea id="wh-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        <p className="text-xs text-muted-foreground">
          Saved to {first}&apos;s history with your name and the time. Staff only.
        </p>
      </div>
      <div className="grid grid-cols-[16px_1fr] gap-x-3 rounded-lg border bg-muted/60 px-4 py-3">
        <Eye aria-hidden className="mt-0.5 size-4 text-muted-foreground" />
        <div>
          <div className="font-medium">What {first} will see</div>
          <div className="text-muted-foreground">
            Only “Results not yet released”. They won&apos;t see the mark, the reason or this note.
          </div>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button onClick={confirm} disabled={pending}>
          {pending ? "Withholding…" : "Withhold results"}
        </Button>
      </DialogFooter>
    </>
  );
}
