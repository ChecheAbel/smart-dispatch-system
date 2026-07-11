import bcrypt from "bcrypt";
import type {
  ContractBillingInterval,
  ContractStatus,
  InvoiceStatus,
  RideRequestStatus,
} from "@smart-dispatch/types";
import { prisma } from "../db/prisma";
import { VehicleStatus } from "../generated/prisma";
import {
  calculateEnrollmentEndDate,
  toUtcDateOnly,
} from "../models/contract-enrollment.model";
import { formatContractDate } from "../models/contract.model";

const SEED_MARKER = "[seed:billing-demo]";

const DEMO_CONTRACT_REFS = {
  draft: "CTR-DEMO-DRAFT",
  monthly: "CTR-DEMO-MONTHLY",
  perTrip: "CTR-DEMO-PERTRIP",
  expired: "CTR-DEMO-EXPIRED",
  cancelled: "CTR-DEMO-CANCELLED",
} as const;

const DEMO_INVOICE_REFS: Record<InvoiceStatus, string> = {
  draft: "INV-DEMO-DRAFT",
  issued: "INV-DEMO-ISSUED",
  paid: "INV-DEMO-PAID",
  void: "INV-DEMO-VOID",
};

const LEGACY_CUSTOMER_EMAIL = "red@cheche.et";

const DEMO_CUSTOMER = {
  email: process.env.SEED_CUSTOMER_EMAIL?.trim().toLowerCase() ?? "red@gmail.com",
  password: process.env.SEED_CUSTOMER_PASSWORD ?? "DemoCustomer1!",
  firstName: process.env.SEED_CUSTOMER_FIRST_NAME ?? "Red",
  middleName: process.env.SEED_CUSTOMER_MIDDLE_NAME?.trim() || null,
  lastName: process.env.SEED_CUSTOMER_LAST_NAME ?? "Customer",
  mobileNumber: process.env.SEED_CUSTOMER_MOBILE ?? "+251911000001",
  organizationName: "Cheche Demo Industries",
} as const;

const DEMO_DRIVER = {
  email: process.env.SEED_DRIVER_EMAIL?.trim().toLowerCase() ?? "driver@gmail.com",
  password: process.env.SEED_DRIVER_PASSWORD ?? "DemoDriver1!",
  firstName: process.env.SEED_DRIVER_FIRST_NAME ?? "Demo",
  lastName: process.env.SEED_DRIVER_LAST_NAME ?? "Driver",
  mobileNumber: process.env.SEED_DRIVER_MOBILE ?? "+251911000002",
  licenseNumber: process.env.SEED_DRIVER_LICENSE ?? "ET-DEMO-DRIVER-001",
} as const;

const RIDE_REQUEST_STATUSES: RideRequestStatus[] = [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
];

function seedNote(key: string) {
  return `${SEED_MARKER} ${key}`;
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
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function atUtcNoon(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0),
  );
}

function findDemoContractRefs() {
  return Object.values(DEMO_CONTRACT_REFS);
}

async function findDemoContracts() {
  return prisma.contract.findMany({
    where: { referenceNumber: { in: findDemoContractRefs() } },
  });
}

async function resolveDemoCustomerId() {
  const byEmail = await prisma.user.findUnique({
    where: { email: DEMO_CUSTOMER.email },
    select: { id: true },
  });
  if (byEmail) return byEmail.id;

  const legacy = await prisma.user.findUnique({
    where: { email: LEGACY_CUSTOMER_EMAIL },
    select: { id: true },
  });
  if (legacy) {
    const updated = await prisma.user.update({
      where: { id: legacy.id },
      data: { email: DEMO_CUSTOMER.email },
      select: { id: true },
    });
    return updated.id;
  }

  return null;
}

