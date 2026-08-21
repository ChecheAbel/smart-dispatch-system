import { prisma } from "../db/prisma";
import { workDateToDate } from "../utils/validation";

export class DriverProfileError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = "DriverProfileError";
  }
}

export type CreateDriverProfileInput = {
  userId: string;
  licenseNumber: string;
  licensePhotoUrl?: string | null;
  licensePhotoBackUrl?: string | null;
};

export type UpsertDriverProfileInput = CreateDriverProfileInput;

function normalizeLicenseNumber(licenseNumber: string) {
  return licenseNumber.trim().toUpperCase();
}

export async function findDriverByLicenseNumber(licenseNumber: string) {
  return prisma.driver.findUnique({
    where: { licenseNumber: normalizeLicenseNumber(licenseNumber) },
  });
}

export async function findDriverByUserId(userId: string) {
  return prisma.driver.findUnique({ where: { userId } });
}

export async function createDriverProfile(input: CreateDriverProfileInput) {
  return prisma.driver.create({
    data: {
      userId: input.userId,
      licenseNumber: normalizeLicenseNumber(input.licenseNumber),
      licensePhotoUrl: input.licensePhotoUrl?.trim() || null,
      licensePhotoBackUrl: input.licensePhotoBackUrl?.trim() || null,
    },
  });
}

export async function upsertDriverProfile(input: UpsertDriverProfileInput) {
  const licenseNumber = normalizeLicenseNumber(input.licenseNumber);
  const existingByLicense = await findDriverByLicenseNumber(licenseNumber);
  if (existingByLicense && existingByLicense.userId !== input.userId) {
    throw new DriverProfileError("This driver license number is already registered.", 409);
  }

  const existing = await findDriverByUserId(input.userId);
  if (!existing) {
    if (!input.licensePhotoUrl?.trim() || !input.licensePhotoBackUrl?.trim()) {
      throw new DriverProfileError("Front and back driver license photos are required.", 400);
    }

    return createDriverProfile({
      userId: input.userId,
      licenseNumber,
      licensePhotoUrl: input.licensePhotoUrl,
      licensePhotoBackUrl: input.licensePhotoBackUrl,
    });
  }

  return prisma.driver.update({
    where: { userId: input.userId },
    data: {
      licenseNumber,
      ...(input.licensePhotoUrl !== undefined
        ? { licensePhotoUrl: input.licensePhotoUrl?.trim() || existing.licensePhotoUrl }
        : {}),
      ...(input.licensePhotoBackUrl !== undefined
        ? { licensePhotoBackUrl: input.licensePhotoBackUrl?.trim() || existing.licensePhotoBackUrl }
        : {}),
    },
  });
}

export type DriverRatingSummaryRecord = {
  average: number | null;
  count: number;
};

function roundAverage(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return null;
  }

  return Math.round(value * 10) / 10;
}

export async function getDriverRatingSummaries(driverUserIds: string[]) {
  const uniqueIds = [...new Set(driverUserIds.filter(Boolean))];
  const summaries = new Map<string, DriverRatingSummaryRecord>();

  if (uniqueIds.length === 0) {
    return summaries;
  }

  const grouped = await prisma.rideRequestDriverRating.groupBy({
    by: ["driverUserId"],
    where: { driverUserId: { in: uniqueIds } },
    _avg: { rating: true },
    _count: { _all: true },
  });

  for (const row of grouped) {
    summaries.set(row.driverUserId, {
      average: roundAverage(row._avg.rating),
      count: row._count._all,
    });
  }

  return summaries;
}

export async function getDriverRatingSummary(driverUserId: string) {
  const summaries = await getDriverRatingSummaries([driverUserId]);
  return summaries.get(driverUserId) ?? { average: null, count: 0 };
}

export type DriverPerformanceRecord = {
  trips_assigned: number;
  trips_completed: number;
  trips_no_show: number;
  completion_rate: number | null;
  on_time_rate: number | null;
  complaints: number;
  attendance_rate: number | null;
};

function emptyPerformance(): DriverPerformanceRecord {
  return {
    trips_assigned: 0,
    trips_completed: 0,
    trips_no_show: 0,
    completion_rate: null,
    on_time_rate: null,
    complaints: 0,
    attendance_rate: null,
  };
}

function roundRate(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return null;
  }

  return Math.round((numerator / denominator) * 1000) / 1000;
}

