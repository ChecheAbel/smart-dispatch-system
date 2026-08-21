import { prisma } from "../db/prisma";

export class DriverProfileError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = "DriverProfileError";
  }
}

export type CreateDriverProfileInput = {
  userId: string;
  licenseNumber: string;
  licensePhotoUrl?: string | null;
  licensePhotoBackUrl?: string | null;
};

export type UpsertDriverProfileInput = CreateDriverProfileInput;

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
      licensePhotoUrl: input.licensePhotoUrl?.trim() || null,
      licensePhotoBackUrl: input.licensePhotoBackUrl?.trim() || null,
    },
  });
}

export async function upsertDriverProfile(input: UpsertDriverProfileInput) {
  const licenseNumber = normalizeLicenseNumber(input.licenseNumber);
  const existingByLicense = await findDriverByLicenseNumber(licenseNumber);
  if (existingByLicense && existingByLicense.userId !== input.userId) {
    throw new DriverProfileError("This driver license number is already registered.", 409);
  }

  const existing = await findDriverByUserId(input.userId);
  if (!existing) {
    if (!input.licensePhotoUrl?.trim() || !input.licensePhotoBackUrl?.trim()) {
      throw new DriverProfileError("Front and back driver license photos are required.", 400);
    }

    return createDriverProfile({
      userId: input.userId,
      licenseNumber,
      licensePhotoUrl: input.licensePhotoUrl,
      licensePhotoBackUrl: input.licensePhotoBackUrl,
    });
  }

  return prisma.driver.update({
    where: { userId: input.userId },
    data: {
      licenseNumber,
      ...(input.licensePhotoUrl !== undefined
        ? { licensePhotoUrl: input.licensePhotoUrl?.trim() || existing.licensePhotoUrl }
        : {}),
      ...(input.licensePhotoBackUrl !== undefined
        ? { licensePhotoBackUrl: input.licensePhotoBackUrl?.trim() || existing.licensePhotoBackUrl }
        : {}),
    },
  });
}
