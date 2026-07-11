import bcrypt from "bcrypt";
import type { InvoiceStatus, RideRequestStatus } from "@smart-dispatch/types";
import { prisma } from "../db/prisma";
import { VehicleStatus } from "../generated/prisma";
import {
  calculateEnrollmentEndDate,
  toUtcDateOnly,
} from "../models/contract-enrollment.model";
import { formatContractDate } from "../models/contract.model";

const SEED_MARKER = "[seed:billing-demo]";

const DEMO_CONTRACT_REFS = {
  monthly: "CTR-DEMO-MONTHLY",
  perTrip: "CTR-DEMO-PERTRIP",
} as const;

const DEMO_INVOICE_REFS: Record<Exclude<InvoiceStatus, never>, string> = {
  draft: "INV-DEMO-DRAFT",
  issued: "INV-DEMO-ISSUED",
  paid: "INV-DEMO-PAID",
  void: "INV-DEMO-VOID",
};

const DEMO_CUSTOMER = {
  email: process.env.SEED_CUSTOMER_EMAIL?.trim().toLowerCase() ?? "customer@demo.local",
  password: process.env.SEED_CUSTOMER_PASSWORD ?? "DemoCustomer1!",
  firstName: process.env.SEED_CUSTOMER_FIRST_NAME ?? "Demo",
  middleName: process.env.SEED_CUSTOMER_MIDDLE_NAME?.trim() || null,
  lastName: process.env.SEED_CUSTOMER_LAST_NAME ?? "Customer",
  mobileNumber: process.env.SEED_CUSTOMER_MOBILE ?? "+251911000001",
  organizationName: "Cheche Demo Industries",
} as const;

function seedNote(key: string) {
  return `${SEED_MARKER} ${key}`;
}

function utcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addUtcMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function startOfUtcMonth(date: Date) {
  return utcDate(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
}

function atUtcNoon(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0),
  );
}

async function findDemoContracts() {
  return prisma.contract.findMany({
    where: { referenceNumber: { in: Object.values(DEMO_CONTRACT_REFS) } },
  });
}

async function clearDemoRideRequests(input: { requesterUserId: string; contractIds: string[] }) {
  const whereConditions: Array<{
    notes?: { startsWith: string };
    requesterUserId?: string;
    contractId?: { in: string[] };
  }> = [{ notes: { startsWith: SEED_MARKER } }];

  if (input.contractIds.length) {
    whereConditions.push({
      requesterUserId: input.requesterUserId,
      contractId: { in: input.contractIds },
    });
  }

  const rides = await prisma.rideRequest.findMany({
    where: { OR: whereConditions },
    select: { id: true },
  });

  const rideIds = rides.map((ride) => ride.id);
  if (!rideIds.length) {
    return 0;
  }

  await prisma.invoiceLineItem.deleteMany({ where: { rideRequestId: { in: rideIds } } });
  const result = await prisma.rideRequest.deleteMany({ where: { id: { in: rideIds } } });
  return result.count;
}

async function clearDemoInvoices() {
  const demoInvoices = await prisma.invoice.findMany({
    where: { referenceNumber: { in: Object.values(DEMO_INVOICE_REFS) } },
    select: { id: true },
  });
  const invoiceIds = demoInvoices.map((invoice) => invoice.id);
  if (!invoiceIds.length) {
    return 0;
  }

  await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
  const result = await prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
  return result.count;
}

