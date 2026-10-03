import { Info } from "lucide-react";

export function DemoNotice() {
  return (
    <p className="m-0 inline-flex h-6 items-center gap-1.5 rounded-sm border border-dashed border-input px-2 text-xs text-muted-foreground">
      <Info aria-hidden className="size-3" />
      Demo mode — role switcher instead of login
    </p>
  );
}
