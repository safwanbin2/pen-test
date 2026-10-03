import { PageHeader } from "@/components/page-header";
import { academicYearFor, shiftAcademicYear } from "@/lib/domain/academicYear";
import { ukToday } from "@/lib/domain/time";
import { programmesWithFees } from "@/lib/services/fees";
import { StudentForm } from "../student-form";

export const metadata = { title: "New student · Registry" };

export default async function NewStudentPage() {
  const current = academicYearFor(ukToday());
  const programmes = await programmesWithFees();
  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Students", href: "/staff/students" }, { label: "New student" }]}
        title="New student"
        description="All fields are required. The student ID is assigned when you save."
      />
      <StudentForm
        mode="create"
        programmes={programmes}
        academicYears={[current, shiftAcademicYear(current, 1)]}
        initial={{
          fullName: "",
          email: "",
          dateOfBirth: "",
          fundingSource: "",
          programmeId: "",
          academicYear: current,
          status: "ENROLLED",
        }}
      />
    </>
  );
}