export async function clearBillingDemoData() {
  const demoContracts = await prisma.contract.findMany({
    where: { referenceNumber: { in: Object.values(DEMO_CONTRACT_REFS) } },
    select: { id: true },
  });
  const contractIds = demoContracts.map((contract) => contract.id);

  const demoCustomer = await prisma.user.findUnique({
    where: { email: DEMO_CUSTOMER.email },
    select: { id: true },
  });

  const rideWhere = {
    OR: [
      { notes: { startsWith: SEED_MARKER } },
      ...(contractIds.length ? [{ contractId: { in: contractIds } }] : []),
      ...(demoCustomer ? [{ requesterUserId: demoCustomer.id }] : []),
    ],
  };

  const demoRides = await prisma.rideRequest.findMany({
    where: rideWhere,
    select: { id: true },
  });
  const rideIds = demoRides.map((ride) => ride.id);

  const invoiceWhere = {
    OR: [
      { referenceNumber: { startsWith: "INV-DEMO-" } },
      ...(contractIds.length ? [{ contractId: { in: contractIds } }] : []),
      ...(demoCustomer ? [{ requesterUserId: demoCustomer.id }] : []),
    ],
  };

  const demoInvoices = await prisma.invoice.findMany({
    where: invoiceWhere,
    select: { id: true },
  });
  const invoiceIds = demoInvoices.map((invoice) => invoice.id);

  if (invoiceIds.length || rideIds.length) {
    await prisma.invoiceLineItem.deleteMany({
      where: {
        OR: [
          ...(invoiceIds.length ? [{ invoiceId: { in: invoiceIds } }] : []),
          ...(rideIds.length ? [{ rideRequestId: { in: rideIds } }] : []),
        ],
      },
    });
  }

  if (invoiceIds.length) {
    await prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
  }

  if (rideIds.length) {
    await prisma.rideRequest.deleteMany({ where: { id: { in: rideIds } } });
  }

  if (contractIds.length) {
    await prisma.contractEnrollment.deleteMany({ where: { contractId: { in: contractIds } } });
    await prisma.contract.deleteMany({ where: { id: { in: contractIds } } });
  }

  if (demoCustomer) {
    await prisma.requesterProfile.deleteMany({ where: { userId: demoCustomer.id } });
    await prisma.authRole.deleteMany({ where: { userId: demoCustomer.id } });
    await prisma.user.delete({ where: { id: demoCustomer.id } });
  }
}

export async function runClearBillingDemo() {
  await clearBillingDemoData();
  console.log("[Seed] Billing demo data removed (ride requests, contracts, invoices, demo customer)");
}

async function ensureDemoCustomer() {
  const userRole = await prisma.role.findUnique({ where: { slug: "user" } });
  if (!userRole) {
    throw new Error('[Seed] Role "user" not found. Run pnpm db:seed roles access first.');
  }

  const passwordHash = await bcrypt.hash(DEMO_CUSTOMER.password, 12);

  const user = await prisma.user.upsert({
    where: { email: DEMO_CUSTOMER.email },
    update: {
      firstName: DEMO_CUSTOMER.firstName,
      middleName: DEMO_CUSTOMER.middleName,
      lastName: DEMO_CUSTOMER.lastName,
      mobileNumber: DEMO_CUSTOMER.mobileNumber,
      accountStatus: "active",
      accountActivation: "activated",
    },
    create: {
      email: DEMO_CUSTOMER.email,
      passwordHash,
      firstName: DEMO_CUSTOMER.firstName,
      middleName: DEMO_CUSTOMER.middleName,
      lastName: DEMO_CUSTOMER.lastName,
      mobileNumber: DEMO_CUSTOMER.mobileNumber,
      accountStatus: "active",
      accountActivation: "activated",
      authRoles: {
        create: { roleId: userRole.id },
      },
    },
  });

  await prisma.requesterProfile.upsert({
    where: { userId: user.id },
    update: {
      segment: "business",
      organizationName: DEMO_CUSTOMER.organizationName,
      billingContactName: `${DEMO_CUSTOMER.firstName} ${DEMO_CUSTOMER.lastName}`,
      billingContactEmail: DEMO_CUSTOMER.email,
      organizationAddress: "Kazanchis, Addis Ababa",
      taxId: "DEMO-TIN-001",
    },
    create: {
      userId: user.id,
      segment: "business",
      organizationName: DEMO_CUSTOMER.organizationName,
      billingContactName: `${DEMO_CUSTOMER.firstName} ${DEMO_CUSTOMER.lastName}`,
      billingContactEmail: DEMO_CUSTOMER.email,
      organizationAddress: "Kazanchis, Addis Ababa",
      taxId: "DEMO-TIN-001",
    },
  });

  return user;
}

