import type { ContractBillingInterval, ContractStatus } from "@smart-dispatch/types";
import { Prisma } from "../generated/prisma";
import { prisma } from "../db/prisma";

export type CreateContractInput = {
  title: string;
  status?: ContractStatus;
  farePlanId?: string | null;
  notes?: string | null;
  billingInterval?: ContractBillingInterval;
  paymentTermsDays?: number | null;
  regionIds?: string[];
  vehicleTypeIds?: string[];
  vehicleClassIds?: string[];
  createdById?: string | null;
};

export type UpdateContractInput = {
  title?: string;
  status?: ContractStatus;
  farePlanId?: string | null;
  notes?: string | null;
  billingInterval?: ContractBillingInterval;
  paymentTermsDays?: number | null;
  regionIds?: string[];
  vehicleTypeIds?: string[];
  vehicleClassIds?: string[];
};

export type ListContractsFilter = {
  search?: string;
  status?: ContractStatus;
};

const contractInclude = {
  farePlan: {
    select: {
      id: true,
      slug: true,
      translations: true,
      pricingModel: true,
      currency: true,
      baseFare: true,
      isActive: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
    },
  },
} as const;

function toJsonIds(ids: string[] | undefined) {
  return (ids ?? []) as Prisma.InputJsonValue;
}

