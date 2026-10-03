"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FileUp, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type State =
  | { kind: "idle" }
  | { kind: "uploading"; name: string; loaded: number; total: number; xhr: XMLHttpRequest }
  | { kind: "rejected"; message: string; detail?: string };

const MAX_MB = 10;
const mb = (bytes: number) => (bytes / 1_048_576).toFixed(1);

/** Drop zone + upload with progress (UI guide: Upload states). The server re-checks everything. */
export function UploadPanel({
  assessmentId,
  existingVersion,
  late,
}: {
  assessmentId: string;
  existingVersion: number | null;
  late: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);
  const replacing = existingVersion !== null;

  function upload(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx"].includes(ext ?? "") || file.size > MAX_MB * 1_048_576) {
      setState({
        kind: "rejected",
        message: `Only PDF or DOCX files up to ${MAX_MB} MB.`,
        detail: `${file.name} is ${ext && ext !== file.name.toLowerCase() ? `a ${ext.toUpperCase()} file` : "not a PDF or DOCX file"} (${mb(file.size)} MB).`,
      });
      return;
    }
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file);
    setState({ kind: "uploading", name: file.name, loaded: 0, total: file.size, xhr });
    xhr.upload.onprogress = (e) =>
      setState((s) => (s.kind === "uploading" ? { ...s, loaded: e.loaded, total: e.total || s.total } : s));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setState({ kind: "idle" });
        router.refresh();
      } else {
        let message = "The upload didn't go through. Try again.";
        try {
          message = JSON.parse(xhr.responseText).error?.message ?? message;
        } catch {}
        setState({ kind: "rejected", message });
      }
    };
    xhr.onerror = () => setState({ kind: "rejected", message: "Couldn't reach the server. Check your connection and try again." });
    xhr.open("POST", `/api/assessments/${assessmentId}/submissions`);
    xhr.send(form);
  }

  if (state.kind === "uploading") {
    const pct = Math.round((state.loaded / state.total) * 100);
    return (
      <div className="flex flex-col gap-2 rounded-lg border p-3" aria-live="polite">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium">{state.name}</span>
          <Button variant="ghost" size="sm" onClick={() => { state.xhr.abort(); setState({ kind: "idle" }); }}>
            <X aria-hidden /> Cancel upload
          </Button>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
          <div className="h-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Uploading… {pct}%</span>
          <span className="font-mono">{mb(state.loaded)} of {mb(state.total)} MB</span>
        </div>
        <p className="text-xs text-muted-foreground">Keep this page open until you see your receipt.</p>
      </div>
    );
  }

  const fileInput = (
    <input
      ref={input}
      type="file"
      accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      className="sr-only"
      aria-label={replacing ? "Choose a replacement file" : "Choose a file to submit"}
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) upload(f);
        e.target.value = "";
      }}
    />
  );

  if (replacing && state.kind === "idle") {
    return (
      <div className="flex flex-col items-start gap-2">
        {fileInput}
        <Button variant="outline" onClick={() => input.current?.click()}>
          <RefreshCw aria-hidden />
          Replace file (v{existingVersion + 1})
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {fileInput}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) upload(f);
        }}
        className={cn(
          "flex flex-col items-center gap-2 rounded-lg border border-dashed border-input px-4 py-6 text-center",
          dragging && "border-primary bg-primary/5",
          state.kind === "rejected" && "border-destructive",
        )}
      >
        <FileUp aria-hidden className="size-6 text-muted-foreground" />
        <span className="font-medium">Drag your file here</span>
        <Button size="sm" variant={state.kind === "rejected" ? "outline" : "default"} onClick={() => input.current?.click()}>
          {state.kind === "rejected" ? "Choose another file" : "Choose file"}
        </Button>
        <span className="text-xs text-muted-foreground">PDF or DOCX, up to {MAX_MB} MB</span>
      </div>
      {late && state.kind === "idle" && (
        <p className="text-xs text-status-late">The deadline has passed. You can still submit, but it will be recorded as late.</p>
      )}
      {state.kind === "rejected" && (
        <div role="alert" className="text-xs">
          <p className="font-medium text-destructive">{state.message}</p>
          {state.detail && <p className="text-foreground/80">{state.detail}</p>}
          <p className="text-muted-foreground">
            Nothing was submitted.{replacing ? ` Your v${existingVersion} is still on file.` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
