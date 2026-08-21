import type { Prisma } from "../generated/prisma";
import { prisma } from "../db/prisma";
import { formatWorkDate, workDateToDate } from "../utils/validation";

export type DriverShiftRosterFilter = {
  workDate: string;
  search?: string;
  shift?: "unassigned" | string;
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

const assignmentInclude = {
  shiftTemplate: true,
  assignedBy: {
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
    },
  },
} satisfies Prisma.DriverShiftAssignmentInclude;

const DEFAULT_SHIFT_TEMPLATES = [
  { slug: "morning", name: "Morning", startTime: "06:00", endTime: "14:00", sortOrder: 10 },
  { slug: "afternoon", name: "Afternoon", startTime: "14:00", endTime: "22:00", sortOrder: 20 },
  { slug: "night", name: "Night", startTime: "22:00", endTime: "06:00", sortOrder: 30 },
] as const;

export async function ensureDefaultShiftTemplates() {
  const existing = await prisma.driverShiftTemplate.count();
  if (existing > 0) return;

  for (const template of DEFAULT_SHIFT_TEMPLATES) {
    await prisma.driverShiftTemplate.create({
      data: {
        slug: template.slug,
        name: template.name,
        startTime: template.startTime,
        endTime: template.endTime,
        sortOrder: template.sortOrder,
        active: true,
      },
    });
  }
}

function slugFromName(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "shift";
}