async function loadReferenceData() {
  const [region, vehicleType, vehicleClass, farePlan, pickupLocation, dropoffLocation, vehicle, adminUser] =
    await Promise.all([
      prisma.region.findUnique({ where: { slug: "addis-ababa" } }),
      prisma.vehicleType.findUnique({ where: { slug: "sedan" } }),
      prisma.vehicleClass.findUnique({ where: { slug: "standard" } }),
      prisma.farePlan.findUnique({ where: { slug: "addis-sedan-standard" } }),
      prisma.location.findFirst({
        where: { address: { contains: "Bole", mode: "insensitive" }, isActive: true },
      }),
      prisma.location.findFirst({
        where: { address: { contains: "Meskel", mode: "insensitive" }, isActive: true },
      }),
      prisma.vehicle.findFirst({
        where: { status: VehicleStatus.active },
        orderBy: { plateNumber: "asc" },
      }),
      prisma.user.findFirst({
        where: { authRoles: { some: { role: { slug: "admin" } } } },
        orderBy: { createdAt: "asc" },
      }),
    ]);

  if (!region || !vehicleType || !vehicleClass || !farePlan || !pickupLocation || !dropoffLocation) {
    throw new Error(
      "[Seed] Missing reference data for billing demo. Run full seed through fare-plans and locations first.",
    );
  }

  return {
    region,
    vehicleType,
    vehicleClass,
    farePlan,
    pickupLocation,
    dropoffLocation,
    vehicle,
    adminUser,
  };
}

type RideRequestSeedInput = {
  key: string;
  requesterUserId: string;
  contractId?: string | null;
  status: RideRequestStatus;
  scheduledAt: Date;
  completedAt?: Date | null;
  startedAt?: Date | null;
  farePlanId: string;
  billableAmount: number;
  distanceKm: number;
  durationMinutes: number;
  refs: Awaited<ReturnType<typeof loadReferenceData>>;
};

async function ensureDemoContract(input: {
  referenceNumber: string;
  title: string;
  billingInterval: "monthly" | "per_trip";
  paymentTermsDays: number | null;
  refs: Awaited<ReturnType<typeof loadReferenceData>>;
  seedKey: string;
}) {
  return prisma.contract.upsert({
    where: { referenceNumber: input.referenceNumber },
    update: {
      title: input.title,
      status: "active",
      farePlanId: input.refs.farePlan.id,
      notes: seedNote(input.seedKey),
      billingInterval: input.billingInterval,
      paymentTermsDays: input.paymentTermsDays,
      regionIds: [input.refs.region.id],
      vehicleTypeIds: [input.refs.vehicleType.id],
      vehicleClassIds: [input.refs.vehicleClass.id],
      createdById: input.refs.adminUser?.id ?? null,
    },
    create: {
      referenceNumber: input.referenceNumber,
      title: input.title,
      status: "active",
      farePlanId: input.refs.farePlan.id,
      notes: seedNote(input.seedKey),
      billingInterval: input.billingInterval,
      paymentTermsDays: input.paymentTermsDays,
      regionIds: [input.refs.region.id],
      vehicleTypeIds: [input.refs.vehicleType.id],
      vehicleClassIds: [input.refs.vehicleClass.id],
      createdById: input.refs.adminUser?.id ?? null,
    },
  });
}

