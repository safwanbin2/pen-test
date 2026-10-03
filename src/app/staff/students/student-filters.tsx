"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ChevronDown, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };
export type FilterDef = { key: string; label: string; allLabel: string; options: Option[] };

/** Search box + pill filters; state lives in the URL so a filtered list can be shared. */
export function StudentFilters({ filters, countLabel }: { filters: FilterDef[]; countLabel: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [, startTransition] = useTransition();

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    startTransition(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  }

  // Debounced search.
  useEffect(() => {
    if ((params.get("q") ?? "") === q) return;
    const id = setTimeout(() => update({ q: q.trim() || null }), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const active = filters.some((f) => params.get(f.key)) || !!params.get("q") || !!params.get("overdue");

  return (
    <div role="search" className="flex flex-wrap items-center gap-2">
      <div className="relative w-80 max-w-full">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          aria-label="Search students"
          placeholder="Search name, email or student ID"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-8 w-full rounded-md border border-input bg-background pr-2.5 pl-8 shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      {filters.map((f) => {
        const value = params.get(f.key) ?? "";
        const selected = f.options.find((o) => o.value === value);
        return (
          <DropdownMenu key={f.key}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`${f.label}: ${selected?.label ?? f.allLabel}`}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2.5",
                  selected && "border-primary bg-primary/5",
                )}
              >
                <span className="text-muted-foreground">{f.label}:</span>
                <span className={cn(selected && "font-medium")}>{selected?.label ?? f.allLabel}</span>
                <ChevronDown aria-hidden className="size-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuRadioGroup value={value} onValueChange={(v) => update({ [f.key]: v || null })}>
                <DropdownMenuRadioItem value="">{f.allLabel}</DropdownMenuRadioItem>
                {f.options.map((o) => (
                  <DropdownMenuRadioItem key={o.value} value={o.value}>
                    {o.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
      {params.get("overdue") && (
        <button
          type="button"
          onClick={() => update({ overdue: null })}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary bg-primary/5 px-2.5"
        >
          <span className="text-muted-foreground">Fees:</span>
          <span className="font-medium">Overdue only</span>
          <span aria-hidden>×</span>
        </button>
      )}
      {active && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            startTransition(() => router.replace(pathname, { scroll: false }));
          }}
          className="h-8 px-2 font-medium text-primary underline underline-offset-4"
        >
          Clear filters
        </button>
      )}
      <span className="ml-auto text-xs text-muted-foreground">{countLabel}</span>
    </div>
  );
}
