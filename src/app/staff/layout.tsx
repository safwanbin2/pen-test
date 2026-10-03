import { redirect } from "next/navigation";
import { StaffShell } from "@/components/shell/staff-shell";
import { getSession } from "@/lib/session";

export default async function StaffLayout({ children }: LayoutProps<"/staff">) {
  const session = await getSession();
  if (session.role !== "staff") redirect("/student/assessments");
  return <StaffShell>{children}</StaffShell>;
}
