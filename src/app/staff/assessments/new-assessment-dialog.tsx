"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiCall, ClientApiError } from "@/lib/client-api";

export function NewAssessmentDialog({
  modules,
  defaultDate,
}: {
  modules: { id: string; code: string; title: string; programmes: string }[];
  defaultDate: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [moduleId, setModuleId] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("23:59");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const mod = modules.find((m) => m.id === moduleId);

  function submit() {
    startTransition(async () => {
      try {
        const { assessment } = await apiCall<{ assessment: { id: string } }>("/api/assessments", {
          body: { moduleId, title, deadlineDate: date, deadlineTime: time },
        });
        toast.success("Assessment created", { description: `${mod?.code} ${title} is open for submissions.` });
        setOpen(false);
        router.push(`/staff/assessments/${assessment.id}`);
      } catch (e) {
        if (e instanceof ClientApiError) setErrors(Object.keys(e.fields).length ? e.fields : { _: e.message });
        else toast.error((e as Error).message);
      }
    });
  }

  const err = (k: string) => errors[k] && <p className="text-xs font-medium text-destructive">{errors[k]}</p>;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); setErrors({}); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden />
          New assessment
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-4 p-6 sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>New assessment</DialogTitle>
          <DialogDescription>Students on every programme that includes the module can submit to it.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="na-module">Module</Label>
          <Select value={moduleId} onValueChange={setModuleId}>
            <SelectTrigger id="na-module" className="w-full" aria-invalid={!!errors.moduleId}>
              <SelectValue placeholder="Choose a module" />
            </SelectTrigger>
            <SelectContent>
              {modules.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <span className="font-mono text-xs">{m.code}</span> {m.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {mod && <p className="text-xs text-muted-foreground">Taken on {mod.programmes}.</p>}
          {err("moduleId")}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="na-title">Title</Label>
          <Input id="na-title" placeholder="e.g. Report (2,500 words)" value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={!!errors.title} />
          {err("title")}
        </div>
        <div className="grid grid-cols-[1fr_112px] gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="na-date">Submission deadline</Label>
            <Input id="na-date" type="date" className="font-mono text-[13px]" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={!!errors.deadlineDate} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="na-time">Time</Label>
            <Input id="na-time" type="time" className="font-mono text-[13px]" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <p className={`col-span-2 -mt-1 text-xs ${errors.deadlineDate ? "font-medium text-destructive" : "text-muted-foreground"}`}>
            {errors.deadlineDate ?? "UK time. Late work is still accepted after this, and flagged."}
          </p>
        </div>
        {err("_")}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={submit} disabled={pending}>{pending ? "Creating…" : "Create assessment"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
