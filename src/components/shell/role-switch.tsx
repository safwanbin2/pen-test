"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { apiCall } from "@/lib/client-api";
import type { Role } from "@/lib/session";
import { cn } from "@/lib/utils";

/** "View as Staff | Student" segmented control (demo only, D15). */
export function RoleSwitch({ role, compact = false }: { role: Role; compact?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchTo(next: Role) {
    if (next === role) return;
    startTransition(async () => {
      try {
        const { redirectTo } = await apiCall<{ redirectTo: string }>("/api/session", { body: { role: next } });
        router.push(redirectTo);
        router.refresh();
      } catch (error) {
        toast.error((error as Error).message);
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      {!compact && <span className="text-xs text-muted-foreground max-sm:hidden">View as</span>}
      <div role="group" aria-label="Role" className="inline-flex gap-0.5 rounded-md border bg-muted p-0.5">
        {(["staff", "student"] as const).map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={role === r}
            disabled={pending}
            onClick={() => switchTo(r)}
            className={cn(
              "h-[26px] rounded-sm border border-transparent px-3 text-[13px] font-medium text-muted-foreground capitalize",
              role === r && "border-border bg-background text-foreground shadow-xs",
            )}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
