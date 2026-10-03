import { FileText, GraduationCap, LayoutDashboard, PoundSterling, Users } from "lucide-react";
import { DemoNotice } from "./demo-notice";
import { SidebarLink, type NavItem } from "./nav-link";
import { RoleSwitch } from "./role-switch";

const NAV: NavItem[] = [
  { href: "/staff", label: "Dashboard", icon: <LayoutDashboard />, exact: true },
  { href: "/staff/students", label: "Students", icon: <Users /> },
  { href: "/staff/fees", label: "Fees", icon: <PoundSterling /> },
  { href: "/staff/assessments", label: "Assessments", icon: <FileText /> },
  { href: "/staff/results", label: "Results", icon: <GraduationCap /> },
];

export function StaffShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh w-full">
      <aside className="sticky top-0 flex h-svh w-56 shrink-0 flex-col border-r bg-sidebar p-2 pb-3">
        <div className="mb-2 flex h-10 items-center px-2 text-[15px] font-semibold tracking-tight">Registry</div>
        <div className="px-2 pb-1 text-xs font-medium text-muted-foreground">Staff</div>
        <nav aria-label="Staff navigation" className="flex flex-col gap-0.5">
          {NAV.map((item) => (
            <SidebarLink key={item.href} item={item} />
          ))}
        </nav>
        <div className="mt-auto border-t p-2 text-xs text-muted-foreground">Signed in as Registry staff (demo)</div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b px-6">
          <DemoNotice />
          <RoleSwitch role="staff" />
        </header>
        <main className="flex flex-col gap-4 px-6 pt-5 pb-10">{children}</main>
      </div>
    </div>
  );
}