function parseJsonIds(value: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function getUtcToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function formatContractDate(value: Date | null | undefined) {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

export function getContractScopeIds(contract: {
  regionIds: Prisma.JsonValue;
  vehicleTypeIds: Prisma.JsonValue;
  vehicleClassIds: Prisma.JsonValue;
}) {
  return {
    regionIds: parseJsonIds(contract.regionIds),
    vehicleTypeIds: parseJsonIds(contract.vehicleTypeIds),
    vehicleClassIds: parseJsonIds(contract.vehicleClassIds),
  };
}

export async function generateContractReferenceNumber() {
  const year = new Date().getUTCFullYear();
  const prefix = `CTR-${year}-`;

  const latest = await prisma.contract.findFirst({
    where: { referenceNumber: { startsWith: prefix } },
    orderBy: { referenceNumber: "desc" },
    select: { referenceNumber: true },
  });

  const latestSuffix = latest?.referenceNumber.slice(prefix.length) ?? "0";
  const nextNumber = Number.parseInt(latestSuffix, 10) + 1;

  return `${prefix}${String(Number.isFinite(nextNumber) ? nextNumber : 1).padStart(4, "0")}`;
}

function buildContractWhere(filter: ListContractsFilter): Prisma.ContractWhereInput {
  const where: Prisma.ContractWhereInput = {};

  if (filter.status) {
    where.status = filter.status;
  }

  if (filter.search?.trim()) {
    const search = filter.search.trim();
    where.OR = [
      { referenceNumber: { contains: search, mode: "insensitive" } },
      { title: { contains: search, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function countContracts(filter: ListContractsFilter = {}) {
  return prisma.contract.count({ where: buildContractWhere(filter) });
}

export async function listContracts(
  filter: ListContractsFilter = {},
  options: { skip?: number; take?: number } = {},
) {
  return prisma.contract.findMany({
    where: buildContractWhere(filter),
    include: contractInclude,
    orderBy: [{ createdAt: "desc" }],
    skip: options.skip,
    take: options.take,
  });
}

export async function findContractById(id: string) {
  return prisma.contract.findUnique({
    where: { id },
    include: contractInclude,
  });
}

export async function findContractByReferenceNumber(referenceNumber: string) {
  return prisma.contract.findUnique({
    where: { referenceNumber },
    include: contractInclude,
  });
}

export async function listActiveContracts() {
  return prisma.contract.findMany({
    where: {
      status: "active",
    },
    include: contractInclude,
    orderBy: [{ title: "asc" }],
  });
}

export async function createContract(input: CreateContractInput) {
  const referenceNumber = await generateContractReferenceNumber();

  return prisma.contract.create({
    data: {
      referenceNumber,
      title: input.title.trim(),
      status: input.status ?? "draft",
      farePlanId: input.farePlanId ?? null,
      notes: input.notes?.trim() || null,
      billingInterval: input.billingInterval ?? "per_trip",
      paymentTermsDays: input.paymentTermsDays ?? null,
      regionIds: toJsonIds(input.regionIds),
      vehicleTypeIds: toJsonIds(input.vehicleTypeIds),
      vehicleClassIds: toJsonIds(input.vehicleClassIds),
      createdById: input.createdById ?? null,
    },
    include: contractInclude,
  });
}

export async function updateContract(id: string, input: UpdateContractInput) {
  return prisma.contract.update({
    where: { id },
    data: {
      title: input.title?.trim(),
      status: input.status,
      farePlanId: input.farePlanId,
      notes: input.notes === undefined ? undefined : input.notes?.trim() || null,
      billingInterval: input.billingInterval,
      paymentTermsDays:
        input.paymentTermsDays === undefined ? undefined : input.paymentTermsDays,
      regionIds: input.regionIds === undefined ? undefined : toJsonIds(input.regionIds),
      vehicleTypeIds: input.vehicleTypeIds === undefined ? undefined : toJsonIds(input.vehicleTypeIds),
      vehicleClassIds:
        input.vehicleClassIds === undefined ? undefined : toJsonIds(input.vehicleClassIds),
    },
    include: contractInclude,
  });
}

export async function deleteContract(id: string) {
  return prisma.contract.delete({ where: { id } });
}

export type RideRequestContractScopeInput = {
  regionId: string | null;
  vehicleTypeId: string | null;
  vehicleClassId: string | null;
};

export function contractMatchesRideRequestScope(
  contract: {
    regionIds: Prisma.JsonValue;
    vehicleTypeIds: Prisma.JsonValue;
    vehicleClassIds: Prisma.JsonValue;
  },
  ride: RideRequestContractScopeInput,
) {
  const scope = getContractScopeIds(contract);

  if (ride.regionId && !scope.regionIds.includes(ride.regionId)) {
    return false;
  }

  if (ride.vehicleTypeId && !scope.vehicleTypeIds.includes(ride.vehicleTypeId)) {
    return false;
  }

  if (ride.vehicleClassId && !scope.vehicleClassIds.includes(ride.vehicleClassId)) {
    return false;
  }

  return true;
}

export function contractMatchesRideRequestScopeStrict(
  contract: {
    regionIds: Prisma.JsonValue;
    vehicleTypeIds: Prisma.JsonValue;
    vehicleClassIds: Prisma.JsonValue;
  },
  ride: RideRequestContractScopeInput,
) {
  if (!ride.regionId || !ride.vehicleTypeId || !ride.vehicleClassId) {
    return false;
  }

  const scope = getContractScopeIds(contract);

  return (
    scope.regionIds.includes(ride.regionId) &&
    scope.vehicleTypeIds.includes(ride.vehicleTypeId) &&
    scope.vehicleClassIds.includes(ride.vehicleClassId)
  );
}

export async function findActiveContractsMatchingRideScope(ride: RideRequestContractScopeInput) {
  if (!ride.regionId || !ride.vehicleTypeId || !ride.vehicleClassId) {
    return [];
  }

  const contracts = await listActiveContracts();

  return contracts.filter((contract) => contractMatchesRideRequestScopeStrict(contract, ride));
}

export async function findActiveContractById(id: string) {
  return prisma.contract.findFirst({
    where: { id, status: "active" },
    select: {
      id: true,
      referenceNumber: true,
      title: true,
      status: true,
      billingInterval: true,
      farePlanId: true,
      paymentTermsDays: true,
      regionIds: true,
      vehicleTypeIds: true,
      vehicleClassIds: true,
    },
  });
}

export type DbContract = NonNullable<Awaited<ReturnType<typeof findContractById>>>;
