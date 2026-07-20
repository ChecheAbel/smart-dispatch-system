import type { InvoiceStatus } from "@smart-dispatch/types";
import { Prisma } from "../generated/prisma";
import { prisma } from "../db/prisma";
import { getUtcToday } from "./contract.model";
import { getDeadlineSettings } from "./app-setting.model";

export type ListInvoicesFilter = {
  search?: string;
  status?: InvoiceStatus;
  contractId?: string;
  requesterUserId?: string;
};

export type ListCustomerInvoicesFilter = {
  search?: string;
  status?: Exclude<InvoiceStatus, "draft">;
};

export type CreateInvoiceInput = {
  referenceNumber: string;
  contractId: string;
  contractEnrollmentId?: string | null;
  requesterUserId: string;
  periodStart: Date;
  periodEnd: Date;
  subtotal: number;
  totalAmount: number;
  currency: string;
  paymentTermsDays?: number | null;
  issuedAt?: Date | null;
  dueAt?: Date | null;
  status?: InvoiceStatus;
  notes?: string | null;
  lineItems: Array<{
    rideRequestId: string;
    description: string;
    unitAmount: number;
    lineTotal: number;
    farePlanId?: string | null;
    distanceKm?: number | null;
    durationMinutes?: number | null;
    pricingSnapshot?: Record<string, unknown> | null;
  }>;
};

const invoiceInclude = {
  contract: {
    select: {
      id: true,
      referenceNumber: true,
      title: true,
      billingInterval: true,
      paymentTermsDays: true,
    },
  },
  contractEnrollment: {
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
    },
  },
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
          organizationName: true,
          billingContactName: true,
          billingContactEmail: true,
        },
      },
    },
  },
  lineItems: {
    orderBy: { createdAt: "asc" as const },
    include: {
      rideRequest: {
        select: {
          id: true,
          pickupAddress: true,
          dropoffAddress: true,
          scheduledAt: true,
          scheduledReturnAt: true,
          passengerCount: true,
          startedAt: true,
          completedAt: true,
          status: true,
          assignedDriver: {
            select: {
              firstName: true,
              middleName: true,
              lastName: true,
            },
          },
          assignedVehicle: {
            select: {
              plateNumber: true,
              make: true,
              model: true,
            },
          },
        },
      },
      farePlan: {
        select: {
          id: true,
          slug: true,
          translations: true,
          pricingModel: true,
        },
      },
    },
  },
} as const;

export type DbInvoice = Prisma.InvoiceGetPayload<{
  include: typeof invoiceInclude;
}>;

