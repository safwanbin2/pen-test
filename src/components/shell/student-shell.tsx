import { ClipboardList, GraduationCap, Wallet } from "lucide-react";
import { DemoNotice } from "./demo-notice";
import { SidebarLink, TabBarLink, type NavItem } from "./nav-link";
import { RoleSwitch } from "./role-switch";
import { StudentPicker } from "./student-picker";

const NAV: NavItem[] = [
  { href: "/student/assessments", label: "Assessments", icon: <ClipboardList /> },
  { href: "/student/results", label: "Results", icon: <GraduationCap /> },
  { href: "/student/account", label: "Account", icon: <Wallet /> },
];

/** Sidebar + top bar from 640px; compact header + bottom tab bar below (UI guide: Student shell). */
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
      <aside className="sticky top-0 hidden h-svh w-56 shrink-0 flex-col border-r bg-sidebar p-2 pb-3 sm:flex">
        <div className="mb-2 flex h-10 items-center px-2 text-[15px] font-semibold tracking-tight">Registry</div>
        <div className="px-2 pb-1 text-xs font-medium text-muted-foreground">Student</div>
        <nav aria-label="Student navigation" className="flex flex-col gap-0.5">
          {NAV.map((item) => (
            <SidebarLink key={item.href} item={item} />
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden h-12 shrink-0 items-center justify-between gap-4 border-b px-6 sm:flex">
          <DemoNotice />
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
        <main className="flex flex-1 flex-col gap-4 p-4 pb-6 sm:p-6">{children}</main>
        <nav
          aria-label="Student navigation"
          className="sticky bottom-0 flex border-t bg-background pb-[env(safe-area-inset-bottom)] sm:hidden"
        >
          {NAV.map((item) => (
            <TabBarLink key={item.href} item={item} />
          ))}
        </nav>
      </div>
    </div>
  );
}
