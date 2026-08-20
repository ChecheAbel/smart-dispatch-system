import type { ContractBillingInterval, RideRequestStatus } from "@smart-dispatch/types";
import { Prisma } from "../generated/prisma";
import { prisma } from "../db/prisma";
import {
  getRideExpectedEndAt,
  getRideScheduleWindow,
  rideScheduleWindowsOverlap,
  type RideScheduleWindow,
} from "../services/ride-request-scheduling.service";
import { ensureContractEnrollment } from "./contract-enrollment.model";
import { findActiveContractById } from "./contract.model";
import { findVehicleById } from "./vehicle.model";
import { getDeadlineSettings } from "./app-setting.model";
import {
  computeTripBillingSnapshot,
  ensureTripBillingSnapshot,
} from "../services/trip-billing.service";
import { tryAutoInvoiceCompletedTrip } from "../services/invoice-automation.service";
import { canEditRideRequest } from "../services/ride-request-policy.service";
import { evaluateRideRequestCancellation, evaluateNoShowBilling } from "../services/booking-policy-enforcement.service";

export type CreateRideRequestInput = {
  requesterUserId: string;
  vehicleTypeId?: string | null;
  vehicleClassId?: string | null;
  regionId?: string | null;
  pickupLocationId?: string | null;
  dropoffLocationId?: string | null;
  pickupAddress: string;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  dropoffAddress: string;
  dropoffLatitude?: number | null;
  dropoffLongitude?: number | null;
  scheduledAt?: Date | null;
  scheduledReturnAt?: Date | null;
  passengerCount: number;
  notes?: string | null;
  contractId?: string | null;
};

export type UpdateRideRequestInput = Omit<CreateRideRequestInput, "requesterUserId">;

export type ListRideRequestsForUserFilters = {
  requesterUserId: string;
  status?: RideRequestStatus;
  search?: string;
};

export type ListRideRequestsAdminFilters = {
  status?: RideRequestStatus;
  search?: string;
  upcoming?: boolean;
  vehicleId?: string;
  fromDate?: Date;
  toDate?: Date;
};

export type ListRideRequestsForDriverFilters = {
  driverUserId: string;
  status?: RideRequestStatus;
  /**
   * When true, returns only upcoming trips for the driver
   * (confirmed or in_progress, scheduled in the future when scheduled_at is set).
   */
  upcoming?: boolean;
  /**
   * When true, returns only completed or cancelled trips for the driver.
   */
  history?: boolean;
};

const rideRequestInclude = {
  vehicleType: true,
  vehicleClass: true,
  region: true,
  pickupLocation: true,
  dropoffLocation: true,
  requester: {
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      email: true,
      mobileNumber: true,
      requesterProfile: {
        select: {
          segment: true,
          organizationName: true,
          governmentEntityType: true,
        },
      },
    },
  },
  assignedVehicle: {
    include: {
      vehicleType: true,
      vehicleClass: true,
      assignedDriver: true,
    },
  },
  assignedDriver: {
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      email: true,
      mobileNumber: true,
    },
  },
  contract: {
    select: {
      id: true,
      referenceNumber: true,
      title: true,
      status: true,
      billingInterval: true,
      farePlanId: true,
      bookingPolicy: {
        select: {
          id: true,
          isActive: true,
          minAdvanceBookingHours: true,
          maxAdvanceBookingHours: true,
          freeCancellationHours: true,
          lateCancellationType: true,
          lateCancellationFee: true,
          noShowType: true,
          noShowFee: true,
          currency: true,
        },
      },
    },
  },
  driverRating: true,
} as const;

const rideRequestAdminInclude = {
  ...rideRequestInclude,
  assignedVehicle: {
    include: {
      vehicleType: true,
      vehicleClass: true,
      assignedDriver: true,
    },
  },
  assignedDriver: {
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      email: true,
      mobileNumber: true,
    },
  },
} as const;

function toDecimal(value?: number | null) {
  if (value === null || value === undefined) {
    return null;
  }

  return new Prisma.Decimal(value);
}

