"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AssessmentPicker({
  value,
  options,
}: {
  value: string;
  options: { id: string; code: string; title: string; academicYear: string }[];
}) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <span id="ap-label" className="text-muted-foreground">Assessment:</span>
      <Select value={value} onValueChange={(id) => router.push(`/staff/results?assessment=${id}`)}>
        <SelectTrigger aria-labelledby="ap-label" className="min-w-72">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              <span className="font-mono text-[13px]">{o.code}</span> {o.title}
              <span className="font-mono text-xs text-muted-foreground">{o.academicYear}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
