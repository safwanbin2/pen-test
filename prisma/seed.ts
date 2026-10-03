// Demo data that reproduces the screens in design/canvas (see docs/UI_GUIDE.md).
//
// Every date is an offset from today (D17). The design was drawn on Thu 22 Oct
// 2026, so an offset of -8 days is "14 Oct" in the design: the BUS4001 deadline.
// Run any day and the stories still hold: Aisha is 21 days overdue, Tom
// submitted 1 day 3 hours late, Priya owes money but nothing is due yet, and so on.
//
// Idempotent: wipes every table, then inserts.

import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { db } from "../src/lib/db";
import type {
  AuditArea,
  FundingSource,
  PaymentMethod,
  ReleaseStatus,
  StudentStatus,
  WithholdReason,
} from "../src/generated/prisma/enums";
import { academicYearFor, academicYearStart, shiftAcademicYear } from "../src/lib/domain/academicYear";
import { accountSummary } from "../src/lib/domain/finance";
import { DEFAULT_INSTALMENT_PERCENTS, formatGBP, splitByPercent } from "../src/lib/domain/money";
import { formatStudentNumber } from "../src/lib/domain/studentNumber";
import { addDays, calendarDate, ukDateTime, ukToday } from "../src/lib/domain/time";
import { saveFile } from "../src/lib/services/storage";

// ---------------------------------------------------------------------------
// Time anchors
// ---------------------------------------------------------------------------

const now = new Date();
const today = ukToday(now);
const day = (offset: number) => addDays(today, offset);

/** A UK wall-clock time `offset` days from today, never later than now. */
function at(offset: number, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const instant = ukDateTime(day(offset), h, m);
  return instant > now ? new Date(now.getTime() - 5 * 60_000) : instant;
}

/** Same, but allowed in the future (deadlines). */
const deadlineAt = (offset: number) => ukDateTime(day(offset), 23, 59);

const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const fmtDay = (offset: number) => shortDate.format(day(offset));

const CURRENT = academicYearFor(today);
const PREVIOUS = shiftAcademicYear(CURRENT, -1);
const NEXT = shiftAcademicYear(CURRENT, 1);

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

const HANNAH = { actorName: "Hannah Price", actorRole: "Registry Officer" };
const OWEN = { actorName: "Owen Grant", actorRole: "Registry Administrator" };
const SFE_IMPORT = { actorName: "Registry", actorRole: "SFE payment import" };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function wipe() {
  await db.auditLog.deleteMany();
  await db.submissionVersion.deleteMany();
  await db.submission.deleteMany();
  await db.mark.deleteMany();
  await db.extension.deleteMany();
  await db.assessment.deleteMany();
  await db.payment.deleteMany();
  await db.instalment.deleteMany();
  await db.feeCharge.deleteMany();
  await db.student.deleteMany();
  await db.studentNumberCounter.deleteMany();
  await db.moduleProgramme.deleteMany();
  await db.module.deleteMany();
  await db.programmeFee.deleteMany();
  await db.programme.deleteMany();
}

type Actor = { actorName: string; actorRole: string };

function audit(
  actor: Actor,
  createdAt: Date,
  area: AuditArea,
  action: string,
  fields: {
    studentId?: string;
    subject?: string;
    fromValue?: string;
    toValue?: string;
    reasonCode?: string;
    reason?: string;
  },
) {
  return db.auditLog.create({ data: { ...actor, createdAt, area, action, ...fields } });
}

async function createStudent(input: {
  sequence: number;
  intakeYear: number;
  fullName: string;
  email: string;
  dateOfBirth: Date;
  programmeId: string;
  academicYear: string;
  status: StudentStatus;
  fundingSource: FundingSource;
  enrolledAt: Date;
}) {
  const student = await db.student.create({
    data: {
      studentNumber: formatStudentNumber(input.intakeYear, input.sequence),
      fullName: input.fullName,
      email: input.email,
      dateOfBirth: input.dateOfBirth,
      programmeId: input.programmeId,
      academicYear: input.academicYear,
      status: input.status,
      fundingSource: input.fundingSource,
      createdAt: input.enrolledAt,
    },
  });
  await audit(OWEN, input.enrolledAt, "ENROLMENT", "student.enrolled", {
    studentId: student.id,
    fromValue: "No status",
    toValue: "Enrolled",
    reason: "Identity and qualification checks complete.",
  });
  return student;
}

