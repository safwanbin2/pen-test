// UK-time helpers. Instants are stored in UTC; everything the Registry sees and
// enters is Europe/London (D9). Calendar dates (due dates, payment dates) are
// represented as JS Dates at UTC midnight, which is how Prisma returns @db.Date.

export const UK_TIME_ZONE = "Europe/London";
const DAY_MS = 86_400_000;

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: UK_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function ukParts(instant: Date): Parts {
  const p: Record<string, number> = {};
  for (const { type, value } of partsFormatter.formatToParts(instant)) {
    if (type !== "literal") p[type] = Number(value);
  }
  return { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute, second: p.second };
}

/** Minutes UK local time is ahead of UTC at this instant (0 in GMT, 60 in BST). */
function ukOffsetMinutes(instant: Date): number {
  const p = ukParts(instant);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60_000);
}

/** A calendar date (UTC midnight) from year, month (1-12), day. */
export function calendarDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/** Today's date in the UK, as a calendar date. */
export function ukToday(now: Date = new Date()): Date {
  const p = ukParts(now);
  return calendarDate(p.year, p.month, p.day);
}

/** The UTC instant for a UK wall-clock time, e.g. 23:59 on 14 Oct 2026 (BST) -> 22:59Z. */
export function ukDateTime(date: Date, hour: number, minute: number): Date {
  const guess = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour, minute);
  const first = guess - ukOffsetMinutes(new Date(guess)) * 60_000;
  // Re-check at the candidate instant in case the guess straddled a clock change.
  return new Date(guess - ukOffsetMinutes(new Date(first)) * 60_000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Whole calendar days from `from` to `to` (both calendar dates). */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}