function addisWorkDateOffset(days: number) {
  const addis = new Date(Date.now() + 3 * 60 * 60 * 1000);
  addis.setUTCDate(addis.getUTCDate() + days);
  return addis.toISOString().slice(0, 10);
}

export async function getDriverPerformanceSummaries(driverUserIds: string[]) {
  const uniqueIds = [...new Set(driverUserIds.filter(Boolean))];
  const summaries = new Map<string, DriverPerformanceRecord>();

  for (const id of uniqueIds) {
    summaries.set(id, emptyPerformance());
  }

  if (uniqueIds.length === 0) {
    return summaries;
  }

  const sinceWorkDate = workDateToDate(addisWorkDateOffset(-29));

  const [tripGroups, timedTrips, complaintRows, attendanceGroups] = await Promise.all([
    prisma.rideRequest.groupBy({
      by: ["assignedDriverUserId", "status"],
      where: { assignedDriverUserId: { in: uniqueIds } },
      _count: { _all: true },
    }),
    prisma.rideRequest.findMany({
      where: {
        assignedDriverUserId: { in: uniqueIds },
        status: "completed",
        scheduledAt: { not: null },
        startedAt: { not: null },
      },
      select: {
        assignedDriverUserId: true,
        scheduledAt: true,
        startedAt: true,
      },
    }),
    prisma.complaint.findMany({
      where: {
        rideRequest: { assignedDriverUserId: { in: uniqueIds } },
      },
      select: {
        rideRequest: { select: { assignedDriverUserId: true } },
      },
    }),
    prisma.driverAttendance.groupBy({
      by: ["driverUserId", "status"],
      where: {
        driverUserId: { in: uniqueIds },
        workDate: { gte: sinceWorkDate },
      },
      _count: { _all: true },
    }),
  ]);

  for (const row of tripGroups) {
    const id = row.assignedDriverUserId;
    if (!id) continue;

    const current = summaries.get(id) ?? emptyPerformance();
    current.trips_assigned += row._count._all;
    if (row.status === "completed") {
      current.trips_completed += row._count._all;
    }
    if (row.status === "no_show") {
      current.trips_no_show += row._count._all;
    }
    summaries.set(id, current);
  }

  const timedTotals = new Map<string, { onTime: number; total: number }>();
  for (const trip of timedTrips) {
    if (!trip.assignedDriverUserId || !trip.startedAt || !trip.scheduledAt) continue;

    const stats = timedTotals.get(trip.assignedDriverUserId) ?? { onTime: 0, total: 0 };
    stats.total += 1;
    if (trip.startedAt.getTime() <= trip.scheduledAt.getTime()) {
      stats.onTime += 1;
    }
    timedTotals.set(trip.assignedDriverUserId, stats);
  }

  for (const [id, stats] of timedTotals) {
    const current = summaries.get(id) ?? emptyPerformance();
    current.on_time_rate = roundRate(stats.onTime, stats.total);
    summaries.set(id, current);
  }

  for (const row of complaintRows) {
    const id = row.rideRequest?.assignedDriverUserId;
    if (!id) continue;

    const current = summaries.get(id) ?? emptyPerformance();
    current.complaints += 1;
    summaries.set(id, current);
  }

  const attendanceTotals = new Map<string, { present: number; absent: number }>();
  for (const row of attendanceGroups) {
    const stats = attendanceTotals.get(row.driverUserId) ?? { present: 0, absent: 0 };
    if (row.status === "present" || row.status === "late") {
      stats.present += row._count._all;
    } else if (row.status === "absent") {
      stats.absent += row._count._all;
    }
    attendanceTotals.set(row.driverUserId, stats);
  }

  for (const [id, stats] of attendanceTotals) {
    const current = summaries.get(id) ?? emptyPerformance();
    current.attendance_rate = roundRate(stats.present, stats.present + stats.absent);
    summaries.set(id, current);
  }

  for (const current of summaries.values()) {
    current.completion_rate = roundRate(
      current.trips_completed,
      current.trips_completed + current.trips_no_show,
    );
  }

  return summaries;
}

export async function getDriverPerformanceSummary(driverUserId: string) {
  const summaries = await getDriverPerformanceSummaries([driverUserId]);
  return summaries.get(driverUserId) ?? emptyPerformance();
}
