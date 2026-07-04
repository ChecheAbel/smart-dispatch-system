import type { AuditLog as PublicAuditLog } from "@smart-dispatch/types";
import type { AuditLog as DbAuditLog, Prisma, User } from "../generated/prisma";

type AuditLogWithActor = DbAuditLog & {
  actor: Pick<User, "id" | "email" | "firstName" | "middleName" | "lastName"> | null;
};

function formatActorName(actor: AuditLogWithActor["actor"]) {
  if (!actor) {
    return null;
  }

  return [actor.firstName, actor.middleName, actor.lastName].filter(Boolean).join(" ");
}

function parseMetadata(value: Prisma.JsonValue) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function toPublicAuditLog(log: AuditLogWithActor): PublicAuditLog {
  return {
    id: log.id,
    actor_user_id: log.actorUserId,
    actor_email: log.actor?.email ?? null,
    actor_name: formatActorName(log.actor),
    action: log.action,
    module: log.module,
    entity_type: log.entityType,
    entity_id: log.entityId,
    entity_label: log.entityLabel,
    summary: log.summary,
    metadata: parseMetadata(log.metadata),
    ip_address: log.ipAddress,
    user_agent: log.userAgent,
    request_method: log.requestMethod,
    request_path: log.requestPath,
    created_at: log.createdAt.toISOString(),
  };
}
