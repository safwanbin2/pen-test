"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiCall } from "@/lib/client-api";

/** "Viewing as <student>" in the student role. */
export function StudentPicker({
  current,
  students,
}: {
  current: string;
  students: { studentNumber: string; fullName: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(studentNumber: string) {
    startTransition(async () => {
      try {
        await apiCall("/api/session", { body: { role: "student", studentNumber } });
        router.refresh();
      } catch (error) {
        toast.error((error as Error).message);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <span id="viewing-as" className="text-xs text-muted-foreground">
        Viewing as
      </span>
      <Select value={current} onValueChange={choose} disabled={pending}>
        <SelectTrigger aria-labelledby="viewing-as" size="sm" className="min-w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {students.map((s) => (
            <SelectItem key={s.studentNumber} value={s.studentNumber}>
              <span className="font-medium">{s.fullName}</span>
              <span className="font-mono text-xs text-muted-foreground">({s.studentNumber})</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
