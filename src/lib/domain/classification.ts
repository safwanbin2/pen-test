// Classification is derived from the mark, never stored (D11). Marks are
// whole numbers 0–100 (D10), so there is no rounding at the boundaries.

export type Classification = "Fail" | "Pass" | "Merit" | "Distinction";

export const CLASSIFICATION_BANDS = "Fail <40 · Pass 40–59 · Merit 60–69 · Distinction 70+";

export function isValidMark(score: unknown): score is number {
  return typeof score === "number" && Number.isInteger(score) && score >= 0 && score <= 100;
}

export function classify(score: number): Classification {
  if (!isValidMark(score)) throw new RangeError(`Mark must be a whole number from 0 to 100, got ${score}`);
  if (score >= 70) return "Distinction";
  if (score >= 60) return "Merit";
  if (score >= 40) return "Pass";
  return "Fail";
}
