import type { ContractBillingInterval } from "@smart-dispatch/types";
import type { Prisma } from "../generated/prisma";
import { prisma } from "../db/prisma";
import { formatContractDate, getUtcToday } from "./contract.model";

export function getEnrollmentStartDate(acceptedAt: Date = new Date()) {
  return new Date(
    Date.UTC(acceptedAt.getUTCFullYear(), acceptedAt.getUTCMonth(), acceptedAt.getUTCDate()),
  );
}

export function toUtcDateOnly(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function resolveEnrollmentStartDate(options: {
  scheduledAt?: Date | null;
  acceptedAt?: Date;
}) {
  const acceptedStart = getEnrollmentStartDate(options.acceptedAt ?? new Date());

  if (!options.scheduledAt) {
    return acceptedStart;
  }

  const scheduledStart = toUtcDateOnly(options.scheduledAt);

  if (scheduledStart.getTime() < acceptedStart.getTime()) {
    return acceptedStart;
  }

  return scheduledStart;
}

/** @deprecated Use toUtcDateOnly */
export function getTripCoverageDate(scheduledAt: Date | null | undefined, at: Date = new Date()) {
  const source = scheduledAt ?? at;
  return toUtcDateOnly(source);
}

function addUtcMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export function calculateEnrollmentEndDate(
  startsAt: Date,
  billingInterval: ContractBillingInterval,
) {
  const start = getEnrollmentStartDate(startsAt);

  switch (billingInterval) {
    case "per_trip":
      return start;
    case "monthly": {
      const end = addUtcMonths(start, 1);
      end.setUTCDate(end.getUTCDate() - 1);
      return end;
    }
    case "quarterly": {
      const end = addUtcMonths(start, 3);
      end.setUTCDate(end.getUTCDate() - 1);
      return end;
    }
    case "annually": {
      const end = new Date(
        Date.UTC(start.getUTCFullYear() + 1, start.getUTCMonth(), start.getUTCDate()),
      );
      end.setUTCDate(end.getUTCDate() - 1);
      return end;
    }
    default:
      return start;
  }
}

export function isDateWithinEnrollment(
  enrollment: { startsAt: Date; endsAt: Date },
  date: Date,
) {
  const day = formatContractDate(date);
  const start = formatContractDate(enrollment.startsAt);
  const end = formatContractDate(enrollment.endsAt);

  if (!day || !start || !end) {
    return false;
  }

  return day >= start && day <= end;
}

export async function findEnrollmentCoveringTrip(
  contractId: string,
  requesterUserId: string,
  tripDate: Date,
  client: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const day = formatContractDate(tripDate);
  if (!day) return null;

  return client.contractEnrollment.findFirst({
    where: {
      contractId,
      requesterUserId,
      startsAt: { lte: tripDate },
      endsAt: { gte: tripDate },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listRelevantEnrollmentsForUser(requesterUserId: string) {
  const today = getUtcToday();

  return prisma.contractEnrollment.findMany({
    where: {
      requesterUserId,
      endsAt: { gte: today },
    },
    orderBy: [{ contractId: "asc" }, { createdAt: "desc" }],
  });
}

const customerEnrollmentInclude = {
  contract: {
    select: {
      id: true,
      referenceNumber: true,
      title: true,
      status: true,
      billingInterval: true,
      paymentTermsDays: true,
    },
  },
  invoices: {
    where: { status: { not: "draft" as const } },
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: {
      id: true,
      referenceNumber: true,
      status: true,
      totalAmount: true,
      currency: true,
      dueAt: true,
      paidAt: true,
      issuedAt: true,
    },
  },
} as const;

export type DbCustomerContractEnrollment = Prisma.ContractEnrollmentGetPayload<{
  include: typeof customerEnrollmentInclude;
}>;

export async function listEnrollmentsForRequester(
  requesterUserId: string,
  pagination: { skip: number; take: number },
  search?: string,
) {
  const where: Prisma.ContractEnrollmentWhereInput = { requesterUserId };

  if (search?.trim()) {
    const term = search.trim();
    where.OR = [
      { contract: { referenceNumber: { contains: term, mode: "insensitive" } } },
      { contract: { title: { contains: term, mode: "insensitive" } } },
      { invoices: { some: { referenceNumber: { contains: term, mode: "insensitive" } } } },
    ];
  }

  return prisma.contractEnrollment.findMany({
    where,
    include: customerEnrollmentInclude,
    skip: pagination.skip,
    take: pagination.take,
    orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function countEnrollmentsForRequester(requesterUserId: string, search?: string) {
  const where: Prisma.ContractEnrollmentWhereInput = { requesterUserId };

  if (search?.trim()) {
    const term = search.trim();
    where.OR = [
      { contract: { referenceNumber: { contains: term, mode: "insensitive" } } },
      { contract: { title: { contains: term, mode: "insensitive" } } },
      { invoices: { some: { referenceNumber: { contains: term, mode: "insensitive" } } } },
    ];
  }

  return prisma.contractEnrollment.count({ where });
}

export async function findEnrollmentForRequester(id: string, requesterUserId: string) {
  return prisma.contractEnrollment.findFirst({
    where: { id, requesterUserId },
    include: customerEnrollmentInclude,
  });
}

export async function listEnrollmentsByContractId(contractId: string) {
  return prisma.contractEnrollment.findMany({
    where: { contractId },
    include: {
      requester: {
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          email: true,
          mobileNumber: true,
        },
      },
    },
    orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function ensureContractEnrollment(input: {
  contractId: string;
  requesterUserId: string;
  scheduledAt?: Date | null;
  acceptedAt?: Date;
  billingInterval: ContractBillingInterval;
  client?: Prisma.TransactionClient;
}) {
  const db = input.client ?? prisma;
  const startDate = resolveEnrollmentStartDate({
    scheduledAt: input.scheduledAt,
    acceptedAt: input.acceptedAt,
  });
  const existing = await findEnrollmentCoveringTrip(
    input.contractId,
    input.requesterUserId,
    startDate,
    db,
  );

  if (existing) {
    return existing;
  }

  const endsAt = calculateEnrollmentEndDate(startDate, input.billingInterval);

  return db.contractEnrollment.create({
    data: {
      contractId: input.contractId,
      requesterUserId: input.requesterUserId,
      startsAt: startDate,
      endsAt,
    },
  });
}
