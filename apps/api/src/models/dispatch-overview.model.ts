import type {
  AdminDispatchComplaintItem,
  AdminDispatchOverview,
  AdminDispatchQueueItem,
  ComplaintPriority,
  RideRequestStatus,
} from "@smart-dispatch/types";
import type { Prisma } from "../generated/prisma";
import { prisma } from "../db/prisma";
import { pickLocationName } from "../mappers/location.mapper";
import {
  getRideScheduleWindow,
  rideScheduleWindowsOverlap,
} from "../services/ride-request-scheduling.service";
import { suggestAllocationsForTrips } from "../services/dispatch-allocation.service";
import { countVehicles } from "./vehicle.model";
import { getComplaintSummary } from "./complaint.model";

const QUEUE_LIMIT = 8;
const NEEDS_ASSIGNMENT_POOL = 40;
const COMPLAINT_PREVIEW_LIMIT = 8;
const OPEN_COMPLAINT_STATUSES = ["submitted", "under_review", "in_progress"] as const;
const COMPLAINT_PRIORITY_RANK: Record<ComplaintPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const queueInclude = {
  pickupLocation: { select: { translations: true } },
  dropoffLocation: { select: { translations: true } },
  requester: { select: { firstName: true, middleName: true, lastName: true } },
  assignedVehicle: { select: { plateNumber: true } },
  assignedDriver: { select: { firstName: true, middleName: true, lastName: true } },
} satisfies Prisma.RideRequestInclude;

type QueueRideRequest = Prisma.RideRequestGetPayload<{ include: typeof queueInclude }>;

