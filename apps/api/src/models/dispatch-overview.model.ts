import type {
  AdminDispatchBoard,
  AdminDispatchComplaintItem,
  AdminDispatchOverview,
  AdminDispatchQueueItem,
  ComplaintPriority,
  DispatchDisruptionReason,
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
import { listUnresolvedDisruptions } from "../services/trip-disruption.service";
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
    disruption_reason?: DispatchDisruptionReason | null;
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
          ...(allocation.disruption_reason ? { disruption_reason: allocation.disruption_reason } : {}),
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

async function listDisruptedQueue(locale?: string) {
  const disruptions = await listUnresolvedDisruptions();
  if (disruptions.length === 0) {
    return [] as AdminDispatchQueueItem[];
  }

  const rows = await prisma.rideRequest.findMany({
    where: { id: { in: disruptions.map((item) => item.id) } },
    include: queueInclude,
  });
  const byId = new Map(rows.map((row) => [row.id, row]));

  return disruptions.flatMap((disruption) => {
    const row = byId.get(disruption.id);
    if (!row) {
      return [];
    }

    return [
      toQueueItem(row, locale, {
        sla_priority: "unscheduled",
        sla_minutes: null,
        suggested_vehicle: disruption.suggestedVehicle,
        can_auto_assign: Boolean(disruption.suggestedVehicle),
        disruption_reason: disruption.reason,
      }),
    ];
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
          listDisruptedQueue(options.locale),
        ])
      : Promise.resolve([[], [], [], []] as AdminDispatchQueueItem[][]),
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
      disrupted: queues[3].length,
      open_complaints: complaints?.open ?? 0,
      urgent_complaints: complaints?.urgent ?? 0,
    },
    fleet,
    queues: {
      needs_assignment: queues[0],
      in_progress: queues[1],
      upcoming_today: queues[2],
      disrupted: queues[3],
    },
    complaints: complaints?.items ?? [],
  };
}

function toCoord(value: unknown): number | null {
  if (value == null) {
    return null;
  }

  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export async function getAdminDispatchBoard(locale?: string): Promise<AdminDispatchBoard> {
  const now = new Date();
  const [tripRows, vehicles, busyIds, locations] = await Promise.all([
    prisma.rideRequest.findMany({
      where: {
        status: { in: ["pending", "confirmed"] },
        assignedVehicleId: null,
      },
      include: queueInclude,
      orderBy: [{ scheduledAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      take: NEEDS_ASSIGNMENT_POOL,
    }),
    prisma.vehicle.findMany({
      where: { status: "active", assignedDriverUserId: { not: null } },
      select: {
        id: true,
        plateNumber: true,
        assignedDriver: { select: { firstName: true, middleName: true, lastName: true } },
      },
      orderBy: { plateNumber: "asc" },
    }),
    getBusyVehicleIds(now),
    prisma.vehicleLocationSnapshot.findMany({
      select: {
        vehicleId: true,
        latitude: true,
        longitude: true,
        recordedAt: true,
      },
    }),
  ]);

  const suggestions = await suggestAllocationsForTrips(tripRows);
  const locationByVehicle = new Map(
    locations.map((row) => {
      const latitude = toCoord(row.latitude);
      const longitude = toCoord(row.longitude);
      return [
        row.vehicleId,
        latitude != null && longitude != null
          ? { latitude, longitude, recorded_at: row.recordedAt.toISOString() }
          : null,
      ] as const;
    }),
  );

  const trips = [...tripRows]
    .sort((left, right) => {
      const slaLeft = suggestions.get(left.id)?.sla.rank ?? Number.MAX_SAFE_INTEGER;
      const slaRight = suggestions.get(right.id)?.sla.rank ?? Number.MAX_SAFE_INTEGER;
      if (slaLeft !== slaRight) {
        return slaLeft - slaRight;
      }
      return left.createdAt.getTime() - right.createdAt.getTime();
    })
    .slice(0, QUEUE_LIMIT * 2)
    .map((row) => {
      const item = toQueueItem(row, locale, (() => {
        const suggestion = suggestions.get(row.id);
        return suggestion
          ? {
              sla_priority: suggestion.sla.priority,
              sla_minutes: suggestion.sla.minutesUntilPickup,
              suggested_vehicle: suggestion.vehicle,
              can_auto_assign: suggestion.canAutoAssign,
            }
          : undefined;
      })());

      return {
        id: item.id,
        requester_name: item.requester_name,
        pickup: item.pickup,
        dropoff: item.dropoff,
        scheduled_at: item.scheduled_at,
        passenger_count: item.passenger_count,
        sla_priority: item.sla_priority ?? null,
        suggested_vehicle: item.suggested_vehicle ?? null,
        pickup_latitude: toCoord(row.pickupLatitude),
        pickup_longitude: toCoord(row.pickupLongitude),
      };
    });

  return {
    trips,
    vehicles: vehicles.map((vehicle) => ({
      id: vehicle.id,
      plate_number: vehicle.plateNumber,
      driver_name: personName(vehicle.assignedDriver) || null,
      busy: busyIds.has(vehicle.id),
      location: locationByVehicle.get(vehicle.id) ?? null,
    })),
  };
}
