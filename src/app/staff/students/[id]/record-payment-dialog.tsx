"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { InstalmentBadge } from "@/components/status-badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { apiCall, ClientApiError } from "@/lib/client-api";
import { accountSummary, previewPayment, type InstalmentInput } from "@/lib/domain/finance";
import { parsePounds } from "@/lib/domain/money";
import { formatDate, formatGBP, PAYMENT_METHOD_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  student: { id: string; fullName: string; studentNumber: string; fundingLabel: string };
  instalments: InstalmentInput[];
  payments: { amountPence: number }[];
  today: string; // YYYY-MM-DD (UK)
  defaultMethod: PaymentMethod;
  defaultOpen?: boolean;
  triggerLabel?: string;
  triggerSize?: "default" | "sm";
  triggerVariant?: "default" | "outline";
};

export function RecordPaymentDialog({
  student,
  instalments,
  payments,
  today,
  defaultMethod,
  defaultOpen = false,
  triggerLabel = "Record payment",
  triggerSize = "default",
  triggerVariant = "outline",
}: Props) {
  const router = useRouter();
  const todayDate = useMemo(() => new Date(`${today}T00:00:00Z`), [today]);
  const [open, setOpen] = useState(defaultOpen);
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(today);
  const [reference, setReference] = useState("");
  const [method, setMethod] = useState<PaymentMethod>(defaultMethod);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const pence = parsePounds(amount);
  const before = accountSummary(instalments, payments, todayDate);
  const after = pence ? accountSummary(instalments, [...payments, { amountPence: pence }], todayDate) : before;
  const firstUnpaid = previewPayment(instalments, payments, 0, todayDate).appliedTo;
  const wasOverdue = before.overduePence > 0;

  let amountHelp = `Up to ${formatGBP(before.balancePence)} (the balance).`;
  if (amount && !pence) amountHelp = "Enter an amount in pounds, for example 500.00.";
  else if (pence && pence > before.balancePence)
    amountHelp = `More than the balance — the extra ${formatGBP(pence - before.balancePence)} becomes credit.`;
  const amountInvalid = !!errors.amountPence || (!!amount && !pence);

  function submit() {
    const local: Record<string, string> = {};
    if (!pence) local.amountPence = "Enter an amount in pounds, for example 500.00.";
    if (!reference.trim()) local.reference = "Enter the reference shown on the statement.";
    if (paidOn > today) local.paidOn = "Today or earlier. Not in the future.";
    setErrors(local);
    if (Object.keys(local).length) return;
    startTransition(async () => {
      try {
        const result = await apiCall<{ balancePence: number; overduePence: number; creditPence: number }>(
          `/api/students/${student.id}/payments`,
          { body: { amountPence: pence, paidOn, reference, method } },
        );
        const status = result.creditPence
          ? `credit ${formatGBP(result.creditPence)}`
          : result.overduePence
            ? "still overdue"
            : "nothing overdue";
        toast.success(`Payment of ${formatGBP(pence!)} recorded. New balance ${formatGBP(result.balancePence)}.`, {
          description: `${student.fullName} · ${reference.trim().toUpperCase()} · ${status}`,
        });
        setOpen(false);
        setAmount("");
        setReference("");
        router.replace(`/staff/students/${student.id}?tab=finance`, { scroll: false });
        router.refresh();
      } catch (e) {
        if (e instanceof ClientApiError && Object.keys(e.fields).length) setErrors(e.fields);
        else toast.error((e as Error).message);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setErrors({});
        if (!o && defaultOpen) router.replace(`/staff/students/${student.id}?tab=finance`, { scroll: false });
      }}
    >
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize}>{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="gap-4 p-6 sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            {student.fullName} · <span className="font-mono text-[13px]">{student.studentNumber}</span> · {student.fundingLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-x-3 gap-y-4 max-sm:grid-cols-1">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rp-amount">Amount</Label>
            <div className="relative">
              <span aria-hidden className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground">£</span>
              <Input
                id="rp-amount"
                inputMode="decimal"
                className="pl-6 font-mono text-[13px]"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-invalid={amountInvalid}
                aria-describedby="rp-amount-help"
                autoFocus
              />
            </div>
            <p id="rp-amount-help" className={cn("text-xs", amountInvalid ? "font-medium text-destructive" : "text-muted-foreground")}>
              {errors.amountPence ?? amountHelp}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rp-date">Payment date</Label>
            <Input
              id="rp-date"
              type="date"
              max={today}
              className="font-mono text-[13px]"
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
              aria-invalid={!!errors.paidOn}
              aria-describedby="rp-date-help"
            />
            <p id="rp-date-help" className={cn("text-xs", errors.paidOn ? "font-medium text-destructive" : "text-muted-foreground")}>
              {errors.paidOn ?? "Today or earlier. Not in the future."}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rp-ref">Reference</Label>
            <Input
              id="rp-ref"
              className="font-mono text-[13px] uppercase"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              aria-invalid={!!errors.reference}
              aria-describedby="rp-ref-msg"
            />
            {!errors.reference && (
              <p id="rp-ref-msg" className="text-xs text-muted-foreground">As shown on the bank statement. Must be unique.</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rp-method">Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger id="rp-method" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => (
                  <SelectItem key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {errors.reference && (
            <p id="rp-ref-msg" role="alert" className="col-span-2 flex gap-1.5 text-xs font-medium text-destructive">
              <AlertCircle aria-hidden className="mt-px size-3.5 shrink-0" />
              <span>
                {errors.reference}{" "}
                {errors.duplicateStudentId && (
                  <>
                    Check the statement, or{" "}
                    <Link href={`/staff/students/${errors.duplicateStudentId}?tab=finance`} className="text-primary underline">
                      view that payment
                    </Link>
                    .
                  </>
                )}
              </span>
            </p>
          )}
        </div>

        {firstUnpaid && (
          <div className="rounded-md border bg-muted/50 px-3 py-2">
            <span className="text-xs text-muted-foreground">Applied to</span>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">
                Instalment {firstUnpaid.sequence} · due {formatDate(firstUnpaid.dueDate)}
              </span>
              <InstalmentBadge status={firstUnpaid.status} daysOverdue={firstUnpaid.daysOverdue} dueDate={firstUnpaid.dueDate} />
            </div>
            <p className="text-xs text-muted-foreground">Payments clear the oldest unpaid instalment first.</p>
          </div>
        )}

        <div aria-live="polite" className="rounded-md border px-3 py-2">
          <div className="flex items-baseline justify-between">
            <span className="font-medium">{wasOverdue ? "Overdue after this payment" : "Balance after this payment"}</span>
            <span className={cn("font-mono text-[15px] font-medium", wasOverdue && after.overduePence > 0 && "text-status-overdue")}>
              {formatGBP(wasOverdue ? after.overduePence : after.balancePence)}
            </span>
          </div>
          <dl className="mt-1 grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
            {wasOverdue && (
              <>
                <dt>Overdue now</dt>
                <dd className="text-right font-mono">{formatGBP(before.overduePence)}</dd>
              </>
            )}
            <dt>This payment</dt>
            <dd className="text-right font-mono">− {formatGBP(pence ?? 0)}</dd>
            <dt>
              {after.creditPence
                ? "Credit after this payment"
                : wasOverdue && after.overduePence === 0
                  ? "Overdue cleared · total left to pay"
                  : "Total left to pay"}
            </dt>
            <dd className="text-right font-mono text-foreground">
              {formatGBP(after.creditPence || after.balancePence)}
            </dd>
          </dl>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Recording…" : `Record ${formatGBP(pence ?? 0)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
