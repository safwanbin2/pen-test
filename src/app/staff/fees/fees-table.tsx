"use client";

import { useRouter } from "next/navigation";
import { Fragment, useState, useTransition } from "react";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Money } from "@/components/money";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiCall, ClientApiError } from "@/lib/client-api";
import { parsePounds } from "@/lib/domain/money";
import { formatGBP } from "@/lib/format";

type Row = {
  id: string;
  name: string;
  previousFee: number | null;
  currentFee: number | null;
  chargedStudents: { name: string; amountPence: number }[];
};

function listNames(names: string[]) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function FeesTable({ rows, current, previous }: { rows: Row[]; current: string; previous: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function startEdit(row: Row) {
    setEditing(row.id);
    setValue(row.currentFee ? (row.currentFee / 100).toFixed(2) : "");
    setError(null);
  }

  function save(row: Row) {
    const pence = parsePounds(value);
    if (!pence) {
      setError("Enter an amount in pounds, for example 9535.00.");
      return;
    }
    startTransition(async () => {
      try {
        await apiCall(`/api/programmes/${row.id}/fees`, { method: "PUT", body: { academicYear: current, amountPence: pence } });
        toast.success(`${current} fee for ${row.name} set to ${formatGBP(pence)}`, {
          description: "Applies to students charged from now on.",
        });
        setEditing(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof ClientApiError ? (Object.values(e.fields)[0] ?? e.message) : (e as Error).message);
      }
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-left" aria-label="Programme fees">
        <thead className="bg-muted text-xs text-muted-foreground">
          <tr className="h-9">
            <th scope="col" className="px-3 font-medium">Programme</th>
            <th scope="col" className="px-3 text-right font-medium">
              <span className="font-mono">{previous}</span> · closed
            </th>
            <th scope="col" className="px-3 text-right font-medium font-mono text-foreground">{current}</th>
            <th scope="col" className="px-3 font-medium">Charged in {current}</th>
            <th scope="col" className="px-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isEditing = editing === row.id;
            const pence = parsePounds(value);
            const keeping = row.chargedStudents.filter((s) => s.amountPence !== pence);
            return (
              <Fragment key={row.id}>
                <tr className={isEditing ? "border-t bg-primary/5" : "border-t"}>
                  <td className="h-12 px-3 font-medium">{row.name}</td>
                  <td className="px-3 text-right text-muted-foreground">
                    {row.previousFee !== null ? <Money pence={row.previousFee} /> : "—"}
                  </td>
                  <td className="px-3 text-right">
                    {isEditing ? (
                      <div className="flex flex-col items-end gap-1 py-2">
                        <label htmlFor={`fee-${row.id}`} className="sr-only">{`${current} fee for ${row.name}`}</label>
                        <div className="relative w-36">
                          <span aria-hidden className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground">£</span>
                          <Input
                            id={`fee-${row.id}`}
                            autoFocus
                            inputMode="decimal"
                            className="pl-6 text-right font-mono text-[13px]"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && save(row)}
                            aria-invalid={!!error}
                          />
                        </div>
                        {row.currentFee !== null && (
                          <span className="text-xs text-muted-foreground">was <Money pence={row.currentFee} className="text-xs" /></span>
                        )}
                      </div>
                    ) : row.currentFee !== null ? (
                      <Money pence={row.currentFee} />
                    ) : (
                      <StatusBadge tone="dashed">Not set</StatusBadge>
                    )}
                  </td>
                  <td className="px-3 text-muted-foreground">
                    {row.chargedStudents.length === 1 ? "1 student" : `${row.chargedStudents.length} students`}
                  </td>
                  <td className="px-3 text-right">
                    {isEditing ? (
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
                        <Button size="sm" onClick={() => save(row)} disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => startEdit(row)} disabled={editing !== null}>
                        Edit
                      </Button>
                    )}
                  </td>
                </tr>
                {isEditing && (
                  <tr className="bg-primary/5">
                    <td colSpan={5} className="px-3 pb-3">
                      {error && <p className="mb-2 text-xs font-medium text-destructive">{error}</p>}
                      <div role="note" className="grid grid-cols-[16px_1fr] gap-x-3 rounded-lg border border-status-warning/30 bg-status-warning-subtle px-4 py-3">
                        <TriangleAlert aria-hidden className="mt-0.5 size-4 text-status-warning" />
                        <div>
                          <div className="font-medium text-status-warning">
                            Changes apply to new charges only; existing students keep the fee they were charged.
                          </div>
                          <div>
                            {keeping.length > 0 && (
                              <>
                                {listNames(keeping.map((s) => s.name))} stay at{" "}
                                <Money pence={keeping[0].amountPence} />.{" "}
                              </>
                            )}
                            {pence ? (
                              <>Students enrolled after you save are charged <Money pence={pence} />.</>
                            ) : (
                              "Enter the new fee."
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
