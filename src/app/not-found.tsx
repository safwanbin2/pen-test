import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="flex max-w-md flex-col items-center gap-2 text-center">
        <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-muted">
          <SearchX aria-hidden className="size-5" />
        </div>
        <h1 className="text-lg font-semibold">We couldn&apos;t find that page</h1>
        <p className="text-muted-foreground">
          The record may have been removed, or the demo data was re-seeded (which gives every record a new link).
        </p>
        <Button asChild variant="outline" className="mt-2">
          <Link href="/">Back to Registry</Link>
        </Button>
      </div>
    </main>
  );
}
