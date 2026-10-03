// Student numbers: SMS-<intake year>-<4-digit sequence> (D4). The sequence
// comes from StudentNumberCounter, incremented in a transaction.

const PATTERN = /^SMS-(\d{4})-(\d{4,})$/;

export function formatStudentNumber(year: number, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) throw new Error("Sequence must be a positive integer");
  return `SMS-${year}-${String(sequence).padStart(4, "0")}`;
}

export function parseStudentNumber(value: string): { year: number; sequence: number } | null {
  const match = PATTERN.exec(value.trim().toUpperCase());
  return match ? { year: Number(match[1]), sequence: Number(match[2]) } : null;
}