export async function clearBillingDemoData() {
  const demoContracts = await findDemoContracts();
  const contractIds = demoContracts.map((contract) => contract.id);
  const customerId = await resolveDemoCustomerId();

  const rideWhere = {
    OR: [
      { notes: { startsWith: SEED_MARKER } },
      ...(contractIds.length ? [{ contractId: { in: contractIds } }] : []),
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
      ...(customerId ? [{ requesterUserId: customerId }] : []),
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
}

export async function runClearBillingDemo() {
  await clearBillingDemoData();
  console.log("[Seed] Billing demo data removed (ride requests, contracts, invoices)");
}

async function ensureDemoCustomer() {
  const userRole = await prisma.role.findUnique({ where: { slug: "user" } });
  if (!userRole) {
    throw new Error('[Seed] Role "user" not found. Run pnpm db:seed roles access first.');
  }

  let user = await prisma.user.findUnique({ where: { email: DEMO_CUSTOMER.email } });

  if (!user) {
    const legacy = await prisma.user.findUnique({ where: { email: LEGACY_CUSTOMER_EMAIL } });
    if (legacy) {
      user = await prisma.user.update({
        where: { id: legacy.id },
        data: {
          email: DEMO_CUSTOMER.email,
          firstName: DEMO_CUSTOMER.firstName,
          middleName: DEMO_CUSTOMER.middleName,
          lastName: DEMO_CUSTOMER.lastName,
          mobileNumber: DEMO_CUSTOMER.mobileNumber,
          accountStatus: "active",
          accountActivation: "activated",
        },
      });
    }
  }

  if (!user) {
    const passwordHash = await bcrypt.hash(DEMO_CUSTOMER.password, 12);
    user = await prisma.user.create({
      data: {
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
  } else {
    await prisma.authRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: userRole.id } },
      update: {},
      create: { userId: user.id, roleId: userRole.id },
    });
  }

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

async function ensureDemoDriver(vehicleId: string) {
  const driverRole = await prisma.role.findUnique({ where: { slug: "driver" } });
  if (!driverRole) {
    throw new Error('[Seed] Role "driver" not found. Run pnpm db:seed roles access first.');
  }

  let user = await prisma.user.findUnique({ where: { email: DEMO_DRIVER.email } });

  if (!user) {
    const passwordHash = await bcrypt.hash(DEMO_DRIVER.password, 12);
    user = await prisma.user.create({
      data: {
        email: DEMO_DRIVER.email,
        passwordHash,
        firstName: DEMO_DRIVER.firstName,
        lastName: DEMO_DRIVER.lastName,
        mobileNumber: DEMO_DRIVER.mobileNumber,
        accountStatus: "active",
        accountActivation: "activated",
        authRoles: {
          create: { roleId: driverRole.id },
        },
      },
    });
  } else {
    await prisma.authRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: driverRole.id } },
      update: {},
      create: { userId: user.id, roleId: driverRole.id },
    });
  }

  await prisma.driver.upsert({
    where: { userId: user.id },
    update: { licenseNumber: DEMO_DRIVER.licenseNumber },
    create: {
      userId: user.id,
      licenseNumber: DEMO_DRIVER.licenseNumber,
    },
  });

  await prisma.vehicle.updateMany({
    where: { assignedDriverUserId: user.id, id: { not: vehicleId } },
    data: { assignedDriverUserId: null },
  });

  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { assignedDriverUserId: user.id },
  });

  return user;
}

type SeedRefs = Awaited<ReturnType<typeof loadReferenceData>>;

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
        where: { status: VehicleStatus.active, vehicleType: { slug: "sedan" } },
        orderBy: { plateNumber: "asc" },
      }),
      prisma.user.findFirst({
        where: { authRoles: { some: { role: { slug: "admin" } } } },
        orderBy: { createdAt: "asc" },
      }),
    ]);

  if (!region || !vehicleType || !vehicleClass || !farePlan || !pickupLocation || !dropoffLocation || !vehicle) {
    throw new Error(
      "[Seed] Missing reference data for billing demo. Run full seed through vehicles, locations, and fare-plans first.",
    );
  }

  const driverUser = await ensureDemoDriver(vehicle.id);

  return {
    region,
    vehicleType,
    vehicleClass,
    farePlan,
    pickupLocation,
    dropoffLocation,
    vehicle,
    driverUser,
    adminUser,
  };
}

type RideRequestSeedInput = {
  key: string;
  requesterUserId: string;
  contractId?: string | null;
  status: RideRequestStatus;
  scheduledAt: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
  farePlanId: string;
  billableAmount: number;
  distanceKm: number;
  durationMinutes: number;
  refs: SeedRefs;
};

function isAssignedStatus(status: RideRequestStatus) {
  return status === "confirmed" || status === "in_progress" || status === "completed";
}

