import { EmptyDatabaseHint } from "@/components/empty-database-hint";
import { PageHeader } from "@/components/page-header";
import { listProgrammeFees } from "@/lib/services/fees";
import { FeesTable } from "./fees-table";

export const metadata = { title: "Programme fees · Registry" };

export default async function FeesPage() {
  const { rows, current, previous } = await listProgrammeFees();
  return (
    <>
      <PageHeader
        title="Programme fees"
        description="The annual tuition fee charged to each student when they are enrolled on a programme."
      />
      {rows.length === 0 && <EmptyDatabaseHint what="No programmes yet." />}
      <FeesTable rows={rows} current={current} previous={previous} />
      <p className="text-xs text-muted-foreground">
        Closed years can&apos;t be edited. Every fee change is logged with who made it and when. Individual balances and
        payments are on each student&apos;s Finance tab.
      </p>
    </>
  );
}
