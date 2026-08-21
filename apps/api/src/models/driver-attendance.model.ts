import type { DriverAttendanceStatus, Prisma } from "../generated/prisma";
import { prisma } from "../db/prisma";
import { workDateToDate } from "../utils/validation";

export type DriverAttendanceRosterFilter = {
  workDate: string;
  search?: string;
  status?: DriverAttendanceStatus | "unmarked";
};

const hiredDriverWhere: Prisma.UserWhereInput = {
  accountActivation: "activated",
  accountStatus: { in: ["active", "suspended"] },
  authRoles: {
    some: {
      role: { slug: "driver" },
    },
  },
};

const attendanceInclude = {
  recordedBy: {
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
    },
  },
} satisfies Prisma.DriverAttendanceInclude;

const rosterDriverInclude = {
  assignedVehicle: {
    select: {
      id: true,
      plateNumber: true,
      make: true,
      model: true,
    },
  },
} satisfies Prisma.UserInclude;

function buildRosterWhere(filter: DriverAttendanceRosterFilter): Prisma.UserWhereInput {
  const workDate = workDateToDate(filter.workDate);
  const where: Prisma.UserWhereInput = { ...hiredDriverWhere };

  if (filter.search?.trim()) {
    const search = filter.search.trim();
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { firstName: { contains: search, mode: "insensitive" } },
      { middleName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { mobileNumber: { contains: search, mode: "insensitive" } },
      {
        driverProfile: {
          is: { licenseNumber: { contains: search, mode: "insensitive" } },
        },
      },
    ];
  }

  if (filter.status === "unmarked") {
    where.driverAttendances = { none: { workDate } };
  } else if (filter.status) {
    where.driverAttendances = {
      some: { workDate, status: filter.status },
    };
  }

  return where;
}

export async function findHiredDriverById(userId: string) {
  return prisma.user.findFirst({
    where: {
      id: userId,
      ...hiredDriverWhere,
    },
    include: rosterDriverInclude,
  });
}

export async function listDriverAttendanceRoster(
  filter: DriverAttendanceRosterFilter,
  options?: { skip?: number; take?: number },
) {
  const workDate = workDateToDate(filter.workDate);
  const where = buildRosterWhere(filter);

  const drivers = await prisma.user.findMany({
    where,
    skip: options?.skip,
    take: options?.take,
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    include: rosterDriverInclude,
  });

  const driverIds = drivers.map((driver) => driver.id);
  const records = driverIds.length
    ? await prisma.driverAttendance.findMany({
        where: { driverUserId: { in: driverIds }, workDate },
        include: attendanceInclude,
      })
    : [];

  const byDriverId = new Map(records.map((record) => [record.driverUserId, record]));

  return drivers.map((driver) => ({
    driver,
    attendance: byDriverId.get(driver.id) ?? null,
  }));
}

export async function countDriverAttendanceRoster(filter: DriverAttendanceRosterFilter) {
  return prisma.user.count({ where: buildRosterWhere(filter) });
}

export async function getDriverAttendanceSummary(workDate: string) {
  const date = workDateToDate(workDate);
  const [totalDrivers, grouped] = await Promise.all([
    prisma.user.count({ where: hiredDriverWhere }),
    prisma.driverAttendance.groupBy({
      by: ["status"],
      where: {
        workDate: date,
        driver: hiredDriverWhere,
      },
      _count: { _all: true },
    }),
  ]);

  const counts = {
    present: 0,
    absent: 0,
    late: 0,
    on_leave: 0,
    off_duty: 0,
  };

  for (const row of grouped) {
    counts[row.status] = row._count._all;
  }

  const marked = Object.values(counts).reduce((sum, value) => sum + value, 0);

  return {
    work_date: workDate,
    total_drivers: totalDrivers,
    ...counts,
    unmarked: Math.max(totalDrivers - marked, 0),
  };
}

export async function findDriverAttendanceById(id: string) {
  return prisma.driverAttendance.findUnique({
    where: { id },
    include: attendanceInclude,
  });
}

export async function findDriverAttendanceByDriverAndDate(driverUserId: string, workDate: string) {
  return prisma.driverAttendance.findUnique({
    where: {
      driverUserId_workDate: {
        driverUserId,
        workDate: workDateToDate(workDate),
      },
    },
    include: attendanceInclude,
  });
}

export async function upsertDriverAttendance(input: {
  driverUserId: string;
  workDate: string;
  status: DriverAttendanceStatus;
  checkInAt?: Date | null;
  checkOutAt?: Date | null;
  notes?: string | null;
  recordedByUserId?: string | null;
}) {
  return prisma.driverAttendance.upsert({
    where: {
      driverUserId_workDate: {
        driverUserId: input.driverUserId,
        workDate: workDateToDate(input.workDate),
      },
    },
    create: {
      driverUserId: input.driverUserId,
      workDate: workDateToDate(input.workDate),
      status: input.status,
      checkInAt: input.checkInAt,
      checkOutAt: input.checkOutAt,
      notes: input.notes?.trim() || null,
      recordedByUserId: input.recordedByUserId,
    },
    update: {
      status: input.status,
      checkInAt: input.checkInAt,
      checkOutAt: input.checkOutAt,
      notes: input.notes === undefined ? undefined : input.notes?.trim() || null,
      recordedByUserId: input.recordedByUserId,
    },
    include: attendanceInclude,
  });
}

export async function deleteDriverAttendance(id: string) {
  await prisma.driverAttendance.delete({ where: { id } });
}
