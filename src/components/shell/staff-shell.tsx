import { FileText, GraduationCap, LayoutDashboard, PoundSterling, Users } from "lucide-react";
import { DemoNotice } from "./demo-notice";
import type { NavItem } from "./nav-link";
import { RoleSwitch } from "./role-switch";
import { BottomNav, Sidebar } from "./sidebar";

const NAV: NavItem[] = [
  { href: "/staff", label: "Dashboard", icon: <LayoutDashboard />, exact: true },
  { href: "/staff/students", label: "Students", icon: <Users /> },
  { href: "/staff/fees", label: "Fees", icon: <PoundSterling /> },
  { href: "/staff/assessments", label: "Assessments", icon: <FileText /> },
  { href: "/staff/results", label: "Results", icon: <GraduationCap /> },
];

/** Sidebar ≥ 1024px, icon rail 640–1024px, top bar + bottom navigation on phones (design: Md*, Sm* boards). */
export function StaffShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh w-full">
      <Sidebar section="Staff" items={NAV} footer="Signed in as Registry staff (demo)" />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b px-6 max-lg:px-5 max-sm:h-auto max-sm:flex-wrap max-sm:gap-2 max-sm:px-3 max-sm:py-2">
          <DemoNotice />
          <RoleSwitch role="staff" />
        </header>
        <main className="flex flex-1 flex-col gap-4 px-6 pt-5 pb-10 max-lg:p-5 max-sm:px-4 max-sm:pt-4 max-sm:pb-6">
          {children}
        </main>
        <BottomNav label="Staff navigation" items={NAV} />
      </div>
    </div>
  );
}
