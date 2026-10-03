// Dense table primitives used by every list (UI guide: Tables). Header row is
// muted, 36px; body rows ~44px; numbers right-aligned in tabular mono.

import { cn } from "@/lib/utils";

/** `stack`: on phones each row becomes a card (see `.table-stack` in globals.css). */
export function TableFrame({
  children,
  className,
  label,
  stack,
}: {
  children: React.ReactNode;
  className?: string;
  label?: string;
  stack?: boolean;
}) {
  return (
    <div className={cn("relative overflow-x-auto rounded-lg border", className)}>
      <table aria-label={label} className={cn("w-full border-collapse text-left", stack && "table-stack")}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-muted text-xs text-muted-foreground">
      <tr className="h-9">{children}</tr>
    </thead>
  );
}

export function Th({
  children,
  align = "left",
  className,
  sort,
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  className?: string;
  sort?: "ascending" | "descending";
}) {
  return (
    <th
      scope="col"
      aria-sort={sort}
      className={cn(
        "px-3 font-medium whitespace-nowrap",
        align === "right" && "text-right",
        sort && "text-foreground",
        className,
      )}
    >
      {children}
      {sort && <span aria-hidden> {sort === "ascending" ? "↑" : "↓"}</span>}
    </th>
  );
}

export function Tr({ children, highlight, className }: { children: React.ReactNode; highlight?: boolean; className?: string }) {
  return <tr className={cn("border-t", highlight && "bg-status-overdue-subtle", className)}>{children}</tr>;
}

export function Td({
  children,
  align = "left",
  mono,
  className,
  colSpan,
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  mono?: boolean;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "h-11 px-3 py-1.5 align-middle",
        align === "right" && "text-right",
        mono && "font-mono text-[13px] whitespace-nowrap tabular-nums",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr className="border-t">
      <td colSpan={colSpan} className="px-3 py-10 text-center text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}

/** A column heading repeated inside the cell on phones, where `stack` hides the header row. */
export function StackLabel({ children }: { children: React.ReactNode }) {
  return <span className="mr-1.5 font-sans text-xs text-muted-foreground sm:hidden">{children}</span>;
}
