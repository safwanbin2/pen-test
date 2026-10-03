import { Database } from "lucide-react";

/** Shown where an unseeded database leaves nothing to work with. */
export function EmptyDatabaseHint({ what }: { what: string }) {
  return (
    <div role="note" className="grid grid-cols-[16px_1fr] gap-x-3 rounded-lg border border-status-info/30 bg-status-info-subtle px-4 py-3">
      <Database aria-hidden className="mt-0.5 size-4 text-status-info" />
      <div>
        <div className="font-medium">{what}</div>
        <div className="text-foreground/80">
          The database is empty. Load the demo data (programmes, students, fees, submissions and marks) with{" "}
          <code className="rounded-sm bg-background px-1 font-mono text-[13px]">npm run db:seed</code>, then refresh.
        </div>
      </div>
    </div>
  );
}