async function uniqueShiftSlug(name: string, excludeId?: string) {
  const base = slugFromName(name);
  let slug = base;
  let suffix = 2;

  while (true) {
    const existing = await prisma.driverShiftTemplate.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function findShiftTemplateById(id: string) {
  return prisma.driverShiftTemplate.findUnique({ where: { id } });
}

export async function countAssignmentsForShiftTemplate(shiftTemplateId: string) {
  return prisma.driverShiftAssignment.count({ where: { shiftTemplateId } });
}

export async function createShiftTemplate(input: {
  name: string;
  startTime: string;
  endTime: string;
  sortOrder?: number;
  active?: boolean;
}) {
  const maxSort = await prisma.driverShiftTemplate.aggregate({ _max: { sortOrder: true } });
  return prisma.driverShiftTemplate.create({
    data: {
      slug: await uniqueShiftSlug(input.name),
      name: input.name.trim(),
      startTime: input.startTime,
      endTime: input.endTime,
      sortOrder: input.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 10,
      active: input.active ?? true,
    },
  });
}

export async function updateShiftTemplate(
  id: string,
  input: {
    name?: string;
    startTime?: string;
    endTime?: string;
    sortOrder?: number;
    active?: boolean;
  },
) {
  return prisma.driverShiftTemplate.update({
    where: { id },
    data: {
      name: input.name?.trim(),
      startTime: input.startTime,
      endTime: input.endTime,
      sortOrder: input.sortOrder,
      active: input.active,
    },
  });
}

export async function deleteShiftTemplate(id: string) {
  await prisma.driverShiftTemplate.delete({ where: { id } });
}

export async function listDriverShiftTemplates(activeOnly = true) {
  return prisma.driverShiftTemplate.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function findShiftTemplateByIdOrSlug(value: string) {
  return prisma.driverShiftTemplate.findFirst({
    where: UUID_PATTERN.test(value)
      ? { OR: [{ id: value }, { slug: value }] }
      : { slug: value },
  });
}

function addCalendarDays(workDate: string, days: number) {
  const [year, month, day] = workDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  date.setUTCDate(date.getUTCDate() + days);
  return formatWorkDate(date);
}

export function startOfIsoWeek(workDate: string) {
  const [year, month, day] = workDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const weekday = date.getUTCDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  date.setUTCDate(date.getUTCDate() + diff);
  return formatWorkDate(date);
}

export function isoWeekDates(workDate: string) {
  const start = startOfIsoWeek(workDate);
  return Array.from({ length: 7 }, (_, index) => addCalendarDays(start, index));
}

async function resolveShiftFilterId(shift?: string) {
  if (!shift || shift === "unassigned") return null;
  const template = await findShiftTemplateByIdOrSlug(shift);
  return template?.id ?? null;
}

async function buildRosterWhere(filter: DriverShiftRosterFilter): Promise<Prisma.UserWhereInput> {
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

  if (filter.shift === "unassigned") {
    where.driverShiftAssignments = { none: { workDate } };
  } else if (filter.shift) {
    const shiftTemplateId = await resolveShiftFilterId(filter.shift);
    if (!shiftTemplateId) {
      where.id = { in: [] };
    } else {
      where.driverShiftAssignments = {
        some: { workDate, shiftTemplateId },
      };
    }
  }

  return where;
}

export async function listDriverShiftRoster(
  filter: DriverShiftRosterFilter,
  options?: { skip?: number; take?: number },
) {
  const workDate = workDateToDate(filter.workDate);
  const where = await buildRosterWhere(filter);

  const drivers = await prisma.user.findMany({
    where,
    skip: options?.skip,
    take: options?.take,
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    include: rosterDriverInclude,
  });

  const driverIds = drivers.map((driver) => driver.id);
  const records = driverIds.length
    ? await prisma.driverShiftAssignment.findMany({
        where: { driverUserId: { in: driverIds }, workDate },
        include: assignmentInclude,
      })
    : [];

  const byDriverId = new Map(records.map((record) => [record.driverUserId, record]));

  return drivers.map((driver) => ({
    driver,
    assignment: byDriverId.get(driver.id) ?? null,
  }));
}

export async function countDriverShiftRoster(filter: DriverShiftRosterFilter) {
  return prisma.user.count({ where: await buildRosterWhere(filter) });
}

export async function getDriverShiftSummary(workDate: string) {
  const date = workDateToDate(workDate);
  const [totalDrivers, templates, grouped] = await Promise.all([
    prisma.user.count({ where: hiredDriverWhere }),
    listDriverShiftTemplates(),
    prisma.driverShiftAssignment.groupBy({
      by: ["shiftTemplateId"],
      where: {
        workDate: date,
        driver: hiredDriverWhere,
      },
      _count: { _all: true },
    }),
  ]);

  const counts = new Map(grouped.map((row) => [row.shiftTemplateId, row._count._all]));
  const byShift = templates.map((template) => ({
    template,
    count: counts.get(template.id) ?? 0,
  }));
  const assigned = byShift.reduce((sum, row) => sum + row.count, 0);

  return {
    workDate,
    totalDrivers,
    unassigned: Math.max(totalDrivers - assigned, 0),
    byShift,
  };
}

export async function getDriverShiftWeek(workDate: string, search?: string) {
  const dates = isoWeekDates(workDate);
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  const start = workDateToDate(startDate);
  const end = workDateToDate(endDate);

  const driverWhere: Prisma.UserWhereInput = { ...hiredDriverWhere };
  if (search?.trim()) {
    const term = search.trim();
    driverWhere.OR = [
      { email: { contains: term, mode: "insensitive" } },
      { firstName: { contains: term, mode: "insensitive" } },
      { middleName: { contains: term, mode: "insensitive" } },
      { lastName: { contains: term, mode: "insensitive" } },
      { mobileNumber: { contains: term, mode: "insensitive" } },
      {
        driverProfile: {
          is: { licenseNumber: { contains: term, mode: "insensitive" } },
        },
      },
    ];
  }

  const [templates, totalDrivers, drivers, assignments] = await Promise.all([
    listDriverShiftTemplates(),
    prisma.user.count({ where: hiredDriverWhere }),
    prisma.user.findMany({
      where: driverWhere,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      include: rosterDriverInclude,
    }),
    prisma.driverShiftAssignment.findMany({
      where: {
        workDate: { gte: start, lte: end },
        driver: hiredDriverWhere,
      },
      include: assignmentInclude,
    }),
  ]);

  const countsByDate = new Map<string, Map<string, number>>();
  for (const date of dates) {
    countsByDate.set(date, new Map());
  }

  for (const assignment of assignments) {
    const dateKey = formatWorkDate(assignment.workDate);
    const byTemplate = countsByDate.get(dateKey);
    if (!byTemplate) continue;
    byTemplate.set(
      assignment.shiftTemplateId,
      (byTemplate.get(assignment.shiftTemplateId) ?? 0) + 1,
    );
  }

  const days = dates.map((date) => {
    const byTemplate = countsByDate.get(date) ?? new Map();
    const byShift = templates.map((template) => ({
      templateId: template.id,
      slug: template.slug,
      count: byTemplate.get(template.id) ?? 0,
    }));
    const assigned = byShift.reduce((sum, row) => sum + row.count, 0);
    return {
      workDate: date,
      assigned,
      unassigned: Math.max(totalDrivers - assigned, 0),
      byShift,
    };
  });

  const assignmentsByDriver = new Map<string, typeof assignments>();
  for (const assignment of assignments) {
    const list = assignmentsByDriver.get(assignment.driverUserId) ?? [];
    list.push(assignment);
    assignmentsByDriver.set(assignment.driverUserId, list);
  }

  const roster = drivers.map((driver) => {
    const records = assignmentsByDriver.get(driver.id) ?? [];
    return {
      driver,
      assignments: Object.fromEntries(
        records.map((record) => [formatWorkDate(record.workDate), record]),
      ),
    };
  });

  return {
    startDate,
    endDate,
    templates,
    days,
    roster,
  };
}

export async function findDriverShiftAssignmentById(id: string) {
  return prisma.driverShiftAssignment.findUnique({
    where: { id },
    include: assignmentInclude,
  });
}

export async function upsertDriverShiftAssignment(input: {
  driverUserId: string;
  workDate: string;
  shiftTemplateId: string;
  notes?: string | null;
  assignedByUserId?: string | null;
}) {
  return prisma.driverShiftAssignment.upsert({
    where: {
      driverUserId_workDate: {
        driverUserId: input.driverUserId,
        workDate: workDateToDate(input.workDate),
      },
    },
    create: {
      driverUserId: input.driverUserId,
      workDate: workDateToDate(input.workDate),
      shiftTemplateId: input.shiftTemplateId,
      notes: input.notes?.trim() || null,
      assignedByUserId: input.assignedByUserId,
    },
    update: {
      shiftTemplateId: input.shiftTemplateId,
      notes: input.notes === undefined ? undefined : input.notes?.trim() || null,
      assignedByUserId: input.assignedByUserId,
    },
    include: assignmentInclude,
  });
}

export async function deleteDriverShiftAssignment(id: string) {
  await prisma.driverShiftAssignment.delete({ where: { id } });
}

export async function deleteDriverShiftAssignmentByDriverAndDate(
  driverUserId: string,
  workDate: string,
) {
  const existing = await prisma.driverShiftAssignment.findUnique({
    where: {
      driverUserId_workDate: {
        driverUserId,
        workDate: workDateToDate(workDate),
      },
    },
  });

  if (!existing) return null;
  await prisma.driverShiftAssignment.delete({ where: { id: existing.id } });
  return existing;
}
