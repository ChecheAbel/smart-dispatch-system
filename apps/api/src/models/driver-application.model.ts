import type { Prisma } from "../generated/prisma";
import { prisma } from "../db/prisma";

export type ListDriverApplicationsFilter = {
  search?: string;
};

const applicationInclude = {
  authRoles: {
    include: { role: true },
    orderBy: { role: { slug: "asc" as const } },
  },
  driverProfile: true,
} satisfies Prisma.UserInclude;

function buildPendingDriverApplicationWhere(
  filter?: ListDriverApplicationsFilter,
): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {
    accountStatus: "active",
    accountActivation: "pending",
    authRoles: {
      some: {
        role: {
          slug: "driver",
        },
      },
    },
    driverProfile: {
      isNot: null,
    },
  };

  if (filter?.search?.trim()) {
    const search = filter.search.trim();
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { firstName: { contains: search, mode: "insensitive" } },
      { middleName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { mobileNumber: { contains: search, mode: "insensitive" } },
      {
        driverProfile: {
          licenseNumber: { contains: search, mode: "insensitive" },
        },
      },
    ];
  }

  return where;
}

export async function listPendingDriverApplications(
  filter?: ListDriverApplicationsFilter,
  options?: { skip?: number; take?: number },
) {
  return prisma.user.findMany({
    where: buildPendingDriverApplicationWhere(filter),
    skip: options?.skip,
    take: options?.take,
    orderBy: { createdAt: "desc" },
    include: applicationInclude,
  });
}

export async function countPendingDriverApplications(filter?: ListDriverApplicationsFilter) {
  return prisma.user.count({ where: buildPendingDriverApplicationWhere(filter) });
}

export async function findPendingDriverApplicationById(userId: string) {
  return prisma.user.findFirst({
    where: {
      id: userId,
      ...buildPendingDriverApplicationWhere(),
    },
    include: applicationInclude,
  });
}
