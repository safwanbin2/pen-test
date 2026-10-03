import { redirect } from "next/navigation";
import { EmptyDatabaseHint } from "@/components/empty-database-hint";
import { RoleSwitch } from "@/components/shell/role-switch";
import { StudentShell } from "@/components/shell/student-shell";
import { getSession } from "@/lib/session";
import { getCurrentStudent, listStudentsForPicker } from "@/lib/services/students";

export default async function StudentLayout({ children }: LayoutProps<"/student">) {
  const session = await getSession();
  if (session.role !== "student") redirect("/staff");
  const [student, students] = await Promise.all([getCurrentStudent(session.studentNumber), listStudentsForPicker()]);
  // No students at all (unseeded database): explain instead of redirecting, which would loop with the staff layout.
  if (!student) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-8">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-semibold tracking-tight">Registry</span>
          <RoleSwitch role="student" />
        </div>
        <EmptyDatabaseHint what="There are no students to view as yet." />
      </main>
    );
  }
  return (
    <StudentShell student={student} students={students}>
      {children}
    </StudentShell>
  );
}
