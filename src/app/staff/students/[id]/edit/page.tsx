import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { StudentForm } from "../../student-form";

export const metadata = { title: "Edit student · Registry" };

export default async function EditStudentPage({ params }: PageProps<"/staff/students/[id]/edit">) {
  const { id } = await params;
  const student = await db.student.findUnique({ where: { id }, include: { programme: true } });
  if (!student) notFound();
  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Students", href: "/staff/students" },
          { label: student.studentNumber, href: `/staff/students/${id}` },
          { label: "Edit" },
        ]}
        title={`Edit ${student.fullName}`}
        description={`${student.programme.name} · ${student.academicYear}`}
      />
      <StudentForm
        mode="edit"
        studentId={id}
        studentNumber={student.studentNumber}
        programmes={[]}
        academicYears={[]}
        initial={{
          fullName: student.fullName,
          email: student.email,
          dateOfBirth: student.dateOfBirth.toISOString().slice(0, 10),
          fundingSource: student.fundingSource,
          programmeId: student.programmeId,
          academicYear: student.academicYear,
          status: "ENROLLED",
        }}
      />
    </>
  );
}
