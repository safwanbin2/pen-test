// Result release rules (D12, D13). Release is per student, per assessment.
// Nothing is published or withheld automatically.

import type { ReleaseStatus } from "@/generated/prisma/enums";

/** What happens to the release status when staff change a mark. */
export function releaseStatusAfterMarkChange(current: ReleaseStatus, scoreChanged: boolean): ReleaseStatus {
  if (!scoreChanged) return current;
  // A published mark that changes must be re-published before the student sees it.
  return current === "PUBLISHED" ? "NEEDS_REPUBLISH" : current;
}

/**
 * The mark the student may see: the snapshot taken when it was last published.
 * Withheld or never-published marks are invisible, and so is any reason or note.
 */
export function studentVisibleScore(mark: { releaseStatus: ReleaseStatus; publishedScore: number | null }): number | null {
  if (mark.releaseStatus === "PUBLISHED" || mark.releaseStatus === "NEEDS_REPUBLISH") return mark.publishedScore;
  return null;
}

export type ReleaseAction = "PUBLISH" | "REPUBLISH" | "RELEASE" | "WITHHOLD";

/** Which actions the Results screen offers for a mark in each state. */
export function availableReleaseActions(status: ReleaseStatus): ReleaseAction[] {
  switch (status) {
    case "PENDING":
      return ["PUBLISH", "WITHHOLD"];
    case "PUBLISHED":
      return ["WITHHOLD"];
    case "NEEDS_REPUBLISH":
      return ["REPUBLISH", "WITHHOLD"];
    case "WITHHELD":
      return ["RELEASE"];
  }
}
