// Every sensitive change writes an audit row in the same transaction (F-FND-10).

import type { AuditArea, Prisma } from "@/generated/prisma/client";
import { DEMO_STAFF } from "./session";

type Tx = Prisma.TransactionClient;

export type AuditEntry = {
  area: AuditArea;
  action: string;
  studentId?: string;
  subject?: string;
  fromValue?: string;
  toValue?: string;
  reasonCode?: string;
  reason?: string;
  metadata?: Prisma.InputJsonValue;
  actor?: { actorName: string; actorRole: string };
};

export function audit(tx: Tx, entry: AuditEntry) {
  const { actor = DEMO_STAFF, ...rest } = entry;
  return tx.auditLog.create({ data: { ...actor, ...rest } });
}
