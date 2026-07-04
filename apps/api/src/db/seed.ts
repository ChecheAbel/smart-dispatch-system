import bcrypt from "bcrypt";
import { prisma } from "../db/prisma";
import { roleTranslationInputsToMap } from "../types/role-translations";
import type { Prisma } from "../generated/prisma";

const DEFAULT_ROLES = [
  {
    slug: "admin",
    translations: [
      { locale: "en", name: "Administrator", description: "Full platform access" },
      { locale: "am", name: "አስተዳዳሪ", description: "ሙሉ የመድረክ መዳረሻ" },
    ],
  },
  {
    slug: "dispatcher",
    translations: [
      { locale: "en", name: "Dispatcher", description: "Dispatch and fleet operations" },
      { locale: "am", name: "ዲስፓቸር", description: "የዲስፓች እና የመኪና አስተዳደር ስራዎች" },
    ],
  },
  {
    slug: "driver",
    translations: [
      { locale: "en", name: "Driver", description: "Driver mobile access" },
      { locale: "am", name: "አሽከርካሪ", description: "የአሽከርካሪ ሞባይል መዳረሻ" },
    ],
  },
] as const;

async function seedRoles() {
  for (const role of DEFAULT_ROLES) {
    const translations = roleTranslationInputsToMap(
      role.translations.map((translation) => ({ ...translation })),
    ) as Prisma.InputJsonValue;

    await prisma.role.upsert({
      where: { slug: role.slug },
      update: { translations },
      create: {
        slug: role.slug,
        translations,
      },
    });
  }
}

async function seedAdminUser() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const firstName = process.env.SEED_ADMIN_FIRST_NAME ?? "System";
  const middleName = process.env.SEED_ADMIN_MIDDLE_NAME?.trim() || null;
  const lastName = process.env.SEED_ADMIN_LAST_NAME ?? "Administrator";
  const mobileNumber = process.env.SEED_ADMIN_MOBILE ?? "+251900000000";

  if (!email || !password) return;

  const adminRole = await prisma.role.findUnique({ where: { slug: "admin" } });
  if (!adminRole) return;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.authRole.upsert({
      where: {
        userId_roleId: {
          userId: existing.id,
          roleId: adminRole.id,
        },
      },
      update: {},
      create: {
        userId: existing.id,
        roleId: adminRole.id,
      },
    });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      middleName,
      lastName,
      mobileNumber,
      accountStatus: "active",
      accountActivation: "activated",
      authRoles: {
        create: { roleId: adminRole.id },
      },
    },
  });

  console.log(`[Seed] Administrator account created for ${email}`);
}

import { seedAccessControl } from "./seed-access";
import { seedNotifications } from "./seed-notifications";
import { seedRegions } from "./seed-regions";
import { seedLocations } from "./seed-locations";
import { seedVehicleTypes } from "./seed-vehicle-types";
import { seedVehicles } from "./seed-vehicles";
import { seedFarePlans } from "./seed-fare-plans";

export async function seedDatabase() {
  await seedRoles();
  await seedAccessControl();
  await seedNotifications();
  await seedRegions();
  await seedLocations();
  await seedVehicleTypes();
  await seedVehicles();
  await seedFarePlans();
  await seedAdminUser();
}
