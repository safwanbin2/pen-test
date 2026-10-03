import { redirect } from "next/navigation";
import { StudentShell } from "@/components/shell/student-shell";
import { getSession } from "@/lib/session";
import { getCurrentStudent, listStudentsForPicker } from "@/lib/services/students";

export default async function StudentLayout({ children }: LayoutProps<"/student">) {
  const session = await getSession();
  if (session.role !== "student") redirect("/staff");
  const [student, students] = await Promise.all([getCurrentStudent(session.studentNumber), listStudentsForPicker()]);
  if (!student) redirect("/staff");
  return (
    <StudentShell student={student} students={students}>
      {children}
    </StudentShell>
  );
}
