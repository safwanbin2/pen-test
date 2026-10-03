// Money is integer pence everywhere (D3); these helpers are the only place
// pounds appear.

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

/** 953500 -> "£9,535.00" */
export function formatGBP(pence: number): string {
  return gbp.format(pence / 100);
}

/**
 * Parse what a person types into an amount field ("500", "£1,500.50", "500.5")
 * into pence. Returns null for anything that isn't a positive amount with at
 * most two decimal places.
 */
export function parsePounds(input: string): number | null {
  const cleaned = input.replace(/[£,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ""] = cleaned.split(".");
  const pence = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return pence > 0 && Number.isSafeInteger(pence) ? pence : null;
}

/** Split a total into instalments by percentage; rounding goes on the last one. */
export function splitByPercent(totalPence: number, percents: number[]): number[] {
  if (percents.reduce((a, b) => a + b, 0) !== 100) throw new Error("Percentages must add up to 100");
  const parts = percents.map((p) => Math.floor((totalPence * p) / 100));
  parts[parts.length - 1] += totalPence - parts.reduce((a, b) => a + b, 0);
  return parts;
}

/** Default instalment plan: 25% / 25% / 50% (D1). */
export const DEFAULT_INSTALMENT_PERCENTS = [25, 25, 50];
