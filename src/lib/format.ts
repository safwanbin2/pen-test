// Display formatting (en-GB, UK time) and labels for enum values. Safe to use
// in server and client components: output doesn't depend on the machine's zone.

import type {
  AuditArea,
  ExtensionReason,
  FundingSource,
  PaymentMethod,
  ReleaseStatus,
  WithholdReason,
} from "@/generated/prisma/enums";
import { UK_TIME_ZONE } from "./domain/time";

export { formatGBP } from "./domain/money";
export { STATUS_LABEL } from "./domain/enrolment";

// Month names are fixed: some ICU versions print "Sept" for en-GB, the design uses "Sep".
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ukParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: UK_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function partsOf(instant: Date) {
  const p: Record<string, string> = {};
  for (const { type, value } of ukParts.formatToParts(instant)) p[type] = value;
  return { day: Number(p.day), month: Number(p.month), year: Number(p.year), time: `${p.hour}:${p.minute}` };
}

/** Calendar dates (due dates, payment dates, DOB): "1 Oct 2026". */
export const formatDate = (date: Date) =>
  `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;

/** An instant's UK date: "14 Oct 2026". */
export function formatUkDate(instant: Date) {
  const p = partsOf(instant);
  return `${p.day} ${MONTHS[p.month - 1]} ${p.year}`;
}

/** "14 Oct 2026, 23:59" */
export const formatUkDateTime = (instant: Date) => `${formatUkDate(instant)}, ${partsOf(instant).time}`;

/** "21 Oct" */
export function formatUkDayMonth(instant: Date) {
  const p = partsOf(instant);
  return `${p.day} ${MONTHS[p.month - 1]}`;
}

/** "21 Oct, 23:59" */
export const formatUkDayTime = (instant: Date) => `${formatUkDayMonth(instant)}, ${partsOf(instant).time}`;

export const formatUkTime = (instant: Date) => partsOf(instant).time;

/** "Saturday 3 Oct 2026" */
export function formatLongToday(instant: Date) {
  const p = partsOf(instant);
  return `${WEEKDAYS[new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()]} ${formatUkDate(instant)}`;
}

export function plural(n: number, word: string, pluralWord = `${word}s`) {
  return `${n} ${n === 1 ? word : pluralWord}`;
}

/** Whole-day distance in prose: "today", "in 2 days", "8 days ago". */
export function relativeDays(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${plural(days, "day")}` : `${plural(-days, "day")} ago`;
}


export const FUNDING_LABEL: Record<FundingSource, string> = {
  SELF_FUNDED: "Self-funded",
  STUDENT_FINANCE: "Student Finance",
  SPONSOR: "Sponsor",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  BANK_TRANSFER: "Bank transfer (BACS)",
  CARD: "Card",
  STUDENT_FINANCE: "Student Finance England",
  SPONSOR: "Sponsor",
  OTHER: "Other",
};

export const EXTENSION_REASON_LABEL: Record<ExtensionReason, string> = {
  MITIGATING_CIRCUMSTANCES: "Mitigating circumstances",
  REASONABLE_ADJUSTMENT: "Reasonable adjustment",
  TECHNICAL_ISSUE: "Technical issue",
  OTHER: "Other",
};

export const WITHHOLD_REASON_LABEL: Record<WithholdReason, string> = {
  FEES_OUTSTANDING: "Fees outstanding",
  ACADEMIC_MISCONDUCT: "Academic misconduct",
  AWAITING_EXAM_BOARD: "Awaiting exam board",
  OTHER: "Other",
};

export const RELEASE_LABEL: Record<ReleaseStatus, string> = {
  PENDING: "Pending",
  PUBLISHED: "Published",
  WITHHELD: "Withheld",
  NEEDS_REPUBLISH: "Needs re-publish",
};

export const AREA_LABEL: Record<AuditArea, string> = {
  ENROLMENT: "Enrolment",
  FEES: "Fees",
  SUBMISSIONS: "Submissions",
  RESULTS: "Results",
};

/** Where "Contact Registry" links go (one place to change it). */
export const REGISTRY_CONTACT = "mailto:registry@example.org";
