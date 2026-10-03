// Demo "session": a role toggle instead of login (D15). The role is still
// enforced on the server in every API route and layout.

import { cookies } from "next/headers";

export type Role = "staff" | "student";

export const ROLE_COOKIE = "sms_role";
/** Student number (not the row id) so the selection survives a re-seed. */
export const STUDENT_COOKIE = "sms_student";

/** Who the staff role acts as, for "by" in history and records (D22). */
export const DEMO_STAFF = { actorName: "Hannah Price", actorRole: "Registry Officer" } as const;

export type Session = { role: Role; studentNumber: string | null };

export async function getSession(): Promise<Session> {
  const store = await cookies();
  const role = store.get(ROLE_COOKIE)?.value === "student" ? "student" : "staff";
  return { role, studentNumber: store.get(STUDENT_COOKIE)?.value ?? null };
}
