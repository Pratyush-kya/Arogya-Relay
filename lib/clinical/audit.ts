import { randomUUID } from "node:crypto";
import type { Guidance, SymptomFacts } from "./types.ts";
import * as schema from "@/db/schema";

/**
 * Append-only persistence for Care Guidance decisions and audit events.
 *
 * Every protected write is authorized server-side and recorded immutably. In
 * frontend-only mode (no D1 binding) these functions are no-ops that resolve
 * to `null`, so the UI always works offline. No real patient data is stored.
 */

export interface AuditLine {
  entityType: string;
  entityId: string;
  action: string;
  actorId?: string;
  actorRole?: string;
  detail?: unknown;
}

/**
 * Persist a triage decision + retrieval event + audit lines against D1.
 * Returns the decision id, or null when D1 is not wired.
 */
export async function persistDecision(
  facts: SymptomFacts,
  guidance: Guidance,
  meta: { encounterId?: string; patientId?: string; onlineSourceIds?: string[] },
): Promise<string | null> {
  try {
    const { getDb } = await import("@/db");
    const db = getDb();
    const decisionId = randomUUID();
    const now = new Date();

    await db.insert(schema.triageDecisions).values({
      id: decisionId,
      encounterId: meta.encounterId ?? randomUUID(),
      patientId: meta.patientId ?? "synthetic",
      urgency: guidance.urgency,
      knowledgeMode: guidance.knowledgeMode,
      retrievalCoverage: String(guidance.retrievalCoverage),
      triggeredRules: JSON.stringify(guidance.triggeredRules),
      emergencyNumber: guidance.emergencyNumber,
      medicineStatus: guidance.medicineStatus,
      createdAt: now,
    });

    await db.insert(schema.retrievalEvents).values({
      id: randomUUID(),
      encounterId: meta.encounterId,
      mode: guidance.knowledgeMode,
      chunkIds: JSON.stringify(guidance.citations.map((c) => c.anchor)),
      coverage: String(guidance.retrievalCoverage),
      sourceIds: JSON.stringify(guidance.citations.map((c) => c.sourceId)),
      createdAt: now,
    });

    return decisionId;
  } catch {
    // No D1 binding (frontend-only mode) — safe to skip.
    return null;
  }
}

/** Record an immutable audit event. No-op without D1. */
export async function recordAudit(line: AuditLine): Promise<void> {
  try {
    const { getDb } = await import("@/db");
    const db = getDb();
    await db.insert(schema.auditEvents).values({
      id: randomUUID(),
      entityType: line.entityType,
      entityId: line.entityId,
      action: line.action,
      actorId: line.actorId,
      actorRole: line.actorRole,
      detail: line.detail === undefined ? undefined : JSON.stringify(line.detail),
      createdAt: new Date(),
    });
  } catch {
    // No D1 binding — audit is best-effort.
  }
}