async function createRideRequest(input: RideRequestSeedInput) {
  const pickupAddress = input.refs.pickupLocation.address ?? "Bole, Addis Ababa";
  const dropoffAddress = input.refs.dropoffLocation.address ?? "Meskel Square, Addis Ababa";

  return prisma.rideRequest.create({
    data: {
      requesterUserId: input.requesterUserId,
      contractId: input.contractId ?? null,
      vehicleTypeId: input.refs.vehicleType.id,
      vehicleClassId: input.refs.vehicleClass.id,
      regionId: input.refs.region.id,
      pickupLocationId: input.refs.pickupLocation.id,
      dropoffLocationId: input.refs.dropoffLocation.id,
      pickupAddress,
      pickupLatitude: input.refs.pickupLocation.latitude,
      pickupLongitude: input.refs.pickupLocation.longitude,
      dropoffAddress,
      dropoffLatitude: input.refs.dropoffLocation.latitude,
      dropoffLongitude: input.refs.dropoffLocation.longitude,
      scheduledAt: input.scheduledAt,
      passengerCount: 2,
      notes: seedNote(input.key),
      status: input.status,
      farePlanId: input.farePlanId,
      distanceKm: input.distanceKm,
      durationMinutes: input.durationMinutes,
      billableAmount: input.billableAmount,
      billableCurrency: "ETB",
      assignedVehicleId:
        input.status === "completed" || input.status === "in_progress" || input.status === "confirmed"
          ? input.refs.vehicle?.id ?? null
          : null,
      assignedAt:
        input.status === "completed" || input.status === "in_progress" || input.status === "confirmed"
          ? addUtcDays(input.scheduledAt, -1)
          : null,
      startedAt: input.startedAt ?? null,
      completedAt: input.completedAt ?? null,
    },
  });
}