function buildRideRequestWhere(filters: ListRideRequestsForUserFilters): Prisma.RideRequestWhereInput {
  const where: Prisma.RideRequestWhereInput = {
    requesterUserId: filters.requesterUserId,
  };

  if (filters.status) {
    where.status = filters.status;
  }

  const search = filters.search?.trim();
  if (search) {
    where.OR = [
      { pickupAddress: { contains: search, mode: "insensitive" } },
      { dropoffAddress: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }

  return where;
}

function buildRideRequestAdminWhere(
  filters: ListRideRequestsAdminFilters,
): Prisma.RideRequestWhereInput {
  const where: Prisma.RideRequestWhereInput = {};

  if (filters.upcoming) {
    where.status = { in: ["pending", "confirmed"] };
    where.scheduledAt = { gt: new Date() };
  } else if (filters.status) {
    where.status = filters.status;
  }

  const search = filters.search?.trim();
  if (search) {
    where.OR = [
      { pickupAddress: { contains: search, mode: "insensitive" } },
      { dropoffAddress: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
      { requester: { firstName: { contains: search, mode: "insensitive" } } },
      { requester: { middleName: { contains: search, mode: "insensitive" } } },
      { requester: { lastName: { contains: search, mode: "insensitive" } } },
      { requester: { email: { contains: search, mode: "insensitive" } } },
      { requester: { mobileNumber: { contains: search, mode: "insensitive" } } },
    ];
  }

  if (filters.vehicleId) {
    where.assignedVehicleId = filters.vehicleId;
  }

  if (filters.fromDate || filters.toDate) {
    where.createdAt = {
      ...(filters.fromDate ? { gte: filters.fromDate } : {}),
      ...(filters.toDate ? { lt: filters.toDate } : {}),
    };
  }

  return where;
}

function buildRideRequestDriverWhere(
  filters: ListRideRequestsForDriverFilters,
): Prisma.RideRequestWhereInput {
  const where: Prisma.RideRequestWhereInput = {
    assignedDriverUserId: filters.driverUserId,
  };

  if (filters.upcoming) {
    where.status = { in: ["confirmed", "in_progress"] };
  } else if (filters.history) {
    if (filters.status) {
      where.status = filters.status;
    } else {
      where.status = { in: ["completed", "cancelled", "no_show"] };
    }
  } else if (filters.status) {
    where.status = filters.status;
  }

  return where;
}

function buildRideRequestData(input: UpdateRideRequestInput) {
  return {
    vehicleTypeId: input.vehicleTypeId ?? null,
    vehicleClassId: input.vehicleClassId ?? null,
    regionId: input.regionId ?? null,
    pickupLocationId: input.pickupLocationId ?? null,
    dropoffLocationId: input.dropoffLocationId ?? null,
    pickupAddress: input.pickupAddress,
    pickupLatitude: toDecimal(input.pickupLatitude),
    pickupLongitude: toDecimal(input.pickupLongitude),
    dropoffAddress: input.dropoffAddress,
    dropoffLatitude: toDecimal(input.dropoffLatitude),
    dropoffLongitude: toDecimal(input.dropoffLongitude),
    scheduledAt: input.scheduledAt ?? null,
    scheduledReturnAt: input.scheduledReturnAt ?? null,
    passengerCount: input.passengerCount,
    notes: input.notes?.trim() || null,
  };
}

export async function createRideRequest(input: CreateRideRequestInput) {
  return prisma.rideRequest.create({
    data: {
      requesterUserId: input.requesterUserId,
      contractId: input.contractId ?? null,
      ...buildRideRequestData(input),
    },
    include: rideRequestInclude,
  });
}

export type CreateBulkRideRequestsInput = {
  contractTitle?: string;
  billingInterval?: ContractBillingInterval;
  requests: CreateRideRequestInput[];
};

export async function createBulkRideRequests(input: CreateBulkRideRequestsInput) {
  return prisma.$transaction(async (tx) => {
    let contractId = null;

    if (input.contractTitle) {
      const { generateContractReferenceNumber } = await import("./contract.model");
      const referenceNumber = await generateContractReferenceNumber();
      
      const contract = await tx.contract.create({
        data: {
          title: input.contractTitle,
          referenceNumber,
          status: "draft",
          billingInterval: input.billingInterval ?? "per_trip",
          createdById: input.requests[0]?.requesterUserId,
        },
      });
      contractId = contract.id;
    }

    const createdRequests = [];
    for (const req of input.requests) {
      const created = await tx.rideRequest.create({
        data: {
          requesterUserId: req.requesterUserId,
          contractId: contractId ?? req.contractId ?? null,
          ...buildRideRequestData(req),
        },
        include: rideRequestInclude,
      });
      createdRequests.push(created);
    }

    return createdRequests;
  });
}

export async function countRideRequestsForUser(filters: ListRideRequestsForUserFilters) {
  return prisma.rideRequest.count({
    where: buildRideRequestWhere(filters),
  });
}

export async function listRideRequestsForUser(
  filters: ListRideRequestsForUserFilters,
  skip: number,
  take: number,
) {
  return prisma.rideRequest.findMany({
    where: buildRideRequestWhere(filters),
    include: rideRequestInclude,
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });
}

export async function findRideRequestForUser(id: string, requesterUserId: string) {
  return prisma.rideRequest.findFirst({
    where: { id, requesterUserId },
    include: rideRequestInclude,
  });
}

export async function findRideRequestForDriver(id: string, driverUserId: string) {
  return prisma.rideRequest.findFirst({
    where: { id, assignedDriverUserId: driverUserId },
    include: rideRequestInclude,
  });
}

export async function countRideRequestsForDriver(filters: ListRideRequestsForDriverFilters) {
  return prisma.rideRequest.count({
    where: buildRideRequestDriverWhere(filters),
  });
}

export async function listRideRequestsForDriver(
  filters: ListRideRequestsForDriverFilters,
  skip: number,
  take: number,
) {
  const upcoming = filters.upcoming === true;

  return prisma.rideRequest.findMany({
    where: buildRideRequestDriverWhere(filters),
    include: rideRequestInclude,
    orderBy: upcoming ? { scheduledAt: "asc" } : { createdAt: "desc" },
    skip,
    take,
  });
}

export async function countRideRequestsAdmin(filters: ListRideRequestsAdminFilters) {
  return prisma.rideRequest.count({
    where: buildRideRequestAdminWhere(filters),
  });
}

export async function listRideRequestsAdmin(
  filters: ListRideRequestsAdminFilters,
  skip: number,
  take: number,
) {
  return prisma.rideRequest.findMany({
    where: buildRideRequestAdminWhere(filters),
    include: rideRequestAdminInclude,
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });
}

export async function findRideRequestById(id: string) {
  return prisma.rideRequest.findUnique({
    where: { id },
    include: rideRequestAdminInclude,
  });
}

export async function findSchedulingConflictForVehicle(
  vehicleId: string,
  input: {
    window: RideScheduleWindow;
    exceptRideRequestId?: string;
  },
) {
  const assignments = await prisma.rideRequest.findMany({
    where: {
      assignedVehicleId: vehicleId,
      status: { in: ["confirmed", "in_progress"] },
      ...(input.exceptRideRequestId ? { NOT: { id: input.exceptRideRequestId } } : {}),
    },
    select: {
      id: true,
      scheduledAt: true,
      scheduledReturnAt: true,
      status: true,
    },
  });

  for (const assignment of assignments) {
    const otherWindow = getRideScheduleWindow({
      scheduledAt: assignment.scheduledAt,
      scheduledReturnAt: assignment.scheduledReturnAt,
      status: assignment.status,
    });

    if (rideScheduleWindowsOverlap(input.window, otherWindow)) {
      return assignment;
    }
  }

  return null;
}

/** @deprecated Use findSchedulingConflictForVehicle for schedule-aware checks. */
export async function findActiveRideRequestForVehicle(vehicleId: string, exceptRideRequestId?: string) {
  return findSchedulingConflictForVehicle(vehicleId, {
    window: getRideScheduleWindow({
      scheduledAt: null,
      scheduledReturnAt: null,
      status: "in_progress",
    }),
    exceptRideRequestId,
  });
}

/** Vehicle IDs currently on a confirmed or in-progress ride, with expected free-at time. */
export async function listVehicleOperationalBusyState() {
  const rows = await prisma.rideRequest.findMany({
    where: {
      assignedVehicleId: { not: null },
      status: { in: ["confirmed", "in_progress"] },
    },
    select: {
      assignedVehicleId: true,
      scheduledAt: true,
      scheduledReturnAt: true,
    },
    orderBy: [{ scheduledReturnAt: "desc" }, { scheduledAt: "desc" }],
  });

  const byVehicle = new Map<string, Date | null>();

  for (const row of rows) {
    if (!row.assignedVehicleId) continue;

    const availableFrom = row.scheduledReturnAt ?? row.scheduledAt ?? null;
    const existing = byVehicle.get(row.assignedVehicleId);

    if (!byVehicle.has(row.assignedVehicleId)) {
      byVehicle.set(row.assignedVehicleId, availableFrom);
      continue;
    }

    // Keep the latest free-at when a vehicle somehow has multiple active assignments.
    if (availableFrom && (!existing || availableFrom.getTime() > existing.getTime())) {
      byVehicle.set(row.assignedVehicleId, availableFrom);
    }
  }

  return byVehicle;
}

export async function listAssignableVehiclesForRideRequest(
  rideRequest: {
    id: string;
    vehicleTypeId: string | null;
    vehicleClassId: string | null;
    assignedVehicleId: string | null;
    scheduledAt: Date | null;
    scheduledReturnAt: Date | null;
    status: string;
  },
  options?: { search?: string; take?: number },
) {
  const search = options?.search?.trim();
  const candidateWindow = getRideScheduleWindow({
    scheduledAt: rideRequest.scheduledAt,
    scheduledReturnAt: rideRequest.scheduledReturnAt,
    status: rideRequest.status,
  });

  const activeAssignments = await prisma.rideRequest.findMany({
    where: {
      assignedVehicleId: { not: null },
      status: { in: ["confirmed", "in_progress"] },
      NOT: { id: rideRequest.id },
    },
    select: {
      assignedVehicleId: true,
      scheduledAt: true,
      scheduledReturnAt: true,
      status: true,
    },
  });

  const blockedVehicleIds = new Set<string>();

  for (const assignment of activeAssignments) {
    if (!assignment.assignedVehicleId) {
      continue;
    }

    const otherWindow = getRideScheduleWindow({
      scheduledAt: assignment.scheduledAt,
      scheduledReturnAt: assignment.scheduledReturnAt,
      status: assignment.status,
    });

    if (rideScheduleWindowsOverlap(candidateWindow, otherWindow)) {
      blockedVehicleIds.add(assignment.assignedVehicleId);
    }
  }

  const vehicles = await prisma.vehicle.findMany({
    where: {
      status: "active",
      assignedDriverUserId: { not: null },
      ...(rideRequest.vehicleTypeId ? { vehicleTypeId: rideRequest.vehicleTypeId } : {}),
      ...(rideRequest.vehicleClassId ? { vehicleClassId: rideRequest.vehicleClassId } : {}),
      ...(blockedVehicleIds.size > 0
        ? { id: { notIn: [...blockedVehicleIds] } }
        : {}),
      ...(search
        ? {
            OR: [
              { plateNumber: { contains: search, mode: "insensitive" } },
              { make: { contains: search, mode: "insensitive" } },
              { model: { contains: search, mode: "insensitive" } },
              {
                assignedDriver: {
                  OR: [
                    { firstName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                  ],
                },
              },
            ],
          }
        : {}),
    },
    include: {
      vehicleType: true,
      vehicleClass: true,
      assignedDriver: true,
    },
    orderBy: { plateNumber: "asc" },
    take: options?.take ?? 50,
  });

  const availableVehicles = vehicles;

  if (
    rideRequest.assignedVehicleId &&
    !availableVehicles.some((vehicle) => vehicle.id === rideRequest.assignedVehicleId)
  ) {
    const assignedVehicle = await findVehicleById(rideRequest.assignedVehicleId);
    if (assignedVehicle) {
      return [assignedVehicle, ...availableVehicles];
    }
  }

  return availableVehicles;
}

export async function updateRideRequestStatusAdmin(
  id: string,
  status: RideRequestStatus,
  options?: { rejectionReason?: string | null; notesAppend?: string | null },
) {
  const existing = await findRideRequestById(id);
  if (!existing) {
    return null;
  }

  if (status === "no_show") {
    return markRideRequestNoShow(existing);
  }

  const data: Prisma.RideRequestUpdateInput = { status };

  if (status === "cancelled") {
    data.rejectionReason = options?.rejectionReason?.trim() || null;
    data.assignedVehicle = { disconnect: true };
    data.assignedDriver = { disconnect: true };
    data.assignedAt = null;
    data.startedAt = null;
    data.completedAt = null;
  } else if (status === "confirmed") {
    data.rejectionReason = null;
  } else if (status === "in_progress") {
    data.startedAt = new Date();
  } else if (status === "completed") {
    data.completedAt = new Date();
    const completionNote = options?.notesAppend?.trim();
    if (completionNote) {
      data.notes = existing.notes ? `${existing.notes}\n${completionNote}` : completionNote;
    }
  }

  const shouldEnsureEnrollment =
    Boolean(existing.contractId) &&
    (status === "confirmed" ||
      status === "in_progress" ||
      status === "completed");

  return prisma.$transaction(async (tx) => {
    if (shouldEnsureEnrollment && existing.contractId) {
      const contract = await findActiveContractById(existing.contractId);
      if (!contract) {
        throw new Error("Linked contract is not available.");
      }

      await ensureContractEnrollment({
        contractId: existing.contractId,
        requesterUserId: existing.requesterUserId,
        scheduledAt: existing.scheduledAt,
        scheduledEndsAt: existing.scheduledReturnAt,
        acceptedAt: new Date(),
        billingInterval: contract.billingInterval as ContractBillingInterval,
        client: tx,
      });
    }

    const updated = await tx.rideRequest.update({
      where: { id },
      data,
      include: rideRequestAdminInclude,
    });

    if (status === "completed" && updated.contractId) {
      await ensureTripBillingSnapshot(updated.id, tx);
    }

    return updated;
  }).then(async (updated) => {
    if (status === "completed" && updated.contractId) {
      await tryAutoInvoiceCompletedTrip(updated.id);
    }

    return updated;
  });
}

async function markRideRequestNoShow(
  existing: NonNullable<Awaited<ReturnType<typeof findRideRequestById>>>,
) {
  const billing = evaluateNoShowBilling(existing.contract?.bookingPolicy);
  const updateData: Prisma.RideRequestUncheckedUpdateInput = {
    status: "no_show",
    completedAt: new Date(),
    assignedVehicleId: null,
    assignedDriverUserId: null,
    assignedAt: null,
    rejectionReason: "Passenger no-show",
  };

  if (billing.type === "charge_fee" && billing.fee != null) {
    updateData.billableAmount = new Prisma.Decimal(billing.fee);
    updateData.billableCurrency = billing.currency ?? "ETB";
    const feeNote = `No-show fee applied: ${billing.fee} ${billing.currency ?? "ETB"}.`;
    updateData.notes = existing.notes ? `${existing.notes}\n${feeNote}` : feeNote;
  }

  if (billing.type === "bill_as_trip" && existing.contractId) {
    try {
      const snapshot = await computeTripBillingSnapshot(
        existing,
        existing.contract?.farePlanId ?? null,
      );
      if (snapshot) {
        updateData.farePlanId = snapshot.farePlanId;
        updateData.distanceKm = snapshot.distanceKm;
        updateData.durationMinutes = snapshot.durationMinutes;
        updateData.billableAmount = new Prisma.Decimal(snapshot.billableAmount);
        updateData.billableCurrency = snapshot.billableCurrency;
        const tripNote = `No-show billed as trip: ${snapshot.billableAmount} ${snapshot.billableCurrency}.`;
        updateData.notes = existing.notes ? `${existing.notes}\n${tripNote}` : tripNote;
      }
    } catch {
      // Fare plan may be missing; still allow no-show without billing snapshot.
    }
  }

  const shouldEnsureEnrollment = Boolean(existing.contractId);

  const updated = await prisma.$transaction(async (tx) => {
    if (shouldEnsureEnrollment && existing.contractId) {
      const contract = await findActiveContractById(existing.contractId);
      if (!contract) {
        throw new Error("Linked contract is not available.");
      }

      await ensureContractEnrollment({
        contractId: existing.contractId,
        requesterUserId: existing.requesterUserId,
        scheduledAt: existing.scheduledAt,
        scheduledEndsAt: existing.scheduledReturnAt,
        acceptedAt: new Date(),
        billingInterval: contract.billingInterval as ContractBillingInterval,
        client: tx,
      });
    }

    return tx.rideRequest.update({
      where: { id: existing.id },
      data: updateData,
      include: rideRequestAdminInclude,
    });
  });

  if (
    updated.contractId &&
    updated.billableAmount != null &&
    Number(updated.billableAmount) > 0
  ) {
    await tryAutoInvoiceCompletedTrip(updated.id);
  }

  return updated;
}

export async function assignRideRequestAdmin(id: string, vehicleId: string) {
  const vehicle = await findVehicleById(vehicleId);
  if (!vehicle?.assignedDriverUserId) {
    return null;
  }

  const existing = await findRideRequestById(id);
  if (!existing) {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    if (existing.contractId) {
      const contract = await findActiveContractById(existing.contractId);
      if (!contract) {
        throw new Error("Linked contract is not available.");
      }

      await ensureContractEnrollment({
        contractId: existing.contractId,
        requesterUserId: existing.requesterUserId,
        scheduledAt: existing.scheduledAt,
        scheduledEndsAt: existing.scheduledReturnAt,
        acceptedAt: new Date(),
        billingInterval: contract.billingInterval as ContractBillingInterval,
        client: tx,
      });
    }

    return tx.rideRequest.update({
      where: { id },
      data: {
        assignedVehicleId: vehicleId,
        assignedDriverUserId: vehicle.assignedDriverUserId,
        assignedAt: new Date(),
        status: "confirmed",
      },
      include: rideRequestAdminInclude,
    });
  });
}

export async function unassignRideRequestAdmin(id: string) {
  return prisma.rideRequest.update({
    where: { id },
    data: {
      assignedVehicleId: null,
      assignedDriverUserId: null,
      assignedAt: null,
      status: "pending",
    },
    include: rideRequestAdminInclude,
  });
}

export async function updateRideRequestForUser(
  id: string,
  requesterUserId: string,
  input: UpdateRideRequestInput,
) {
  const existing = await findRideRequestForUser(id, requesterUserId);
  if (!existing) {
    return null;
  }

  if (!canEditRideRequest(existing.status, existing.createdAt)) {
    return { error: "This ride request can no longer be edited." as const };
  }

  return prisma.rideRequest.update({
    where: { id },
    data: buildRideRequestData(input),
    include: rideRequestInclude,
  });
}

export async function cancelRideRequestForUser(id: string, requesterUserId: string) {
  const existing = await findRideRequestForUser(id, requesterUserId);
  if (!existing) {
    return null;
  }

  const evaluation = evaluateRideRequestCancellation({
    status: existing.status,
    createdAt: existing.createdAt,
    scheduledAt: existing.scheduledAt,
    policy: existing.contract?.bookingPolicy,
  });

  if (!evaluation.allowed) {
    return {
      error: evaluation.reason ?? "This ride request can no longer be cancelled.",
    };
  }

  const updateData: Prisma.RideRequestUncheckedUpdateInput = {
    status: "cancelled",
    completedAt: evaluation.isLateCancellation ? new Date() : undefined,
  };

  if (evaluation.isLateCancellation) {
    if (
      evaluation.lateCancellationType === "charge_fee" &&
      evaluation.lateCancellationFee != null
    ) {
      updateData.billableAmount = new Prisma.Decimal(evaluation.lateCancellationFee);
      updateData.billableCurrency = evaluation.lateCancellationCurrency ?? "ETB";
      const feeNote = `Late cancellation fee applied: ${evaluation.lateCancellationFee} ${evaluation.lateCancellationCurrency ?? "ETB"}.`;
      updateData.notes = existing.notes ? `${existing.notes}\n${feeNote}` : feeNote;
    }

    if (evaluation.lateCancellationType === "bill_as_trip" && existing.contractId) {
      try {
        const snapshot = await computeTripBillingSnapshot(
          existing,
          existing.contract?.farePlanId ?? null,
        );
        if (snapshot) {
          updateData.farePlanId = snapshot.farePlanId;
          updateData.distanceKm = snapshot.distanceKm;
          updateData.durationMinutes = snapshot.durationMinutes;
          updateData.billableAmount = new Prisma.Decimal(snapshot.billableAmount);
          updateData.billableCurrency = snapshot.billableCurrency;
          const tripNote = `Late cancellation billed as trip: ${snapshot.billableAmount} ${snapshot.billableCurrency}.`;
          updateData.notes = existing.notes ? `${existing.notes}\n${tripNote}` : tripNote;
        }
      } catch {
        // Fare plan may be missing; still allow cancel without billing snapshot.
      }
    }
  }

  return prisma.rideRequest.update({
    where: { id },
    data: updateData,
    include: rideRequestInclude,
  });
}

export async function rateDriverForRideRequest(
  id: string,
  requesterUserId: string,
  input: { rating: number; comment?: string | null },
) {
  const existing = await findRideRequestForUser(id, requesterUserId);
  if (!existing) {
    return null;
  }

  if (existing.status !== "completed") {
    return { error: "You can only rate the driver after the trip is completed." as const };
  }

  if (!existing.assignedDriverUserId) {
    return { error: "This trip has no assigned driver to rate." as const };
  }

  if (existing.driverRating) {
    return { error: "You have already rated the driver for this trip." as const };
  }

  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { error: "Rating must be an integer from 1 to 5." as const };
  }

  const comment = input.comment?.trim() || null;
  if (comment && comment.length > 500) {
    return { error: "Comment must be 500 characters or fewer." as const };
  }

  await prisma.rideRequestDriverRating.create({
    data: {
      rideRequestId: existing.id,
      requesterUserId,
      driverUserId: existing.assignedDriverUserId,
      rating: input.rating,
      comment,
    },
  });

  return findRideRequestForUser(id, requesterUserId);
}

export async function findVehicleTypeByIdIfActive(id: string) {
  return prisma.vehicleType.findFirst({
    where: { id, isActive: true },
  });
}

export async function findVehicleClassByIdIfActive(id: string) {
  return prisma.vehicleClass.findFirst({
    where: { id, isActive: true },
  });
}

export async function findRegionByIdIfActive(id: string) {
  return prisma.region.findFirst({
    where: { id, isActive: true },
  });
}

export async function isVehicleTypeClassAllowed(vehicleTypeId: string, vehicleClassId: string) {
  const link = await prisma.vehicleTypeClass.findFirst({
    where: { vehicleTypeId, vehicleClassId },
  });

  return Boolean(link);
}

export async function findReminderDueRideRequests(
  hoursBefore: number = getDeadlineSettings().ride_request_reminder_hours,
  asOf: Date = new Date(),
) {
  const windowEnd = new Date(asOf.getTime() + hoursBefore * 60 * 60 * 1000);

  return prisma.rideRequest.findMany({
    where: {
      status: "confirmed",
      scheduledAt: {
        gte: asOf,
        lte: windowEnd,
      },
    },
    orderBy: [{ scheduledAt: "asc" }],
    select: { id: true, scheduledAt: true },
  });
}

const EXPIRED_RIDE_REQUEST_BATCH = 50;

export function buildExpiredRideRequestReason(scheduledAt: Date | null) {
  if (!scheduledAt) {
    return "Automatically cancelled because the scheduled pickup time has passed.";
  }

  const when = scheduledAt.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return `Automatically cancelled because the scheduled pickup time (${when}) has passed.`;
}

export async function findExpiredUnstartedRideRequests(asOf: Date = new Date()) {
  return prisma.rideRequest.findMany({
    where: {
      status: { in: ["pending", "confirmed"] },
      scheduledAt: { lt: asOf },
    },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    take: EXPIRED_RIDE_REQUEST_BATCH,
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      assignedDriverUserId: true,
    },
  });
}

export const AUTO_COMPLETED_TRIP_NOTE =
  "Automatically completed because the driver did not mark the trip complete after the scheduled end.";

export async function findStaleInProgressRideRequests(asOf: Date = new Date()) {
  const rows = await prisma.rideRequest.findMany({
    where: { status: "in_progress" },
    orderBy: [{ startedAt: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      scheduledReturnAt: true,
      startedAt: true,
      assignedDriverUserId: true,
    },
  });

  return rows
    .filter((ride) => {
      const endAt = getRideExpectedEndAt({
        scheduledAt: ride.scheduledAt,
        scheduledReturnAt: ride.scheduledReturnAt,
        startedAt: ride.startedAt,
      });
      return Boolean(endAt && endAt.getTime() < asOf.getTime());
    })
    .slice(0, EXPIRED_RIDE_REQUEST_BATCH);
}

export async function wasRideRequestNotificationSent(
  rideRequestId: string,
  event: string,
) {
  const log = await prisma.notificationDeliveryLog.findFirst({
    where: {
      module: "ride_requests",
      event,
      entityType: "ride_request",
      entityId: rideRequestId,
      status: "sent",
      isTest: false,
    },
    select: { id: true },
  });

  return Boolean(log);
}