async function chargeTuition(input: {
  studentId: string;
  academicYear: string;
  programmeName: string;
  amountPence: number;
  dueOffsets: number[];
  chargedAt: Date;
  cancelledSequences?: { sequence: number; at: Date }[];
}) {
  const amounts = splitByPercent(input.amountPence, DEFAULT_INSTALMENT_PERCENTS);
  return db.feeCharge.create({
    data: {
      studentId: input.studentId,
      academicYear: input.academicYear,
      description: `Tuition fee · ${input.programmeName}, ${input.academicYear}`,
      amountPence: input.amountPence,
      createdAt: input.chargedAt,
      instalments: {
        create: amounts.map((amountPence, i) => ({
          sequence: i + 1,
          dueDate: day(input.dueOffsets[i]),
          amountPence,
          cancelledAt: input.cancelledSequences?.find((c) => c.sequence === i + 1)?.at,
        })),
      },
    },
  });
}

async function pay(input: {
  studentId: string;
  amountPence: number;
  paidOnOffset: number;
  reference: string;
  method: PaymentMethod;
  recordedBy: Actor;
  subject: string;
  time?: string;
}) {
  await db.payment.create({
    data: {
      studentId: input.studentId,
      amountPence: input.amountPence,
      paidOn: day(input.paidOnOffset),
      reference: input.reference,
      method: input.method,
      recordedBy: input.recordedBy.actorName,
      createdAt: at(input.paidOnOffset, input.time ?? "14:20"),
    },
  });
  await audit(input.recordedBy, at(input.paidOnOffset, input.time ?? "14:20"), "FEES", "payment.recorded", {
    studentId: input.studentId,
    subject: input.subject,
    fromValue: "Due",
    toValue: "Paid",
    reason: `Payment ${input.reference} of ${formatGBP(input.amountPence)} received.`,
  });
}

// Small real PDF/DOCX files so seeded submissions can be downloaded (D27).
const SAMPLE = {
  pdf: readFileSync(path.join(__dirname, "seed-files", "sample.pdf")),
  docx: readFileSync(path.join(__dirname, "seed-files", "sample.docx")),
};

async function submit(
  studentId: string,
  assessmentId: string,
  code: string,
  versions: { file: string; at: Date }[],
) {
  for (const v of versions) {
    await saveFile(`seed/${code}/${v.file}`, v.file.endsWith(".pdf") ? SAMPLE.pdf : SAMPLE.docx);
  }
  await db.submission.create({
    data: {
      studentId,
      assessmentId,
      createdAt: versions[0].at,
      versions: {
        create: versions.map((v, i) => ({
          version: i + 1,
          originalName: v.file,
          storageKey: `seed/${code}/${v.file}`,
          mimeType: v.file.endsWith(".pdf")
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          sizeBytes: (v.file.endsWith(".pdf") ? SAMPLE.pdf : SAMPLE.docx).length,
          submittedAt: v.at,
        })),
      },
    },
  });
}

