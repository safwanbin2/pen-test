import { redirect } from "next/navigation";
import { Hourglass } from "lucide-react";
import { StackLabel } from "@/components/data-table";
import { Mono } from "@/components/money";
import { CLASSIFICATION_BANDS } from "@/lib/domain/classification";
import { formatUkDate, REGISTRY_CONTACT } from "@/lib/format";
import { getSession } from "@/lib/session";
import { getStudentResults } from "@/lib/services/results";
import { getCurrentStudent } from "@/lib/services/students";
import { cn } from "@/lib/utils";

export const metadata = { title: "My results · Registry" };

export default async function MyResultsPage() {
  const session = await getSession();
  const student = await getCurrentStudent(session.studentNumber);
  if (!student) redirect("/staff");
  // Only published snapshots: withheld or pending marks, reasons and notes never reach this page (D12, D13).
  const results = await getStudentResults(student);
  const latest = results.map((r) => r.publishedAt).filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0];

  return (
    <>
      <div>
        <h1 className="text-xl leading-7 font-semibold tracking-tight">My results</h1>
        <p className="text-muted-foreground">{student.programme.name} · {student.academicYear}</p>
      </div>

      {results.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border px-4 py-12 text-center">
          <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-muted">
            <Hourglass aria-hidden className="size-5" />
          </div>
          <div className="font-semibold">Your results have not been released yet.</div>
          <p className="max-w-md text-muted-foreground">
            They will appear here as soon as they are. If you have a question,{" "}
            <a href={REGISTRY_CONTACT} className="font-medium text-primary underline-offset-4 hover:underline">contact Registry</a>.
          </p>
        </div>
      ) : (
        <section aria-labelledby="ms-h" className="flex flex-col gap-3">
          <h2 id="ms-h" className="text-base font-semibold">Marksheet</h2>
          <div className="overflow-hidden rounded-lg border">
            <table className="table-stack w-full border-collapse text-left">
              <thead className="bg-muted text-xs text-muted-foreground">
                <tr className="h-9">
                  <th scope="col" className="px-4 font-medium">Assessment</th>
                  <th scope="col" className="px-3 font-medium">Module</th>
                  <th scope="col" className="px-3 text-right font-medium">Mark</th>
                  <th scope="col" className="px-4 font-medium">Classification</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} className="h-12 border-t max-sm:[grid-template-areas:'ti_ti'_'md_md'_'mk_cl']">
                    <td className="px-4 font-medium max-sm:[grid-area:ti]">{r.title}</td>
                    <td className="px-3 max-sm:text-xs max-sm:[grid-area:md]">
                      <Mono className="max-sm:text-xs">{r.module.code}</Mono> <span className="text-muted-foreground">{r.module.title}</span>
                    </td>
                    <td className="px-3 text-right font-mono text-[15px] font-medium max-sm:[grid-area:mk]">
                      <StackLabel>Mark</StackLabel>
                      {r.score}
                    </td>
                    <td className={cn("px-4 max-sm:justify-self-end max-sm:[grid-area:cl]", r.classification === "Fail" && "font-semibold")}>
                      {r.classification}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            {latest ? `Published ${formatUkDate(latest)}. ` : ""}Other marks appear here once they are released. {CLASSIFICATION_BANDS}.
          </p>
        </section>
      )}
    </>
  );
}