function personName(user: { firstName: string; middleName: string | null; lastName: string } | null) {
  if (!user) {
    return "";
  }

  return [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ");
}

function addisDayBounds(now = new Date()) {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(now);
  return {
    start: new Date(`${date}T00:00:00+03:00`),
    end: new Date(`${date}T24:00:00+03:00`),
  };
}

function toQueueItem(
  rideRequest: QueueRideRequest,
  locale?: string,
  allocation?: {
    sla_priority: AdminDispatchQueueItem["sla_priority"];
    sla_minutes: AdminDispatchQueueItem["sla_minutes"];
    suggested_vehicle: AdminDispatchQueueItem["suggested_vehicle"];
    can_auto_assign: boolean;
  },
): AdminDispatchQueueItem {
  const pickupName = rideRequest.pickupLocation
    ? pickLocationName(rideRequest.pickupLocation.translations, locale)
    : "";
  const dropoffName = rideRequest.dropoffLocation
    ? pickLocationName(rideRequest.dropoffLocation.translations, locale)
    : "";

  return {
    id: rideRequest.id,
    status: rideRequest.status as RideRequestStatus,
    scheduled_at: rideRequest.scheduledAt?.toISOString() ?? null,
    started_at: rideRequest.startedAt?.toISOString() ?? null,
    pickup: pickupName || rideRequest.pickupAddress,
    dropoff: dropoffName || rideRequest.dropoffAddress,
    requester_name: personName(rideRequest.requester) || "—",
    assigned_vehicle_plate: rideRequest.assignedVehicle?.plateNumber ?? null,
    assigned_driver_name: personName(rideRequest.assignedDriver) || null,
    passenger_count: rideRequest.passengerCount,
    ...(allocation
      ? {
          sla_priority: allocation.sla_priority,
          sla_minutes: allocation.sla_minutes,
          suggested_vehicle: allocation.suggested_vehicle,
          can_auto_assign: allocation.can_auto_assign,
        }
      : {}),
  };
}

async function listQueue(
  where: Prisma.RideRequestWhereInput,
  orderBy: Prisma.RideRequestOrderByWithRelationInput[],
  locale?: string,
  take = QUEUE_LIMIT,
) {
  const rows = await prisma.rideRequest.findMany({
    where,
    include: queueInclude,
    orderBy,
    take,
  });

  return rows.map((row) => toQueueItem(row, locale));
}

async function listNeedsAssignmentQueue(locale?: string) {
  const rows = await prisma.rideRequest.findMany({
    where: {
      status: { in: ["pending", "confirmed"] },
      assignedVehicleId: null,
    },
    include: queueInclude,
    orderBy: [{ scheduledAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    take: NEEDS_ASSIGNMENT_POOL,
  });

  const suggestions = await suggestAllocationsForTrips(rows);

  return [...rows]
    .sort((left, right) => {
      const slaLeft = suggestions.get(left.id)?.sla.rank ?? Number.MAX_SAFE_INTEGER;
      const slaRight = suggestions.get(right.id)?.sla.rank ?? Number.MAX_SAFE_INTEGER;
      if (slaLeft !== slaRight) {
        return slaLeft - slaRight;
      }

      return left.createdAt.getTime() - right.createdAt.getTime();
    })
    .slice(0, QUEUE_LIMIT)
    .map((row) => {
      const suggestion = suggestions.get(row.id);
      return toQueueItem(row, locale, suggestion
        ? {
            sla_priority: suggestion.sla.priority,
            sla_minutes: suggestion.sla.minutesUntilPickup,
            suggested_vehicle: suggestion.vehicle,
            can_auto_assign: suggestion.canAutoAssign,
          }
        : undefined);
    });
}

async function getBusyVehicleIds(now: Date) {
  const assignments = await prisma.rideRequest.findMany({
    where: {
      assignedVehicleId: { not: null },
      status: { in: ["confirmed", "in_progress"] },
    },
    select: {
      assignedVehicleId: true,
      scheduledAt: true,
      scheduledReturnAt: true,
      status: true,
    },
  });

  const nowWindow = { start: now, end: now };
  const busyIds = new Set<string>();

  for (const assignment of assignments) {
    if (!assignment.assignedVehicleId) {
      continue;
    }

    if (assignment.status === "in_progress") {
      busyIds.add(assignment.assignedVehicleId);
      continue;
    }

    const window = getRideScheduleWindow({
      scheduledAt: assignment.scheduledAt,
      scheduledReturnAt: assignment.scheduledReturnAt,
      status: assignment.status,
      now,
    });

    if (rideScheduleWindowsOverlap(window, nowWindow)) {
      busyIds.add(assignment.assignedVehicleId);
    }
  }

  return busyIds;
}

export async function getAdminDispatchOverview(options: {
  locale?: string;
  includeRideRequests: boolean;
  includeFleet: boolean;
  includeComplaints: boolean;
}): Promise<AdminDispatchOverview> {
  const now = new Date();
  const today = addisDayBounds(now);

  const empty: AdminDispatchOverview = {
    counts: {
      pending_approval: 0,
      needs_assignment: 0,
      in_progress: 0,
      upcoming_today: 0,
      open_complaints: 0,
      urgent_complaints: 0,
    },
    fleet: null,
    queues: {
      needs_assignment: [],
      in_progress: [],
      upcoming_today: [],
    },
    complaints: [],
  };

  const needsAssignmentWhere: Prisma.RideRequestWhereInput = {
    status: { in: ["pending", "confirmed"] },
    assignedVehicleId: null,
  };
  const upcomingTodayWhere: Prisma.RideRequestWhereInput = {
    status: { in: ["pending", "confirmed"] },
    scheduledAt: { gte: today.start, lt: today.end },
  };

  const [rideCounts, queues, fleet, complaints] = await Promise.all([
    options.includeRideRequests
      ? Promise.all([
          prisma.rideRequest.count({ where: { status: "pending" } }),
          prisma.rideRequest.count({ where: needsAssignmentWhere }),
          prisma.rideRequest.count({ where: { status: "in_progress" } }),
          prisma.rideRequest.count({ where: upcomingTodayWhere }),
        ])
      : Promise.resolve([0, 0, 0, 0] as const),
    options.includeRideRequests
      ? Promise.all([
          listNeedsAssignmentQueue(options.locale),
          listQueue({ status: "in_progress" }, [{ startedAt: "desc" }, { createdAt: "desc" }], options.locale),
          listQueue(upcomingTodayWhere, [{ scheduledAt: "asc" }], options.locale),
        ])
      : Promise.resolve([[], [], []] as AdminDispatchQueueItem[][]),
    options.includeFleet
      ? Promise.all([
          countVehicles({ status: "active", assignedOnly: true }),
          getBusyVehicleIds(now),
        ]).then(async ([dispatchable, busyIds]) => {
          const busyVehicles = await prisma.vehicle.count({
            where: {
              status: "active",
              assignedDriverUserId: { not: null },
              id: { in: [...busyIds] },
            },
          });

          return {
            dispatchable,
            busy: busyVehicles,
            available: Math.max(0, dispatchable - busyVehicles),
          };
        })
      : Promise.resolve(null),
    options.includeComplaints
      ? Promise.all([
          getComplaintSummary(),
          prisma.complaint.findMany({
            where: { status: { in: [...OPEN_COMPLAINT_STATUSES] } },
            include: { requester: true },
            orderBy: { createdAt: "desc" },
            take: 24,
          }),
        ]).then(([summary, rows]) => {
          const preview: AdminDispatchComplaintItem[] = rows
            .map((row) => ({
              id: row.id,
              reference_number: row.referenceNumber,
              subject: row.subject,
              priority: row.priority as ComplaintPriority,
              status: row.status,
              requester_name: personName(row.requester) || "—",
              created_at: row.createdAt.toISOString(),
            }))
            .sort((a, b) => {
              const rank = COMPLAINT_PRIORITY_RANK[a.priority] - COMPLAINT_PRIORITY_RANK[b.priority];
              if (rank !== 0) {
                return rank;
              }
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            })
            .slice(0, COMPLAINT_PREVIEW_LIMIT);

          return {
            open: summary.open,
            urgent: summary.urgent,
            items: preview,
          };
        })
      : Promise.resolve(null),
  ]);

  return {
    counts: {
      pending_approval: rideCounts[0],
      needs_assignment: rideCounts[1],
      in_progress: rideCounts[2],
      upcoming_today: rideCounts[3],
      open_complaints: complaints?.open ?? 0,
      urgent_complaints: complaints?.urgent ?? 0,
    },
    fleet,
    queues: {
      needs_assignment: queues[0],
      in_progress: queues[1],
      upcoming_today: queues[2],
    },
    complaints: complaints?.items ?? [],
  };
}
