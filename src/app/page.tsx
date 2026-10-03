import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();
  redirect(session.role === "student" ? "/student/assessments" : "/staff");
}
