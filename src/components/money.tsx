import { formatGBP } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Money in pence, shown as £ with tabular figures. */
export function Money({ pence, className }: { pence: number; className?: string }) {
  return <span className={cn("font-mono text-[13px] tabular-nums", className)}>{formatGBP(pence)}</span>;
}

/** Student IDs, references and module codes. */
export function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("font-mono text-[13px] tabular-nums", className)}>{children}</span>;
}