async function ensureEnrollment(input: {
  contractId: string;
  requesterUserId: string;
  startsAt: Date;
  billingInterval: "monthly" | "per_trip";
}) {
  const startsAt = toUtcDateOnly(input.startsAt);
  const endsAt = calculateEnrollmentEndDate(startsAt, input.billingInterval);

  const existing = await prisma.contractEnrollment.findFirst({
    where: {
      contractId: input.contractId,
      requesterUserId: input.requesterUserId,
      startsAt,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.contractEnrollment.create({
    data: {
      contractId: input.contractId,
      requesterUserId: input.requesterUserId,
      startsAt,
      endsAt,
    },
  });
}

async function createInvoice(input: {
  referenceNumber: string;
  status: InvoiceStatus;
  contractId: string;
  contractEnrollmentId: string;
  requesterUserId: string;
  periodStart: Date;
  periodEnd: Date;
  paymentTermsDays: number;
  issuedAt?: Date | null;
  dueAt?: Date | null;
  paidAt?: Date | null;
  voidedAt?: Date | null;
  lineItem: {
    rideRequestId: string;
    description: string;
    unitAmount: number;
    farePlanId: string;
    distanceKm: number;
    durationMinutes: number;
  };
}) {
  const amount = input.lineItem.unitAmount;

  return prisma.invoice.create({
    data: {
      referenceNumber: input.referenceNumber,
      status: input.status,
      contractId: input.contractId,
      contractEnrollmentId: input.contractEnrollmentId,
      requesterUserId: input.requesterUserId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      subtotal: amount,
      totalAmount: amount,
      currency: "ETB",
      paymentTermsDays: input.paymentTermsDays,
      issuedAt: input.issuedAt ?? null,
      dueAt: input.dueAt ?? null,
      paidAt: input.paidAt ?? null,
      voidedAt: input.voidedAt ?? null,
      notes: seedNote(`invoice:${input.referenceNumber}`),
      lineItems: {
        create: {
          rideRequestId: input.lineItem.rideRequestId,
          description: input.lineItem.description,
          unitAmount: amount,
          lineTotal: amount,
          farePlanId: input.lineItem.farePlanId,
          distanceKm: input.lineItem.distanceKm,
          durationMinutes: input.lineItem.durationMinutes,
        },
      },
    },
  });
}

export async function seedBillingDemo() {
  const shouldReset = process.env.SEED_BILLING_DEMO_RESET === "true";

  if (shouldReset) {
    await clearBillingDemoData();
    console.log("[Seed] Cleared previous billing demo data");
  }

  const refs = await loadReferenceData();
  const customer = await ensureDemoCustomer();
  const existingContracts = await findDemoContracts();
  const contractIds = existingContracts.map((contract) => contract.id);

  const removedRides = await clearDemoRideRequests({
    requesterUserId: customer.id,
    contractIds,
  });
  const removedInvoices = await clearDemoInvoices();

  if (removedRides > 0) {
    console.log(`[Seed] Removed ${removedRides} existing demo ride request(s)`);
  }
  if (removedInvoices > 0) {
    console.log(`[Seed] Removed ${removedInvoices} existing demo invoice(s)`);
  }

  const today = toUtcDateOnly(new Date());
  const currentMonthStart = startOfUtcMonth(today);
  const previousMonthStart = startOfUtcMonth(addUtcMonths(today, -1));
  const twoMonthsAgoStart = startOfUtcMonth(addUtcMonths(today, -2));
  const threeMonthsAgoStart = startOfUtcMonth(addUtcMonths(today, -3));

  const monthlyContract = await ensureDemoContract({
    referenceNumber: DEMO_CONTRACT_REFS.monthly,
    title: "Demo Corporate Shuttle Agreement",
    billingInterval: "monthly",
    paymentTermsDays: 30,
    refs,
    seedKey: "monthly-contract",
  });

  const perTripContract = await ensureDemoContract({
    referenceNumber: DEMO_CONTRACT_REFS.perTrip,
    title: "Demo Executive Per-Trip Agreement",
    billingInterval: "per_trip",
    paymentTermsDays: null,
    refs,
    seedKey: "per-trip-contract",
  });

  const [
    onDemandPending,
    onDemandConfirmed,
    onDemandCompleted,
    contractPending,
    contractConfirmed,
    tripDraftInvoice,
    tripIssuedInvoice,
    tripPaidInvoice,
    tripVoidInvoice,
    perTripCompleted,
  ] = await Promise.all([
    createRideRequest({
      key: "ondemand-pending",
      requesterUserId: customer.id,
      status: "pending",
      scheduledAt: atUtcNoon(addUtcDays(today, 2)),
      farePlanId: refs.farePlan.id,
      billableAmount: 0,
      distanceKm: 0,
      durationMinutes: 0,
      refs,
    }),
    createRideRequest({
      key: "ondemand-confirmed",
      requesterUserId: customer.id,
      status: "confirmed",
      scheduledAt: atUtcNoon(addUtcDays(today, 1)),
      farePlanId: refs.farePlan.id,
      billableAmount: 0,
      distanceKm: 0,
      durationMinutes: 0,
      refs,
    }),
    createRideRequest({
      key: "ondemand-completed",
      requesterUserId: customer.id,
      status: "completed",
      scheduledAt: atUtcNoon(addUtcDays(today, -2)),
      startedAt: atUtcNoon(addUtcDays(today, -2)),
      completedAt: atUtcNoon(addUtcDays(today, -2)),
      farePlanId: refs.farePlan.id,
      billableAmount: 385.5,
      distanceKm: 8.2,
      durationMinutes: 22,
      refs,
    }),
    createRideRequest({
      key: "contract-pending",
      requesterUserId: customer.id,
      contractId: monthlyContract.id,
      status: "pending",
      scheduledAt: atUtcNoon(addUtcDays(today, 3)),
      farePlanId: refs.farePlan.id,
      billableAmount: 0,
      distanceKm: 0,
      durationMinutes: 0,
      refs,
    }),
    createRideRequest({
      key: "contract-confirmed",
      requesterUserId: customer.id,
      contractId: monthlyContract.id,
      status: "confirmed",
      scheduledAt: atUtcNoon(addUtcDays(today, 4)),
      farePlanId: refs.farePlan.id,
      billableAmount: 0,
      distanceKm: 0,
      durationMinutes: 0,
      refs,
    }),
    createRideRequest({
      key: "contract-trip-draft",
      requesterUserId: customer.id,
      contractId: monthlyContract.id,
      status: "completed",
      scheduledAt: atUtcNoon(addUtcDays(currentMonthStart, 4)),
      startedAt: atUtcNoon(addUtcDays(currentMonthStart, 4)),
      completedAt: atUtcNoon(addUtcDays(currentMonthStart, 4)),
      farePlanId: refs.farePlan.id,
      billableAmount: 412,
      distanceKm: 10.4,
      durationMinutes: 28,
      refs,
    }),
    createRideRequest({
      key: "contract-trip-issued",
      requesterUserId: customer.id,
      contractId: monthlyContract.id,
      status: "completed",
      scheduledAt: atUtcNoon(addUtcDays(previousMonthStart, 6)),
      startedAt: atUtcNoon(addUtcDays(previousMonthStart, 6)),
      completedAt: atUtcNoon(addUtcDays(previousMonthStart, 6)),
      farePlanId: refs.farePlan.id,
      billableAmount: 468.75,
      distanceKm: 12.1,
      durationMinutes: 31,
      refs,
    }),
    createRideRequest({
      key: "contract-trip-paid",
      requesterUserId: customer.id,
      contractId: monthlyContract.id,
      status: "completed",
      scheduledAt: atUtcNoon(addUtcDays(twoMonthsAgoStart, 8)),
      startedAt: atUtcNoon(addUtcDays(twoMonthsAgoStart, 8)),
      completedAt: atUtcNoon(addUtcDays(twoMonthsAgoStart, 8)),
      farePlanId: refs.farePlan.id,
      billableAmount: 521.25,
      distanceKm: 14.3,
      durationMinutes: 35,
      refs,
    }),
    createRideRequest({
      key: "contract-trip-void",
      requesterUserId: customer.id,
      contractId: monthlyContract.id,
      status: "completed",
      scheduledAt: atUtcNoon(addUtcDays(threeMonthsAgoStart, 10)),
      startedAt: atUtcNoon(addUtcDays(threeMonthsAgoStart, 10)),
      completedAt: atUtcNoon(addUtcDays(threeMonthsAgoStart, 10)),
      farePlanId: refs.farePlan.id,
      billableAmount: 355,
      distanceKm: 7.5,
      durationMinutes: 19,
      refs,
    }),
    createRideRequest({
      key: "per-trip-completed",
      requesterUserId: customer.id,
      contractId: perTripContract.id,
      status: "completed",
      scheduledAt: atUtcNoon(addUtcDays(today, -5)),
      startedAt: atUtcNoon(addUtcDays(today, -5)),
      completedAt: atUtcNoon(addUtcDays(today, -5)),
      farePlanId: refs.farePlan.id,
      billableAmount: 620,
      distanceKm: 16.8,
      durationMinutes: 40,
      refs,
    }),
  ]);

  void onDemandPending;
  void onDemandConfirmed;
  void onDemandCompleted;
  void contractPending;
  void contractConfirmed;
  void perTripCompleted;

  const [
    currentEnrollment,
    previousEnrollment,
    twoMonthsEnrollment,
    threeMonthsEnrollment,
    perTripEnrollment,
  ] = await Promise.all([
    ensureEnrollment({
      contractId: monthlyContract.id,
      requesterUserId: customer.id,
      startsAt: currentMonthStart,
      billingInterval: "monthly",
    }),
    ensureEnrollment({
      contractId: monthlyContract.id,
      requesterUserId: customer.id,
      startsAt: previousMonthStart,
      billingInterval: "monthly",
    }),
    ensureEnrollment({
      contractId: monthlyContract.id,
      requesterUserId: customer.id,
      startsAt: twoMonthsAgoStart,
      billingInterval: "monthly",
    }),
    ensureEnrollment({
      contractId: monthlyContract.id,
      requesterUserId: customer.id,
      startsAt: threeMonthsAgoStart,
      billingInterval: "monthly",
    }),
    ensureEnrollment({
      contractId: perTripContract.id,
      requesterUserId: customer.id,
      startsAt: toUtcDateOnly(addUtcDays(today, -5)),
      billingInterval: "per_trip",
    }),
  ]);

  void perTripEnrollment;

  const issuedAt = atUtcNoon(addUtcDays(today, -12));
  const dueAt = addUtcDays(issuedAt, 30);
  const paidIssuedAt = atUtcNoon(addUtcDays(today, -45));
  const paidDueAt = addUtcDays(paidIssuedAt, 30);
  const paidAt = atUtcNoon(addUtcDays(today, -38));
  const voidIssuedAt = atUtcNoon(addUtcDays(today, -70));
  const voidDueAt = addUtcDays(voidIssuedAt, 30);
  const voidedAt = atUtcNoon(addUtcDays(today, -55));

  await Promise.all([
    createInvoice({
      referenceNumber: DEMO_INVOICE_REFS.draft,
      status: "draft",
      contractId: monthlyContract.id,
      contractEnrollmentId: currentEnrollment.id,
      requesterUserId: customer.id,
      periodStart: currentEnrollment.startsAt,
      periodEnd: currentEnrollment.endsAt,
      paymentTermsDays: 30,
      lineItem: {
        rideRequestId: tripDraftInvoice.id,
        description: "Corporate shuttle — Bole to Meskel Square",
        unitAmount: 412,
        farePlanId: refs.farePlan.id,
        distanceKm: 10.4,
        durationMinutes: 28,
      },
    }),
    createInvoice({
      referenceNumber: DEMO_INVOICE_REFS.issued,
      status: "issued",
      contractId: monthlyContract.id,
      contractEnrollmentId: previousEnrollment.id,
      requesterUserId: customer.id,
      periodStart: previousEnrollment.startsAt,
      periodEnd: previousEnrollment.endsAt,
      paymentTermsDays: 30,
      issuedAt,
      dueAt,
      lineItem: {
        rideRequestId: tripIssuedInvoice.id,
        description: "Corporate shuttle — Bole to Meskel Square",
        unitAmount: 468.75,
        farePlanId: refs.farePlan.id,
        distanceKm: 12.1,
        durationMinutes: 31,
      },
    }),
    createInvoice({
      referenceNumber: DEMO_INVOICE_REFS.paid,
      status: "paid",
      contractId: monthlyContract.id,
      contractEnrollmentId: twoMonthsEnrollment.id,
      requesterUserId: customer.id,
      periodStart: twoMonthsEnrollment.startsAt,
      periodEnd: twoMonthsEnrollment.endsAt,
      paymentTermsDays: 30,
      issuedAt: paidIssuedAt,
      dueAt: paidDueAt,
      paidAt,
      lineItem: {
        rideRequestId: tripPaidInvoice.id,
        description: "Corporate shuttle — Bole to Meskel Square",
        unitAmount: 521.25,
        farePlanId: refs.farePlan.id,
        distanceKm: 14.3,
        durationMinutes: 35,
      },
    }),
    createInvoice({
      referenceNumber: DEMO_INVOICE_REFS.void,
      status: "void",
      contractId: monthlyContract.id,
      contractEnrollmentId: threeMonthsEnrollment.id,
      requesterUserId: customer.id,
      periodStart: threeMonthsEnrollment.startsAt,
      periodEnd: threeMonthsEnrollment.endsAt,
      paymentTermsDays: 30,
      issuedAt: voidIssuedAt,
      dueAt: voidDueAt,
      voidedAt,
      lineItem: {
        rideRequestId: tripVoidInvoice.id,
        description: "Corporate shuttle — Bole to Meskel Square",
        unitAmount: 355,
        farePlanId: refs.farePlan.id,
        distanceKm: 7.5,
        durationMinutes: 19,
      },
    }),
  ]);

  console.log("[Seed] Billing demo ready");
  console.log(`[Seed]   Customer login: ${DEMO_CUSTOMER.email} / ${DEMO_CUSTOMER.password}`);
  console.log(`[Seed]   Contracts: ${monthlyContract.referenceNumber}, ${perTripContract.referenceNumber}`);
  console.log(
    `[Seed]   Ride requests: 3 on-demand + 2 open contract trips + 4 invoiced contract trips + 1 per-trip completed`,
  );
  console.log(
    `[Seed]   Invoices: ${Object.values(DEMO_INVOICE_REFS).join(", ")} (draft, issued, paid, void)`,
  );
  console.log(
    `[Seed]   Enrollment periods: ${[
      formatContractDate(threeMonthsAgoStart),
      formatContractDate(twoMonthsAgoStart),
      formatContractDate(previousMonthStart),
      formatContractDate(currentMonthStart),
    ].join(", ")}`,
  );
}
