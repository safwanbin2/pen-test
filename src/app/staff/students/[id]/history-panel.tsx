import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EmptyRow, TableFrame, Td, Th, THead, Tr } from "@/components/data-table";
import { StatusBadge, type BadgeTone } from "@/components/status-badge";
import type { AuditArea, AuditLog } from "@/generated/prisma/client";
import { AREA_LABEL, EXTENSION_REASON_LABEL, formatUkDateTime, WITHHOLD_REASON_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Values that are statuses get the app's status badge; anything else (money, marks, dates) stays text. */
const VALUE_TONE: Record<string, BadgeTone> = {
  Enrolled: "success",
  Deferred: "warning",
  Withdrawn: "muted",
  Completed: "neutral",
  "No status": "dashed",
  Paid: "success",
  Due: "neutral",
  Overdue: "overdue",
  Cancelled: "dashed",
  Pending: "neutral",
  Published: "success",
  Withheld: "withheld",
  "Needs re-publish": "warning",
};

function Value({ value }: { value: string | null }) {
  if (!value) return null;
  const tone = VALUE_TONE[value];
  return tone ? <StatusBadge tone={tone}>{value}</StatusBadge> : <span className="font-mono text-[13px]">{value}</span>;
}

const REASON_CODE_LABEL: Record<string, string> = { ...WITHHOLD_REASON_LABEL, ...EXTENSION_REASON_LABEL };

export function HistoryPanel({ logs, area, baseHref }: { logs: AuditLog[]; area?: AuditArea; baseHref: string }) {
  const shown = area ? logs.filter((l) => l.area === area) : logs;
  const areas = Object.keys(AREA_LABEL) as AuditArea[];
  return (
    <section aria-labelledby="hist-h" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="hist-h" className="text-base font-semibold">History</h2>
          <p className="text-xs text-muted-foreground">Every change, newest first. Entries can&apos;t be edited or deleted.</p>
        </div>
        <nav aria-label="Filter by area" className="flex items-center gap-1 text-[13px]">
          <span className="mr-1 text-muted-foreground">Area:</span>
          {[undefined, ...areas].map((a) => (
            <Link
              key={a ?? "all"}
              href={`${baseHref}&area=${a ?? ""}`}
              aria-current={area === a ? "true" : undefined}
              className={cn(
                "rounded-md border border-transparent px-2 py-0.5 hover:bg-muted",
                area === a && "border-border bg-background font-medium shadow-xs",
              )}
            >
              {a ? AREA_LABEL[a] : "All"}
            </Link>
          ))}
        </nav>
      </div>
      <TableFrame label="History">
        <THead>
          <Th sort="descending">When (UK time)</Th>
          <Th>Area</Th>
          <Th>Change</Th>
          <Th>Reason</Th>
          <Th>By</Th>
        </THead>
        <tbody>
          {shown.length === 0 && <EmptyRow colSpan={5}>Nothing recorded in this area yet.</EmptyRow>}
          {shown.map((log) => (
            <Tr key={log.id}>
              <Td mono className="align-top">{formatUkDateTime(log.createdAt)}</Td>
              <Td className="align-top">{AREA_LABEL[log.area]}</Td>
              <Td className="align-top">
                {log.subject && <div className="text-xs text-muted-foreground">{log.subject}</div>}
                <div className="flex flex-wrap items-center gap-1.5">
                  <Value value={log.fromValue} />
                  {log.fromValue && log.toValue && <ArrowRight aria-label="to" className="size-3.5 text-muted-foreground" />}
                  <Value value={log.toValue} />
                </div>
              </Td>
              <Td className="max-w-md align-top">
                {log.reasonCode && REASON_CODE_LABEL[log.reasonCode] && (
                  <StatusBadge tone="neutral" className="mb-1">{REASON_CODE_LABEL[log.reasonCode]}</StatusBadge>
                )}
                <div>{log.reason}</div>
              </Td>
              <Td className="align-top whitespace-nowrap">
                <div>{log.actorName}</div>
                <div className="text-xs text-muted-foreground">{log.actorRole}</div>
              </Td>
            </Tr>
          ))}
        </tbody>
      </TableFrame>
    </section>
  );
}