function buildInvoiceWhere(
  filter: ListInvoicesFilter,
): Prisma.InvoiceWhereInput {
  const where: Prisma.InvoiceWhereInput = {};

  if (filter.status) {
    where.status = filter.status;
  }

  if (filter.contractId) {
    where.contractId = filter.contractId;
  }

  if (filter.requesterUserId) {
    where.requesterUserId = filter.requesterUserId;
  }

  if (filter.search?.trim()) {
    const search = filter.search.trim();
    where.OR = [
      { referenceNumber: { contains: search, mode: "insensitive" } },
      {
        contract: {
          referenceNumber: { contains: search, mode: "insensitive" },
        },
      },
      { contract: { title: { contains: search, mode: "insensitive" } } },
      {
        requester: {
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  return where;
}

export async function generateInvoiceReferenceNumber() {
  const year = new Date().getUTCFullYear();
  const prefix = `INV-${year}-`;

  const latest = await prisma.invoice.findFirst({
    where: { referenceNumber: { startsWith: prefix } },
    orderBy: { referenceNumber: "desc" },
    select: { referenceNumber: true },
  });

  const latestSuffix = latest?.referenceNumber.slice(prefix.length) ?? "0";
  const nextNumber = Number.parseInt(latestSuffix, 10) + 1;

  return `${prefix}${String(Number.isFinite(nextNumber) ? nextNumber : 1).padStart(4, "0")}`;
}

export async function listInvoices(
  filter: ListInvoicesFilter,
  pagination: { skip: number; take: number },
) {
  return prisma.invoice.findMany({
    where: buildInvoiceWhere(filter),
    include: invoiceInclude,
    skip: pagination.skip,
    take: pagination.take,
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function countInvoices(filter: ListInvoicesFilter) {
  return prisma.invoice.count({ where: buildInvoiceWhere(filter) });
}

export async function findInvoiceById(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: invoiceInclude,
  });
}

function buildCustomerInvoiceWhere(
  requesterUserId: string,
  filter: ListCustomerInvoicesFilter,
): Prisma.InvoiceWhereInput {
  const where: Prisma.InvoiceWhereInput = {
    requesterUserId,
    status: { not: "draft" },
  };

  if (filter.status) {
    where.status = filter.status;
  }

  if (filter.search?.trim()) {
    const search = filter.search.trim();
    where.AND = [
      {
        OR: [
          { referenceNumber: { contains: search, mode: "insensitive" } },
          {
            contract: {
              referenceNumber: { contains: search, mode: "insensitive" },
            },
          },
          { contract: { title: { contains: search, mode: "insensitive" } } },
        ],
      },
    ];
  }

  return where;
}

export async function listCustomerInvoices(
  requesterUserId: string,
  filter: ListCustomerInvoicesFilter,
  pagination: { skip: number; take: number },
) {
  return prisma.invoice.findMany({
    where: buildCustomerInvoiceWhere(requesterUserId, filter),
    include: invoiceInclude,
    skip: pagination.skip,
    take: pagination.take,
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function countCustomerInvoices(
  requesterUserId: string,
  filter: ListCustomerInvoicesFilter,
) {
  return prisma.invoice.count({
    where: buildCustomerInvoiceWhere(requesterUserId, filter),
  });
}

export async function findInvoiceForRequester(
  id: string,
  requesterUserId: string,
) {
  return prisma.invoice.findFirst({
    where: {
      id,
      requesterUserId,
      status: { not: "draft" },
    },
    include: invoiceInclude,
  });
}

export async function createInvoice(input: CreateInvoiceInput) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        referenceNumber: input.referenceNumber,
        status: input.status ?? "draft",
        contractId: input.contractId,
        contractEnrollmentId: input.contractEnrollmentId ?? null,
        requesterUserId: input.requesterUserId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        subtotal: input.subtotal,
        totalAmount: input.totalAmount,
        currency: input.currency.trim().toUpperCase(),
        paymentTermsDays: input.paymentTermsDays ?? null,
        issuedAt: input.issuedAt ?? null,
        dueAt: input.dueAt ?? null,
        notes: input.notes ?? null,
        lineItems: {
          create: input.lineItems.map((item) => ({
            rideRequestId: item.rideRequestId,
            description: item.description,
            unitAmount: item.unitAmount,
            lineTotal: item.lineTotal,
            farePlanId: item.farePlanId ?? null,
            distanceKm: item.distanceKm ?? null,
            durationMinutes: item.durationMinutes ?? null,
            pricingSnapshot: item.pricingSnapshot
              ? (item.pricingSnapshot as Prisma.InputJsonValue)
              : undefined,
          })),
        },
      },
      include: invoiceInclude,
    });

    return invoice;
  });
}

export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus,
  timestamps?: {
    issuedAt?: Date | null;
    dueAt?: Date | null;
    paidAt?: Date | null;
    voidedAt?: Date | null;
  },
) {
  return prisma.invoice.update({
    where: { id },
    data: {
      status,
      issuedAt: timestamps?.issuedAt,
      dueAt: timestamps?.dueAt,
      paidAt: timestamps?.paidAt,
      voidedAt: timestamps?.voidedAt,
    },
    include: invoiceInclude,
  });
}

export async function findUnbilledContractTrips(input: {
  contractId: string;
  requesterUserId: string;
  periodStart: Date;
  periodEnd: Date;
}) {
  return prisma.rideRequest.findMany({
    where: {
      contractId: input.contractId,
      requesterUserId: input.requesterUserId,
      status: "completed",
      completedAt: {
        gte: input.periodStart,
        lte: new Date(
          Date.UTC(
            input.periodEnd.getUTCFullYear(),
            input.periodEnd.getUTCMonth(),
            input.periodEnd.getUTCDate(),
            23,
            59,
            59,
            999,
          ),
        ),
      },
      invoiceLineItem: null,
    },
    orderBy: [{ completedAt: "asc" }, { createdAt: "asc" }],
  });
}

export async function findContractEnrollmentById(id: string) {
  return prisma.contractEnrollment.findUnique({
    where: { id },
    include: {
      contract: {
        include: {
          farePlan: true,
        },
      },
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
  });
}

export async function invoiceExistsForEnrollmentPeriod(
  contractEnrollmentId: string,
  periodStart: Date,
  periodEnd: Date,
) {
  return prisma.invoice.findFirst({
    where: {
      contractEnrollmentId,
      periodStart,
      periodEnd,
      status: { not: "void" },
    },
    select: { id: true, referenceNumber: true },
  });
}

export async function findEndedEnrollmentsPendingInvoice(
  asOf: Date = getUtcToday(),
) {
  const enrollments = await prisma.contractEnrollment.findMany({
    where: {
      endsAt: { lt: asOf },
      contract: {
        status: "active",
        billingInterval: { not: "per_trip" },
      },
    },
    include: {
      contract: {
        select: {
          id: true,
          billingInterval: true,
        },
      },
    },
    orderBy: [{ endsAt: "asc" }, { createdAt: "asc" }],
  });

  const pending = [];

  for (const enrollment of enrollments) {
    const existing = await invoiceExistsForEnrollmentPeriod(
      enrollment.id,
      enrollment.startsAt,
      enrollment.endsAt,
    );
    if (existing) {
      continue;
    }

    const trips = await findUnbilledContractTrips({
      contractId: enrollment.contractId,
      requesterUserId: enrollment.requesterUserId,
      periodStart: enrollment.startsAt,
      periodEnd: enrollment.endsAt,
    });

    if (trips.length > 0) {
      pending.push(enrollment);
    }
  }

  return pending;
}

export async function findUnbilledPerTripRides(rideRequestId?: string) {
  return prisma.rideRequest.findMany({
    where: {
      ...(rideRequestId ? { id: rideRequestId } : {}),
      status: "completed",
      contractId: { not: null },
      invoiceLineItem: null,
      contract: {
        status: "active",
        billingInterval: "per_trip",
      },
    },
    orderBy: [{ completedAt: "asc" }, { createdAt: "asc" }],
  });
}

function endOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

export async function findDueSoonInvoices(
  daysBeforeDue: number = getDeadlineSettings().invoice_due_soon_days,
  asOf: Date = new Date(),
) {
  const end = endOfUtcDay(new Date(asOf));
  end.setUTCDate(end.getUTCDate() + daysBeforeDue);

  return prisma.invoice.findMany({
    where: {
      status: "issued",
      dueAt: {
        gte: asOf,
        lte: end,
      },
    },
    orderBy: [{ dueAt: "asc" }],
  });
}

export async function findOverdueInvoices(asOf: Date = new Date()) {
  return prisma.invoice.findMany({
    where: {
      status: "issued",
      dueAt: {
        lt: asOf,
      },
    },
    orderBy: [{ dueAt: "asc" }],
  });
}

export async function wasInvoiceNotificationSent(
  invoiceId: string,
  event: string,
) {
  const log = await prisma.notificationDeliveryLog.findFirst({
    where: {
      module: "invoices",
      event,
      entityType: "invoice",
      entityId: invoiceId,
      status: "sent",
      isTest: false,
    },
    select: { id: true },
  });

  return Boolean(log);
}
