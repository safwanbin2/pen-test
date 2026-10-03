// Academic years run 1 September to 31 August and are labelled "2026/27".

const LABEL = /^(\d{4})\/(\d{2})$/;

/** The academic year a UK calendar date falls in. */
export function academicYearFor(date: Date): string {
  const year = date.getUTCFullYear();
  const startYear = date.getUTCMonth() >= 8 ? year : year - 1; // getUTCMonth: 8 = September
  return label(startYear);
}

/** "2026/27" -> 2026 */
export function academicYearStart(academicYear: string): number {
  const match = LABEL.exec(academicYear);
  if (!match) throw new Error(`Invalid academic year "${academicYear}"`);
  const start = Number(match[1]);
  if ((start + 1) % 100 !== Number(match[2])) throw new Error(`Invalid academic year "${academicYear}"`);
  return start;
}

export function shiftAcademicYear(academicYear: string, years: number): string {
  return label(academicYearStart(academicYear) + years);
}

function label(startYear: number): string {
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`;
}
