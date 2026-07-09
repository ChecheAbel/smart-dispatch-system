import type { Prisma } from "../generated/prisma";
import type { VehicleHistoryEvent, VehicleMaintenanceLog } from "@smart-dispatch/types";
import {
  toPublicMaintenanceWorkTypeSummary,
} from "./maintenance-work-type.mapper";

type DbPerson = {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
};

function formatPersonName(person: DbPerson) {
  return [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ");
}

function dateToIsoDate(value: Date | null) {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function decimalToNumber(value: Prisma.Decimal | null) {
  return value === null ? null : Number(value);
}

type DbMaintenanceLog = {
  id: string;
  vehicleId: string;
  workTypeId: string;
  status: VehicleMaintenanceLog["status"];
  title: string;
  description: string | null;
  vendor: string | null;
  costAmount: Prisma.Decimal | null;
  odometerKm: number | null;
  startedAt: Date | null;
  completedAt: Date | null;
  nextDueAt: Date | null;
  nextDueKm: number | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: DbPerson | null;
  workType: {
    id: string;
    slug: string;
    isActive: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
    translations: Prisma.JsonValue;
  };
};

export function toPublicVehicleMaintenanceLog(
  log: DbMaintenanceLog,
  options?: { locale?: string },
): VehicleMaintenanceLog {
  const workType = toPublicMaintenanceWorkTypeSummary(log.workType, options);

  return {
    id: log.id,
    vehicle_id: log.vehicleId,
    work_type_id: log.workTypeId,
    work_type: workType,
    type: workType.slug,
    status: log.status,
    title: log.title,
    description: log.description,
    vendor: log.vendor,
    cost_amount: decimalToNumber(log.costAmount),
    odometer_km: log.odometerKm,
    started_at: dateToIsoDate(log.startedAt),
    completed_at: dateToIsoDate(log.completedAt),
    next_due_at: dateToIsoDate(log.nextDueAt),
    next_due_km: log.nextDueKm,
    created_by_user_id: log.createdById,
    created_by: log.createdBy
      ? {
          id: log.createdBy.id,
          name: formatPersonName(log.createdBy),
        }
      : null,
    created_at: log.createdAt.toISOString(),
    updated_at: log.updatedAt.toISOString(),
  };
}

export function toPublicVehicleHistoryEvent(event: {
  id: string;
  vehicleId: string;
  eventType: VehicleHistoryEvent["event_type"];
  summary: string;
  metadata: Prisma.JsonValue;
  actorUserId: string | null;
  createdAt: Date;
  actor: DbPerson | null;
}): VehicleHistoryEvent {
  const metadata =
    event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
      ? (event.metadata as Record<string, unknown>)
      : {};

  return {
    id: event.id,
    vehicle_id: event.vehicleId,
    event_type: event.eventType,
    summary: event.summary,
    metadata,
    actor_user_id: event.actorUserId,
    actor: event.actor
      ? {
          id: event.actor.id,
          name: formatPersonName(event.actor),
        }
      : null,
    created_at: event.createdAt.toISOString(),
  };
}
