import type {
  AdminDashboardAnalytics,
  RideRequestStatus,
  VehicleComplianceStatus,
  VehicleStatus,
} from "@smart-dispatch/types";
import { prisma } from "../db/prisma";
import { getVehicleComplianceSummary } from "./vehicle.model";
import { parseRegionTranslationsMap } from "../types/region-translations";
import { DEFAULT_LOCALE, normalizeLocale } from "../utils/locale";

const DEFAULT_PERIOD_DAYS = 30;

const RIDE_REQUEST_STATUSES: RideRequestStatus[] = [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
];

const VEHICLE_STATUSES: VehicleStatus[] = ["active", "maintenance", "retired"];

const COMPLIANCE_STATUSES: VehicleComplianceStatus[] = [
  "expired",
  "due_soon",
  "ok",
  "not_set",
];

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function buildDailyBuckets(days: number) {
  const today = startOfUtcDay(new Date());
  const buckets: string[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - offset);
    buckets.push(date.toISOString().slice(0, 10));
  }

  return buckets;
}

function toDayKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function emptyStatusCounts<T extends string>(statuses: readonly T[]) {
  return Object.fromEntries(statuses.map((status) => [status, 0])) as Record<T, number>;
}

function pickRegionName(translations: unknown, locale?: string, slug?: string) {
  const map = parseRegionTranslationsMap(translations);
  const preferred = normalizeLocale(locale ?? DEFAULT_LOCALE);
  const name =
    map[preferred]?.name ??
    map[DEFAULT_LOCALE]?.name ??
    Object.values(map)[0]?.name ??
    "";

  if (name) return name;
  if (slug) {
    return slug
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  return "";
}

export type AdminDashboardAnalyticsOptions = {
  locale?: string;
  periodDays?: number;
  includeRideRequests?: boolean;
  includeFleet?: boolean;
  includeCompliance?: boolean;
  includeFuel?: boolean;
  includeRegistrations?: boolean;
};

export async function getAdminDashboardAnalytics(
  options: AdminDashboardAnalyticsOptions,
): Promise<AdminDashboardAnalytics> {
  const periodDays = options.periodDays ?? DEFAULT_PERIOD_DAYS;
  const since = startOfUtcDay(new Date());
  since.setUTCDate(since.getUTCDate() - (periodDays - 1));

  const buckets = buildDailyBuckets(periodDays);
  const rideTrend = Object.fromEntries(buckets.map((date) => [date, 0]));
  const fuelCostTrend = Object.fromEntries(buckets.map((date) => [date, 0]));
  const fuelLitersTrend = Object.fromEntries(buckets.map((date) => [date, 0]));
  const registrationTrend = Object.fromEntries(buckets.map((date) => [date, 0]));

  const response: AdminDashboardAnalytics = {
    period_days: periodDays,
    ride_requests: null,
    fleet: null,
    fuel: null,
    registrations: null,
  };

  if (options.includeRideRequests) {
    const [statusGroups, rideRequests, regionGroups] = await Promise.all([
      prisma.rideRequest.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.rideRequest.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      prisma.rideRequest.groupBy({
        by: ["regionId"],
        _count: { _all: true },
      }),
    ]);

    const byStatus = emptyStatusCounts(RIDE_REQUEST_STATUSES);
    for (const group of statusGroups) {
      byStatus[group.status] = group._count._all;
    }

    for (const rideRequest of rideRequests) {
      const day = toDayKey(rideRequest.createdAt);
      if (day in rideTrend) {
        rideTrend[day] += 1;
      }
    }

    const regionIds = regionGroups
      .map((group) => group.regionId)
      .filter((regionId): regionId is string => Boolean(regionId));

    const regions =
      regionIds.length > 0
        ? await prisma.region.findMany({
            where: { id: { in: regionIds } },
            select: { id: true, slug: true, translations: true },
          })
        : [];

    const regionNameById = new Map(
      regions.map((region) => [
        region.id,
        pickRegionName(region.translations, options.locale, region.slug),
      ]),
    );

    const byRegion = regionGroups
      .map((group) => ({
        region_id: group.regionId,
        region_name: group.regionId ? regionNameById.get(group.regionId) || "" : "",
        count: group._count._all,
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 8);

    response.ride_requests = {
      by_status: byStatus,
      trend: buckets.map((date) => ({ date, count: rideTrend[date] ?? 0 })),
      by_region: byRegion,
    };
  }

  if (options.includeFleet || options.includeCompliance) {
    const statusGroups = await prisma.vehicle.groupBy({
      by: ["status"],
      _count: { _all: true },
    });

    const byStatus = emptyStatusCounts(VEHICLE_STATUSES);
    for (const group of statusGroups) {
      byStatus[group.status] = group._count._all;
    }

    response.fleet = {
      by_status: byStatus,
      compliance: null,
    };

    if (options.includeCompliance) {
      const summary = await getVehicleComplianceSummary();
      response.fleet.compliance = {
        insurance: COMPLIANCE_STATUSES.map((status) => ({
          status,
          count: summary.insurance[status],
        })),
        inspection: COMPLIANCE_STATUSES.map((status) => ({
          status,
          count: summary.inspection[status],
        })),
        vehicles_needing_attention: summary.vehicles_needing_attention,
      };
    }
  }

  if (options.includeFuel) {
    const fuelLogs = await prisma.vehicleFuelLog.findMany({
      where: { loggedAt: { gte: since } },
      select: {
        loggedAt: true,
        totalCost: true,
        quantityLiters: true,
      },
    });

    for (const log of fuelLogs) {
      const day = toDayKey(log.loggedAt);
      if (!(day in fuelCostTrend)) continue;
      fuelCostTrend[day] += log.totalCost ? Number(log.totalCost) : 0;
      fuelLitersTrend[day] += Number(log.quantityLiters);
    }

    response.fuel = {
      trend: buckets.map((date) => ({
        date,
        total_cost: Number(fuelCostTrend[date]?.toFixed(2) ?? 0),
        total_liters: Number(fuelLitersTrend[date]?.toFixed(2) ?? 0),
      })),
    };
  }

  if (options.includeRegistrations) {
    const registrations = await prisma.user.findMany({
      where: {
        createdAt: { gte: since },
        requesterProfile: { isNot: null },
      },
      select: { createdAt: true },
    });

    for (const registration of registrations) {
      const day = toDayKey(registration.createdAt);
      if (day in registrationTrend) {
        registrationTrend[day] += 1;
      }
    }

    response.registrations = {
      trend: buckets.map((date) => ({ date, count: registrationTrend[date] ?? 0 })),
    };
  }

  return response;
}
