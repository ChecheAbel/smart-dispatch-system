import type { AccountActivation, AccountStatus, Prisma } from "../generated/prisma";
import { prisma } from "../db/prisma";

export type CreateUserInput = {
  email: string;
  passwordHash: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  mobileNumber: string;
  accountStatus?: AccountStatus;
  accountActivation?: AccountActivation;
};

export type UpdateUserInput = {
  email?: string;
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  mobileNumber?: string;
  accountStatus?: AccountStatus;
  accountActivation?: AccountActivation;
};

export type ListUsersFilter = {
  search?: string;
  accountStatus?: AccountStatus;
  accountActivation?: AccountActivation;
  roleSlug?: string;
};

const userWithRelationsInclude = {
  authRoles: {
    include: { role: true },
    orderBy: { role: { slug: "asc" as const } },
  },
  driverProfile: true,
} satisfies Prisma.UserInclude;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function buildUserWhere(filter?: ListUsersFilter): Prisma.UserWhereInput {
  if (!filter) return {};

  const where: Prisma.UserWhereInput = {};

  if (filter.accountStatus) {
    where.accountStatus = filter.accountStatus;
  }

  if (filter.accountActivation) {
    where.accountActivation = filter.accountActivation;
  }

  if (filter.search?.trim()) {
    const search = filter.search.trim();
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { firstName: { contains: search, mode: "insensitive" } },
      { middleName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { mobileNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  if (filter.roleSlug?.trim()) {
    where.authRoles = {
      some: {
        role: {
          slug: filter.roleSlug.trim().toLowerCase(),
        },
      },
    };
  }

  return where;
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
  });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function findUserByMobileNumber(mobileNumber: string) {
  return prisma.user.findUnique({
    where: { mobileNumber: mobileNumber.trim() },
  });
}

export async function findUserByIdWithRoles(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: userWithRelationsInclude,
  });
}

export async function listUsers(
  filter?: ListUsersFilter,
  options?: { skip?: number; take?: number },
) {
  const where = buildUserWhere(filter);

  return prisma.user.findMany({
    where,
    skip: options?.skip,
    take: options?.take,
    orderBy: { createdAt: "desc" },
    include: userWithRelationsInclude,
  });
}

export async function countUsers(filter?: ListUsersFilter) {
  return prisma.user.count({ where: buildUserWhere(filter) });
}

export async function createUser(input: CreateUserInput) {
  return prisma.user.create({
    data: {
      email: normalizeEmail(input.email),
      passwordHash: input.passwordHash,
      firstName: input.firstName.trim(),
      middleName: input.middleName?.trim() || null,
      lastName: input.lastName.trim(),
      mobileNumber: input.mobileNumber.trim(),
      accountStatus: input.accountStatus,
      accountActivation: input.accountActivation,
    },
    include: userWithRelationsInclude,
  });
}

export async function updateUser(userId: string, input: UpdateUserInput) {
  const data: Prisma.UserUpdateInput = {};

  if (input.email !== undefined) data.email = normalizeEmail(input.email);
  if (input.firstName !== undefined) data.firstName = input.firstName.trim();
  if (input.middleName !== undefined) data.middleName = input.middleName?.trim() || null;
  if (input.lastName !== undefined) data.lastName = input.lastName.trim();
  if (input.mobileNumber !== undefined) data.mobileNumber = input.mobileNumber.trim();
  if (input.accountStatus !== undefined) data.accountStatus = input.accountStatus;
  if (input.accountActivation !== undefined) data.accountActivation = input.accountActivation;

  return prisma.user.update({
    where: { id: userId },
    data,
    include: userWithRelationsInclude,
  });
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

export async function updateUserAccountStatus(userId: string, accountStatus: AccountStatus) {
  return prisma.user.update({
    where: { id: userId },
    data: { accountStatus },
    include: userWithRelationsInclude,
  });
}

export async function updateUserAccountActivation(
  userId: string,
  accountActivation: AccountActivation,
) {
  return prisma.user.update({
    where: { id: userId },
    data: { accountActivation },
    include: userWithRelationsInclude,
  });
}

export async function listDrivers(options?: { search?: string; take?: number }) {
  return listUsers(
    {
      roleSlug: "driver",
      accountStatus: "active",
      accountActivation: "activated",
      search: options?.search,
    },
    { skip: 0, take: options?.take ?? 200 },
  );
}

export async function deleteUser(userId: string) {
  return prisma.user.delete({ where: { id: userId } });
}
