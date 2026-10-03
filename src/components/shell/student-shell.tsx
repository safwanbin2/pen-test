import { ClipboardList, GraduationCap, Wallet } from "lucide-react";
import { DemoNotice } from "./demo-notice";
import type { NavItem } from "./nav-link";
import { RoleSwitch } from "./role-switch";
import { BottomNav, Sidebar } from "./sidebar";
import { StudentPicker } from "./student-picker";

const NAV: NavItem[] = [
  { href: "/student/assessments", label: "Assessments", icon: <ClipboardList /> },
  { href: "/student/results", label: "Results", icon: <GraduationCap /> },
  { href: "/student/account", label: "Account", icon: <Wallet /> },
];

/** Sidebar ≥ 1024px, icon rail 640–1024px; compact header + bottom tab bar below 640px (UI guide: Student shell). */
export function StudentShell({
  student,
  students,
  children,
}: {
  student: { studentNumber: string; fullName: string };
  students: { studentNumber: string; fullName: string }[];
  children: React.ReactNode;
}) {
  const [first, ...rest] = student.fullName.split(" ");
  const shortName = rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
  return (
    <div className="flex min-h-svh w-full">
      <Sidebar section="Student" items={NAV} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden h-12 shrink-0 items-center justify-between gap-4 border-b px-6 sm:flex max-lg:px-5">
          <DemoNotice compact />
          <div className="flex items-center gap-4">
            <StudentPicker current={student.studentNumber} students={students} />
            <RoleSwitch role="student" compact />
          </div>
        </header>
        <header className="flex flex-col gap-2 border-b px-4 py-3 sm:hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[15px] font-semibold tracking-tight">
              Registry <span className="font-normal text-muted-foreground">· Student · {shortName}</span>
            </div>
            <RoleSwitch role="student" compact />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DemoNotice />
            <StudentPicker current={student.studentNumber} students={students} />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 pb-6 sm:p-5 lg:p-6">{children}</main>
        <BottomNav label="Student navigation" items={NAV} />
      </div>
    </div>
  );
}