async function mark(input: {
  studentId: string;
  assessmentId: string;
  score: number;
  markedAt: Date;
  releaseStatus: ReleaseStatus;
  publishedScore?: number;
  withholdReason?: WithholdReason;
  releaseNote?: string;
  releasedAt?: Date;
}) {
  await db.mark.create({
    data: {
      studentId: input.studentId,
      assessmentId: input.assessmentId,
      score: input.score,
      markedBy: HANNAH.actorName,
      updatedAt: input.markedAt,
      releaseStatus: input.releaseStatus,
      publishedScore: input.publishedScore,
      withholdReason: input.withholdReason,
      releaseNote: input.releaseNote,
      releasedBy: input.releasedAt ? HANNAH.actorName : undefined,
      releasedAt: input.releasedAt,
    },
  });
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function main() {
  await wipe();

  // Programmes and fees (2025/26 -> 2026/27 in the design)
  const programmes = {
    business: await db.programme.create({ data: { code: "BUS-BA", name: "BA (Hons) Business Management" } }),
    law: await db.programme.create({ data: { code: "LAW-LLB", name: "LLB (Hons) Law" } }),
    computing: await db.programme.create({ data: { code: "COM-BSC", name: "BSc (Hons) Computing" } }),
  };
  const fees = {
    business: { [PREVIOUS]: 925_000, [CURRENT]: 953_500 },
    law: { [PREVIOUS]: 925_000, [CURRENT]: 953_500 },
    computing: { [PREVIOUS]: 800_000, [CURRENT]: 825_000 },
  };
  for (const key of ["business", "law", "computing"] as const) {
    for (const [academicYear, amountPence] of Object.entries(fees[key])) {
      await db.programmeFee.create({
        data: { programmeId: programmes[key].id, academicYear, amountPence, updatedBy: OWEN.actorName },
      });
    }
  }

  // Modules; BUS4001 is a shared Level 4 module (D19)
  async function module(code: string, title: string, on: (keyof typeof programmes)[]) {
    return db.module.create({
      data: { code, title, level: 4, programmes: { create: on.map((p) => ({ programmeId: programmes[p].id })) } },
    });
  }
  const modules = {
    bus4001: await module("BUS4001", "Principles of Management", ["business", "law", "computing"]),
    bus4002: await module("BUS4002", "Marketing Fundamentals", ["business"]),
    bus4003: await module("BUS4003", "Economics for Business", ["business"]),
    bus4004: await module("BUS4004", "Business Finance", ["business"]),
    law4002: await module("LAW4002", "Contract Law", ["law"]),
    com4003: await module("COM4003", "Programming Fundamentals", ["computing"]),
  };

  async function assessment(moduleId: string, title: string, deadline: Date) {
    return db.assessment.create({
      data: { moduleId, academicYear: CURRENT, title, deadline, createdBy: OWEN.actorName, createdAt: at(-40, "09:30") },
    });
  }
  const assessments = {
    bus4002: await assessment(modules.bus4002.id, "Presentation", deadlineAt(-30)),
    bus4001: await assessment(modules.bus4001.id, "Report (2,500 words)", deadlineAt(-8)),
    bus4004: await assessment(modules.bus4004.id, "Case Study (1,500 words)", deadlineAt(2)),
    bus4003: await assessment(modules.bus4003.id, "Essay (2,000 words)", deadlineAt(27)),
    law4002: await assessment(modules.law4002.id, "Problem Question", deadlineAt(14)),
    com4003: await assessment(modules.com4003.id, "Portfolio", deadlineAt(8)),
  };

  const intake = academicYearStart(CURRENT);
  const previousIntake = academicYearStart(PREVIOUS);
  const sfeDue = [-51, -21, 102]; // 1 Sep, 1 Oct, 1 Feb in the design

  // 1. Aisha: instalment 2 is 21 days overdue; BUS4002 withheld for fees; BUS4001 61 Merit pending (fees alert).
  const aisha = await createStudent({
    sequence: 1, intakeYear: intake, fullName: "Aisha Rahman", email: "a.rahman@students.example.org",
    dateOfBirth: calendarDate(2006, 4, 12), programmeId: programmes.business.id, academicYear: CURRENT,
    status: "ENROLLED", fundingSource: "STUDENT_FINANCE", enrolledAt: at(-55, "10:41"),
  });
  await chargeTuition({ studentId: aisha.id, academicYear: CURRENT, programmeName: programmes.business.name,
    amountPence: fees.business[CURRENT], dueOffsets: sfeDue, chargedAt: at(-51, "09:00") });
  await pay({ studentId: aisha.id, amountPence: 238_375, paidOnOffset: -51, reference: "SFE-2026-118204",
    method: "STUDENT_FINANCE", recordedBy: SFE_IMPORT, subject: "Instalment 1" });
  await submit(aisha.id, assessments.bus4001.id, "BUS4001", [{ file: "Rahman_BUS4001_Report.docx", at: at(-8, "22:47") }]);
  // BUS4001 marked but pending: the Results screen shows the overdue-fees alert here.
  await mark({ studentId: aisha.id, assessmentId: assessments.bus4001.id, score: 61, markedAt: at(-2, "11:05"),
    releaseStatus: "PENDING" });
  // An earlier result already withheld for fees (by Hannah Price, a week ago).
  await submit(aisha.id, assessments.bus4002.id, "BUS4002", [{ file: "Rahman_BUS4002_Presentation.pdf", at: at(-31, "19:20") }]);
  await mark({ studentId: aisha.id, assessmentId: assessments.bus4002.id, score: 58, markedAt: at(-12, "10:15"),
    releaseStatus: "WITHHELD", withholdReason: "FEES_OUTSTANDING", releasedAt: at(-7, "09:12"),
    releaseNote: "Instalment 2 unpaid for 14 days. Release once the overdue amount is paid." });
  await audit(HANNAH, at(-7, "09:12"), "RESULTS", "result.withheld", {
    studentId: aisha.id, subject: "BUS4002 Presentation", fromValue: "Pending", toValue: "Withheld",
    reasonCode: "FEES_OUTSTANDING", reason: "Instalment 2 unpaid for 14 days. Release once the overdue amount is paid.",
  });

  // 2. Daniel: paid in full; resubmitted BUS4001 (v2) before the deadline; 74 Distinction published.
  const daniel = await createStudent({
    sequence: 2, intakeYear: intake, fullName: "Daniel Okafor", email: "d.okafor@students.example.org",
    dateOfBirth: calendarDate(2005, 11, 3), programmeId: programmes.business.id, academicYear: CURRENT,
    status: "ENROLLED", fundingSource: "SELF_FUNDED", enrolledAt: at(-56, "11:15"),
  });
  await chargeTuition({ studentId: daniel.id, academicYear: CURRENT, programmeName: programmes.business.name,
    amountPence: fees.business[CURRENT], dueOffsets: sfeDue, chargedAt: at(-51, "09:00") });
  await pay({ studentId: daniel.id, amountPence: fees.business[CURRENT], paidOnOffset: -20, reference: "BACS-77812",
    method: "BANK_TRANSFER", recordedBy: HANNAH, subject: "Instalments 1–3", time: "10:30" });
  await submit(daniel.id, assessments.bus4001.id, "BUS4001", [
    { file: "Okafor_BUS4001_Report.pdf", at: at(-9, "10:05") },
    { file: "Okafor_BUS4001_Report_v2.pdf", at: at(-8, "21:12") },
  ]);
  await submit(daniel.id, assessments.bus4002.id, "BUS4002", [{ file: "Okafor_BUS4002_Presentation.pdf", at: at(-30, "16:45") }]);
  await mark({ studentId: daniel.id, assessmentId: assessments.bus4002.id, score: 66, markedAt: at(-14, "09:40"),
    releaseStatus: "PUBLISHED", publishedScore: 66, releasedAt: at(-12, "15:00") });
  await submit(daniel.id, assessments.bus4004.id, "BUS4004", [
    { file: "Okafor_BUS4004_CaseStudy.pdf", at: at(-2, "18:02") },
    { file: "Okafor_BUS4004_CaseStudy_v2.pdf", at: at(0, "09:14") },
  ]);
  await mark({ studentId: daniel.id, assessmentId: assessments.bus4001.id, score: 74, markedAt: at(-2, "10:40"),
    releaseStatus: "PUBLISHED", publishedScore: 74, releasedAt: at(-2, "16:10") });
  await audit(HANNAH, at(-2, "16:10"), "RESULTS", "result.published", {
    studentId: daniel.id, subject: "BUS4001 Report", fromValue: "Pending", toValue: "Published",
  });

  // 3. Priya: sponsor-funded, balance but nothing due yet; BUS4001 35 Fail, pending.
  const priya = await createStudent({
    sequence: 3, intakeYear: intake, fullName: "Priya Patel", email: "p.patel@students.example.org",
    dateOfBirth: calendarDate(2006, 7, 21), programmeId: programmes.computing.id, academicYear: CURRENT,
    status: "ENROLLED", fundingSource: "SPONSOR", enrolledAt: at(-55, "14:02"),
  });
  await chargeTuition({ studentId: priya.id, academicYear: CURRENT, programmeName: programmes.computing.name,
    amountPence: fees.computing[CURRENT], dueOffsets: [9, 40, 102], chargedAt: at(-51, "09:00") });
  await submit(priya.id, assessments.bus4001.id, "BUS4001", [{ file: "Patel_BUS4001_Report.pdf", at: at(-8, "18:05") }]);
  await mark({ studentId: priya.id, assessmentId: assessments.bus4001.id, score: 35, markedAt: at(-2, "11:20"),
    releaseStatus: "PENDING" });

  // 4. Tom: BUS4001 1 day 3 hours late; 52 Pass published; part-paid instalment 2 now 4 days overdue.
  const tom = await createStudent({
    sequence: 4, intakeYear: intake, fullName: "Tom Hughes", email: "t.hughes@students.example.org",
    dateOfBirth: calendarDate(2004, 2, 9), programmeId: programmes.law.id, academicYear: CURRENT,
    status: "ENROLLED", fundingSource: "SELF_FUNDED", enrolledAt: at(-55, "15:30"),
  });
  await chargeTuition({ studentId: tom.id, academicYear: CURRENT, programmeName: programmes.law.name,
    amountPence: fees.law[CURRENT], dueOffsets: [-51, -4, 102], chargedAt: at(-51, "09:00") });
  await pay({ studentId: tom.id, amountPence: 238_375, paidOnOffset: -51, reference: "CARD-40219",
    method: "CARD", recordedBy: HANNAH, subject: "Instalment 1", time: "12:10" });
  await pay({ studentId: tom.id, amountPence: 150_000, paidOnOffset: -4, reference: "BACS-77850",
    method: "BANK_TRANSFER", recordedBy: HANNAH, subject: "Instalment 2 (part)", time: "15:45" });
  await submit(tom.id, assessments.bus4001.id, "BUS4001", [{ file: "Hughes_BUS4001_Report.docx", at: at(-6, "02:59") }]);
  await mark({ studentId: tom.id, assessmentId: assessments.bus4001.id, score: 52, markedAt: at(-2, "10:55"),
    releaseStatus: "PUBLISHED", publishedScore: 52, releasedAt: at(-2, "16:10") });
  await audit(HANNAH, at(-2, "16:10"), "RESULTS", "result.published", {
    studentId: tom.id, subject: "BUS4001 Report", fromValue: "Pending", toValue: "Published",
  });

  // 5. Mariam: extension of 7 days, submitted inside it (not late); mark changed 58 -> 64 after publishing.
  const mariam = await createStudent({
    sequence: 5, intakeYear: intake, fullName: "Mariam Hossain", email: "m.hossain@students.example.org",
    dateOfBirth: calendarDate(2006, 1, 30), programmeId: programmes.law.id, academicYear: CURRENT,
    status: "ENROLLED", fundingSource: "STUDENT_FINANCE", enrolledAt: at(-55, "16:05"),
  });
  await chargeTuition({ studentId: mariam.id, academicYear: CURRENT, programmeName: programmes.law.name,
    amountPence: fees.law[CURRENT], dueOffsets: sfeDue, chargedAt: at(-51, "09:00") });
  await pay({ studentId: mariam.id, amountPence: 238_375, paidOnOffset: -51, reference: "SFE-2026-118377",
    method: "STUDENT_FINANCE", recordedBy: SFE_IMPORT, subject: "Instalment 1" });
  await pay({ studentId: mariam.id, amountPence: 238_375, paidOnOffset: -21, reference: "SFE-2026-131902",
    method: "STUDENT_FINANCE", recordedBy: SFE_IMPORT, subject: "Instalment 2" });
  const extensionNote = `Evidence received ${fmtDay(-10)} and approved by the module leader.`;
  await db.extension.create({
    data: { studentId: mariam.id, assessmentId: assessments.bus4001.id, newDeadline: deadlineAt(-1),
      reason: "MITIGATING_CIRCUMSTANCES", note: extensionNote, grantedBy: HANNAH.actorName, createdAt: at(-10, "14:05") },
  });
  await audit(HANNAH, at(-10, "14:05"), "SUBMISSIONS", "extension.granted", {
    studentId: mariam.id, subject: "BUS4001 Report", fromValue: `Due ${fmtDay(-8)}, 23:59`, toValue: `Due ${fmtDay(-1)}, 23:59`,
    reasonCode: "MITIGATING_CIRCUMSTANCES", reason: extensionNote,
  });
  await submit(mariam.id, assessments.bus4001.id, "BUS4001", [{ file: "Hossain_BUS4001_Report.pdf", at: at(-3, "16:40") }]);
  await mark({ studentId: mariam.id, assessmentId: assessments.bus4001.id, score: 64, markedAt: at(-1, "15:30"),
    releaseStatus: "NEEDS_REPUBLISH", publishedScore: 58, releasedAt: at(-2, "16:10") });
  await audit(HANNAH, at(-2, "16:10"), "RESULTS", "result.published", {
    studentId: mariam.id, subject: "BUS4001 Report", fromValue: "Pending", toValue: "Published",
  });
  await audit(HANNAH, at(-1, "15:30"), "RESULTS", "mark.changed", {
    studentId: mariam.id, subject: "BUS4001 Report", fromValue: "58", toValue: "64",
    reason: "Second marking agreed a higher mark. Needs re-publishing.",
  });

  // 6. James: withdrawn; instalment 3 cancelled, instalment 2 (due before withdrawal) still payable (D21).
  const james = await createStudent({
    sequence: 6, intakeYear: intake, fullName: "James Wilson", email: "j.wilson@students.example.org",
    dateOfBirth: calendarDate(2005, 9, 17), programmeId: programmes.computing.id, academicYear: CURRENT,
    status: "WITHDRAWN", fundingSource: "STUDENT_FINANCE", enrolledAt: at(-55, "16:40"),
  });
  await chargeTuition({ studentId: james.id, academicYear: CURRENT, programmeName: programmes.computing.name,
    amountPence: fees.computing[CURRENT], dueOffsets: sfeDue, chargedAt: at(-51, "09:00"),
    cancelledSequences: [{ sequence: 3, at: at(-20, "11:20") }] });
  await pay({ studentId: james.id, amountPence: 206_250, paidOnOffset: -50, reference: "SFE-2026-118590",
    method: "STUDENT_FINANCE", recordedBy: SFE_IMPORT, subject: "Instalment 1" });
  await audit(HANNAH, at(-20, "11:20"), "ENROLMENT", "student.status_changed", {
    studentId: james.id, fromValue: "Enrolled", toValue: "Withdrawn", reason: "Personal circumstances",
  });
  await audit(HANNAH, at(-20, "11:20"), "FEES", "instalment.cancelled", {
    studentId: james.id, subject: "Instalment 3", fromValue: "Due", toValue: "Cancelled",
    reason: "Withdrawn before this instalment was due. Instalments already due remain payable.",
  });

  // 7. Sofia: deferred to next year before being charged.
  const sofia = await createStudent({
    sequence: 7, intakeYear: intake, fullName: "Sofia Rossi", email: "s.rossi@students.example.org",
    dateOfBirth: calendarDate(2006, 5, 5), programmeId: programmes.business.id, academicYear: NEXT,
    status: "DEFERRED", fundingSource: "SELF_FUNDED", enrolledAt: at(-60, "09:50"),
  });
  await audit(HANNAH, at(-58, "13:15"), "ENROLMENT", "student.status_changed", {
    studentId: sofia.id, fromValue: "Enrolled", toValue: "Deferred", reason: `Start deferred to ${NEXT} at the student's request.`,
  });

  // 8. Chen: completed last year; overpaid, so £120.00 credit.
  const chen = await createStudent({
    sequence: 12, intakeYear: previousIntake, fullName: "Chen Wei", email: "c.wei@students.example.org",
    dateOfBirth: calendarDate(2003, 12, 11), programmeId: programmes.computing.id, academicYear: PREVIOUS,
    status: "COMPLETED", fundingSource: "SELF_FUNDED", enrolledAt: at(-420, "10:00"),
  });
  await chargeTuition({ studentId: chen.id, academicYear: PREVIOUS, programmeName: programmes.computing.name,
    amountPence: fees.computing[PREVIOUS], dueOffsets: [-416, -386, -264], chargedAt: at(-416, "09:00") });
  await pay({ studentId: chen.id, amountPence: 400_000, paidOnOffset: -416, reference: "BACS-51207",
    method: "BANK_TRANSFER", recordedBy: OWEN, subject: "Instalments 1–2" });
  await pay({ studentId: chen.id, amountPence: 412_000, paidOnOffset: -264, reference: "BACS-60318",
    method: "BANK_TRANSFER", recordedBy: OWEN, subject: "Instalment 3" });
  await audit(OWEN, at(-90, "10:00"), "ENROLMENT", "student.status_changed", {
    studentId: chen.id, fromValue: "Enrolled", toValue: "Completed", reason: "Programme completed; final results confirmed by the exam board.",
  });

  // Student-number counters continue after the seeded students (D4).
  await db.studentNumberCounter.createMany({
    data: [
      { year: intake, lastValue: 7 },
      { year: previousIntake, lastValue: 12 },
    ],
  });

  await printSummary();
}

/** Prints the derived figures so the seed can be checked against the design at a glance. */
async function printSummary() {
  const students = await db.student.findMany({
    orderBy: { studentNumber: "asc" },
    include: { feeCharges: { include: { instalments: true } }, payments: true },
  });
  console.log(`Seeded ${students.length} students · today ${shortDate.format(today)} · academic year ${CURRENT}\n`);
  for (const s of students) {
    const instalments = s.feeCharges.flatMap((c) =>
      c.instalments.map((i) => ({ ...i, cancelled: i.cancelledAt !== null })),
    );
    const a = accountSummary(instalments, s.payments, today);
    const money = a.creditPence
      ? `credit ${formatGBP(a.creditPence)}`
      : `balance ${formatGBP(a.balancePence)}` +
        (a.overduePence ? ` · overdue ${formatGBP(a.overduePence)} (${a.daysOverdue} days)` : "");
    console.log(`  ${s.studentNumber}  ${s.fullName.padEnd(15)} ${s.status.padEnd(9)} ${money}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