async function createRideRequest(input: RideRequestSeedInput) {
  const pickupAddress = input.refs.pickupLocation.address ?? "Bole, Addis Ababa";
  const dropoffAddress = input.refs.dropoffLocation.address ?? "Meskel Square, Addis Ababa";
  const assigned = isAssignedStatus(input.status);
  const tripDay = atUtcNoon(input.scheduledAt);

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
      billableCurrency: input.billableAmount > 0 ? "ETB" : null,
      assignedVehicleId: assigned ? input.refs.vehicle.id : null,
      assignedDriverUserId: assigned ? input.refs.driverUser.id : null,
      assignedAt: assigned ? addUtcDays(tripDay, -1) : null,
      startedAt:
        input.startedAt ??
        (input.status === "in_progress" || input.status === "completed" ? tripDay : null),
      completedAt: input.completedAt ?? (input.status === "completed" ? tripDay : null),
    },
  });
}

async function ensureDemoContract(input: {
  referenceNumber: string;
  title: string;
  status: ContractStatus;
  billingInterval: ContractBillingInterval;
  paymentTermsDays: number | null;
  refs: SeedRefs;
  seedKey: string;
}) {
  return prisma.contract.upsert({
    where: { referenceNumber: input.referenceNumber },
    update: {
      title: input.title,
      status: input.status,
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
      status: input.status,
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

async function clearDemoEnrollments(contractIds: string[]) {
  if (!contractIds.length) return 0;

  const result = await prisma.contractEnrollment.deleteMany({
    where: { contractId: { in: contractIds } },
  });
  return result.count;
}

async function ensureEnrollment(input: {
  contractId: string;
  requesterUserId: string;
  startsAt: Date;
  billingInterval: ContractBillingInterval;
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

  if (existing) return existing;

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

function rideScheduleOffset(status: RideRequestStatus, index: number) {
  switch (status) {
    case "pending":
      return 2 + index;
    case "confirmed":
      return 1 + index;
    case "in_progress":
      return 0;
    case "completed":
      return -(2 + index);
    case "cancelled":
      return -(5 + index);
    default:
      return index;
  }
}

function billableForStatus(status: RideRequestStatus, index: number) {
  if (status !== "completed") {
    return { billableAmount: 0, distanceKm: 0, durationMinutes: 0 };
  }

  const base = 350 + index * 45;
  return {
    billableAmount: base,
    distanceKm: 7 + index * 1.5,
    durationMinutes: 18 + index * 4,
  };
}

async function clearDemoRideRequests(input: { contractIds: string[] }) {
  const rides = await prisma.rideRequest.findMany({
    where: {
      OR: [
        { notes: { startsWith: SEED_MARKER } },
        ...(input.contractIds.length ? [{ contractId: { in: input.contractIds } }] : []),
      ],
    },
    select: { id: true },
  });

  const rideIds = rides.map((ride) => ride.id);
  if (!rideIds.length) return 0;

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
  if (!invoiceIds.length) return 0;

  await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
  const result = await prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
  return result.count;
}

export async function seedBillingDemo() {
  if (process.env.SEED_BILLING_DEMO_RESET === "true") {
    await clearBillingDemoData();
    console.log("[Seed] Cleared previous billing demo data");
  }

  const refs = await loadReferenceData();
  const customer = await ensureDemoCustomer();
  const existingContracts = await findDemoContracts();
  const contractIds = existingContracts.map((contract) => contract.id);

  const removedRides = await clearDemoRideRequests({ contractIds });
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

  const [draftContract, monthlyContract, perTripContract, expiredContract, cancelledContract] =
    await Promise.all([
      ensureDemoContract({
        referenceNumber: DEMO_CONTRACT_REFS.draft,
        title: "Demo Draft Agreement",
        status: "draft",
        billingInterval: "monthly",
        paymentTermsDays: 30,
        refs,
        seedKey: "contract-draft",
      }),
      ensureDemoContract({
        referenceNumber: DEMO_CONTRACT_REFS.monthly,
        title: "Demo Corporate Shuttle Agreement",
        status: "active",
        billingInterval: "monthly",
        paymentTermsDays: 30,
        refs,
        seedKey: "contract-monthly",
      }),
      ensureDemoContract({
        referenceNumber: DEMO_CONTRACT_REFS.perTrip,
        title: "Demo Executive Per-Trip Agreement",
        status: "active",
        billingInterval: "per_trip",
        paymentTermsDays: null,
        refs,
        seedKey: "contract-per-trip",
      }),
      ensureDemoContract({
        referenceNumber: DEMO_CONTRACT_REFS.expired,
        title: "Demo Expired Agreement",
        status: "expired",
        billingInterval: "quarterly",
        paymentTermsDays: 30,
        refs,
        seedKey: "contract-expired",
      }),
      ensureDemoContract({
        referenceNumber: DEMO_CONTRACT_REFS.cancelled,
        title: "Demo Cancelled Agreement",
        status: "cancelled",
        billingInterval: "annually",
        paymentTermsDays: 45,
        refs,
        seedKey: "contract-cancelled",
      }),
    ]);

  void draftContract;
  void expiredContract;
  void cancelledContract;

  let rideIndex = 0;
  const rideRequests = [];

  for (const status of RIDE_REQUEST_STATUSES) {
    const billing = billableForStatus(status, rideIndex);
    rideRequests.push(
      await createRideRequest({
        key: `ondemand-${status}`,
        requesterUserId: customer.id,
        status,
        scheduledAt: atUtcNoon(addUtcDays(today, rideScheduleOffset(status, rideIndex))),
        farePlanId: refs.farePlan.id,
        ...billing,
        refs,
      }),
    );
    rideIndex += 1;

    const contractBilling = billableForStatus(status, rideIndex);
    rideRequests.push(
      await createRideRequest({
        key: `contract-${status}`,
        requesterUserId: customer.id,
        contractId: monthlyContract.id,
        status,
        scheduledAt: atUtcNoon(addUtcDays(today, rideScheduleOffset(status, rideIndex))),
        farePlanId: refs.farePlan.id,
        ...contractBilling,
        refs,
      }),
    );
    rideIndex += 1;
  }

  const invoiceTripConfigs = [
    { key: "invoice-draft-trip", monthStart: currentMonthStart, amount: 412, km: 10.4, mins: 28 },
    { key: "invoice-issued-trip", monthStart: previousMonthStart, amount: 468.75, km: 12.1, mins: 31 },
    { key: "invoice-paid-trip", monthStart: twoMonthsAgoStart, amount: 521.25, km: 14.3, mins: 35 },
    { key: "invoice-void-trip", monthStart: threeMonthsAgoStart, amount: 355, km: 7.5, mins: 19 },
  ] as const;

  const invoiceTrips = await Promise.all(
    invoiceTripConfigs.map((trip, index) =>
      createRideRequest({
        key: trip.key,
        requesterUserId: customer.id,
        contractId: monthlyContract.id,
        status: "completed",
        scheduledAt: atUtcNoon(addUtcDays(trip.monthStart, 5 + index)),
        farePlanId: refs.farePlan.id,
        billableAmount: trip.amount,
        distanceKm: trip.km,
        durationMinutes: trip.mins,
        refs,
      }),
    ),
  );

  await createRideRequest({
    key: "per-trip-completed",
    requesterUserId: customer.id,
    contractId: perTripContract.id,
    status: "completed",
    scheduledAt: atUtcNoon(addUtcDays(today, -5)),
    farePlanId: refs.farePlan.id,
    billableAmount: 620,
    distanceKm: 16.8,
    durationMinutes: 40,
    refs,
  });

  await createRideRequest({
    key: "per-trip-completed-prior",
    requesterUserId: customer.id,
    contractId: perTripContract.id,
    status: "completed",
    scheduledAt: atUtcNoon(addUtcDays(today, -20)),
    farePlanId: refs.farePlan.id,
    billableAmount: 540,
    distanceKm: 14.2,
    durationMinutes: 34,
    refs,
  });

  const demoContractIds = [
    draftContract.id,
    monthlyContract.id,
    perTripContract.id,
    expiredContract.id,
    cancelledContract.id,
  ];

  const removedEnrollments = await clearDemoEnrollments(demoContractIds);
  if (removedEnrollments > 0) {
    console.log(`[Seed] Removed ${removedEnrollments} existing demo enrollment(s)`);
  }

  const quarterlyStarts = [
    startOfUtcMonth(addUtcMonths(today, -9)),
    startOfUtcMonth(addUtcMonths(today, -6)),
    startOfUtcMonth(addUtcMonths(today, -3)),
  ];

  const enrollmentPlans: Array<{
    contractId: string;
    startsAt: Date;
    billingInterval: ContractBillingInterval;
  }> = [
    ...[threeMonthsAgoStart, twoMonthsAgoStart, previousMonthStart, currentMonthStart].map((startsAt) => ({
      contractId: monthlyContract.id,
      startsAt,
      billingInterval: "monthly" as const,
    })),
    {
      contractId: perTripContract.id,
      startsAt: toUtcDateOnly(addUtcDays(today, -5)),
      billingInterval: "per_trip",
    },
    {
      contractId: perTripContract.id,
      startsAt: toUtcDateOnly(addUtcDays(today, -20)),
      billingInterval: "per_trip",
    },
    ...quarterlyStarts.map((startsAt) => ({
      contractId: expiredContract.id,
      startsAt,
      billingInterval: "quarterly" as const,
    })),
    {
      contractId: cancelledContract.id,
      startsAt: startOfUtcMonth(addUtcMonths(today, -8)),
      billingInterval: "annually",
    },
  ];

  const enrollments = await Promise.all(
    enrollmentPlans.map((plan) =>
      ensureEnrollment({
        contractId: plan.contractId,
        requesterUserId: customer.id,
        startsAt: plan.startsAt,
        billingInterval: plan.billingInterval,
      }),
    ),
  );

  const findMonthlyEnrollment = (startsAt: Date) => {
    const day = toUtcDateOnly(startsAt).getTime();
    const match = enrollments.find(
      (enrollment) =>
        enrollment.contractId === monthlyContract.id &&
        toUtcDateOnly(enrollment.startsAt).getTime() === day,
    );
    if (!match) {
      throw new Error(`Missing monthly enrollment for ${formatContractDate(startsAt)}`);
    }
    return match;
  };

  const currentEnrollment = findMonthlyEnrollment(currentMonthStart);
  const previousEnrollment = findMonthlyEnrollment(previousMonthStart);
  const twoMonthsEnrollment = findMonthlyEnrollment(twoMonthsAgoStart);
  const threeMonthsEnrollment = findMonthlyEnrollment(threeMonthsAgoStart);

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
        rideRequestId: invoiceTrips[0].id,
        description: "Corporate shuttle — Bole to Meskel Square",
        unitAmount: invoiceTripConfigs[0].amount,
        farePlanId: refs.farePlan.id,
        distanceKm: invoiceTripConfigs[0].km,
        durationMinutes: invoiceTripConfigs[0].mins,
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
        rideRequestId: invoiceTrips[1].id,
        description: "Corporate shuttle — Bole to Meskel Square",
        unitAmount: invoiceTripConfigs[1].amount,
        farePlanId: refs.farePlan.id,
        distanceKm: invoiceTripConfigs[1].km,
        durationMinutes: invoiceTripConfigs[1].mins,
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
        rideRequestId: invoiceTrips[2].id,
        description: "Corporate shuttle — Bole to Meskel Square",
        unitAmount: invoiceTripConfigs[2].amount,
        farePlanId: refs.farePlan.id,
        distanceKm: invoiceTripConfigs[2].km,
        durationMinutes: invoiceTripConfigs[2].mins,
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
        rideRequestId: invoiceTrips[3].id,
        description: "Corporate shuttle — Bole to Meskel Square",
        unitAmount: invoiceTripConfigs[3].amount,
        farePlanId: refs.farePlan.id,
        distanceKm: invoiceTripConfigs[3].km,
        durationMinutes: invoiceTripConfigs[3].mins,
      },
    }),
  ]);

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: refs.vehicle.id },
    select: { plateNumber: true, assignedDriverUserId: true },
  });

  console.log("[Seed] Billing demo ready");
  console.log(`[Seed]   Customer: ${DEMO_CUSTOMER.email}`);
  console.log(`[Seed]   Driver: ${DEMO_DRIVER.email} → vehicle ${vehicle?.plateNumber ?? refs.vehicle.id}`);
  console.log(
    `[Seed]   Contracts (${findDemoContractRefs().length} statuses): ${findDemoContractRefs().join(", ")}`,
  );
  console.log(
    `[Seed]   Ride requests: ${rideRequests.length + invoiceTrips.length + 2} total — every status × on-demand + contract, plus invoice/per-trip trips`,
  );
  console.log(
    `[Seed]   Invoices: ${Object.values(DEMO_INVOICE_REFS).join(", ")} (draft, issued, paid, void)`,
  );
  console.log(
    `[Seed]   Customer enrollments: ${enrollments.length} total (monthly ${4}, per-trip ${2}, quarterly ${quarterlyStarts.length}, annual ${1}; draft agreement has none)`,
  );
  console.log(
    `[Seed]   Monthly billing periods: ${[
      formatContractDate(threeMonthsAgoStart),
      formatContractDate(twoMonthsAgoStart),
      formatContractDate(previousMonthStart),
      formatContractDate(currentMonthStart),
    ].join(", ")}`,
  );
}
