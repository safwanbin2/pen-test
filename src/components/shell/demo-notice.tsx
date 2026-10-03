import { Info } from "lucide-react";

/** `compact`: below 1024px only "Demo mode" shows (the student top bar also holds the student picker). */
export function DemoNotice({ compact = false }: { compact?: boolean }) {
  return (
    <p className="m-0 inline-flex h-6 shrink-0 items-center gap-1.5 rounded-sm border border-dashed border-input px-2 text-xs whitespace-nowrap text-muted-foreground">
      <Info aria-hidden className="size-3" />
      <span>
        Demo mode<span className={compact ? "max-lg:sr-only" : undefined}> — role switcher instead of login</span>
      </span>
    </p>
  );
}
