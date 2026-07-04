import { prisma } from "../db/prisma";

export type CreateDriverProfileInput = {
  userId: string;
  licenseNumber: string;
  licensePhotoUrl: string;
};

function normalizeLicenseNumber(licenseNumber: string) {
  return licenseNumber.trim().toUpperCase();
}

export async function findDriverByLicenseNumber(licenseNumber: string) {
  return prisma.driver.findUnique({
    where: { licenseNumber: normalizeLicenseNumber(licenseNumber) },
  });
}

export async function findDriverByUserId(userId: string) {
  return prisma.driver.findUnique({ where: { userId } });
}

export async function createDriverProfile(input: CreateDriverProfileInput) {
  return prisma.driver.create({
    data: {
      userId: input.userId,
      licenseNumber: normalizeLicenseNumber(input.licenseNumber),
      licensePhotoUrl: input.licensePhotoUrl.trim(),
    },
  });
}
