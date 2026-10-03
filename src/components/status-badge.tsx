// One badge vocabulary for the whole app (docs/UI_GUIDE.md "Status vocabulary").
// Every badge carries a text label; colour is never the only signal.

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Check, Clock, Lock } from "lucide-react";
import type { ReleaseStatus, StudentStatus } from "@/generated/prisma/enums";
import type { InstalmentStatus } from "@/lib/domain/finance";
import { cn } from "@/lib/utils";
import { formatDate, RELEASE_LABEL, STATUS_LABEL } from "@/lib/format";

const TONES = {
  neutral: "bg-background text-foreground border-border",
  muted: "bg-muted text-muted-foreground border-muted",
  submitted: "bg-muted text-foreground border-muted",
  success: "bg-status-success-subtle text-status-success border-status-success/30",
  warning: "bg-transparent text-status-warning border-status-warning",
  info: "bg-status-info-subtle text-status-info border-status-info/30",
  late: "bg-status-late-subtle text-status-late border-status-late/30",
  overdue: "bg-status-overdue text-status-overdue-foreground border-status-overdue",
  withheld: "bg-status-withheld text-status-withheld-foreground border-status-withheld",
  dashed: "bg-transparent text-muted-foreground border-input border-dashed",
} as const;

export type BadgeTone = keyof typeof TONES;

export function StatusBadge({
  tone,
  icon: Icon,
  suffix,
  className,
  children,
}: {
  tone: BadgeTone;
  icon?: LucideIcon;
  suffix?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-sm border px-1.5 text-xs leading-4 font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {Icon && <Icon aria-hidden className="size-3" />}
      {children}
      {suffix && (
        <>
          <span aria-hidden>·</span>
          <span>{suffix}</span>
        </>
      )}
    </span>
  );
}

const ENROLMENT_TONE: Record<StudentStatus, BadgeTone> = {
  ENROLLED: "success",
  DEFERRED: "warning",
  WITHDRAWN: "muted",
  COMPLETED: "neutral",
};

export function EnrolmentBadge({ status }: { status: StudentStatus }) {
  return <StatusBadge tone={ENROLMENT_TONE[status]}>{STATUS_LABEL[status]}</StatusBadge>;
}

export function InstalmentBadge({
  status,
  daysOverdue,
  dueDate,
}: {
  status: InstalmentStatus;
  daysOverdue: number;
  dueDate: Date;
}) {
  switch (status) {
    case "PAID":
      return <StatusBadge tone="success" icon={Check}>Paid</StatusBadge>;
    case "OVERDUE":
      return <OverdueBadge days={daysOverdue} />;
    case "DUE":
      return <StatusBadge tone="neutral" suffix={formatDate(dueDate)}>Due</StatusBadge>;
    case "CANCELLED":
      return <StatusBadge tone="dashed">Cancelled</StatusBadge>;
  }
}

export function OverdueBadge({ days }: { days: number }) {
  return (
    <StatusBadge tone="overdue" icon={AlertTriangle} suffix={`${days} ${days === 1 ? "day" : "days"}`}>
      Overdue
    </StatusBadge>
  );
}

export function SubmissionBadge({
  state,
  suffix,
}: {
  state: "submitted" | "late" | "none" | "closed";
  suffix?: string;
}) {
  if (state === "submitted") return <StatusBadge tone="submitted" icon={Check} suffix={suffix}>Submitted</StatusBadge>;
  if (state === "late") return <StatusBadge tone="late" icon={Clock} suffix={suffix}>Late</StatusBadge>;
  if (state === "closed") return <StatusBadge tone="muted" icon={Lock}>Closed</StatusBadge>;
  return <StatusBadge tone="dashed">Not submitted</StatusBadge>;
}

const RELEASE_TONE: Record<ReleaseStatus, BadgeTone> = {
  PENDING: "neutral",
  PUBLISHED: "success",
  WITHHELD: "withheld",
  NEEDS_REPUBLISH: "warning",
};

export function ReleaseBadge({ status }: { status: ReleaseStatus }) {
  return (
    <StatusBadge tone={RELEASE_TONE[status]} icon={status === "WITHHELD" ? Lock : undefined}>
      {RELEASE_LABEL[status]}
    </StatusBadge>
  );
}
