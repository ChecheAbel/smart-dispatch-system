import bcrypt from "bcrypt";
import { prisma } from "../db/prisma";
import { roleTranslationInputsToMap } from "../types/role-translations";
import type { Prisma } from "../generated/prisma";
import { seedAccessControl } from "./seed-access";
import { seedNotifications } from "./seed-notifications";
import { seedRegions } from "./seed-regions";
import { seedLocations } from "./seed-locations";
import { seedVehicleTypes } from "./seed-vehicle-types";
import { seedVehicleClasses } from "./seed-vehicle-classes";
import { seedVehicles } from "./seed-vehicles";
import { seedFarePlans } from "./seed-fare-plans";

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

export const SEED_TARGETS = [
  "roles",
  "access",
  "notifications",
  "regions",
  "locations",
  "vehicle-types",
  "vehicle-classes",
  "vehicles",
  "fare-plans",
  "admin",
] as const;

export type SeedTarget = (typeof SEED_TARGETS)[number];

type SeedRunner = {
  label: string;
  run: () => Promise<void>;
  deps: SeedTarget[];
};

const SEED_REGISTRY: Record<SeedTarget, SeedRunner> = {
  roles: {
    label: "roles",
    run: seedRoles,
    deps: [],
  },
  access: {
    label: "access control (permissions, menus, endpoints)",
    run: seedAccessControl,
    deps: ["roles"],
  },
  notifications: {
    label: "notifications",
    run: seedNotifications,
    deps: [],
  },
  regions: {
    label: "regions",
    run: seedRegions,
    deps: [],
  },
  locations: {
    label: "locations",
    run: seedLocations,
    deps: ["regions"],
  },
  "vehicle-types": {
    label: "vehicle types",
    run: seedVehicleTypes,
    deps: [],
  },
  "vehicle-classes": {
    label: "vehicle classes",
    run: seedVehicleClasses,
    deps: [],
  },
  vehicles: {
    label: "vehicles",
    run: seedVehicles,
    deps: ["vehicle-types", "vehicle-classes"],
  },
  "fare-plans": {
    label: "fare plans",
    run: seedFarePlans,
    deps: ["vehicle-types", "vehicle-classes", "regions"],
  },
  admin: {
    label: "admin user",
    run: seedAdminUser,
    deps: ["roles", "access"],
  },
};

const FULL_SEED_ORDER: SeedTarget[] = [
  "roles",
  "access",
  "notifications",
  "regions",
  "locations",
  "vehicle-types",
  "vehicle-classes",
  "vehicles",
  "fare-plans",
  "admin",
];

export function listSeedTargets(): SeedTarget[] {
  return [...SEED_TARGETS];
}

export function printSeedHelp() {
  console.log("Usage: pnpm db:seed [target...]");
  console.log("");
  console.log("Run all seeders when no targets are provided.");
  console.log("Pass one or more targets to seed only those tables (dependencies run first).");
  console.log("");
  console.log("Available targets:");
  for (const target of SEED_TARGETS) {
    const entry = SEED_REGISTRY[target];
    const deps =
      entry.deps.length > 0 ? ` (depends on: ${entry.deps.join(", ")})` : "";
    console.log(`  ${target.padEnd(16)} ${entry.label}${deps}`);
  }
}

function normalizeSeedTarget(value: string): SeedTarget | null {
  const normalized = value.trim().toLowerCase().replaceAll("_", "-");
  return SEED_TARGETS.includes(normalized as SeedTarget)
    ? (normalized as SeedTarget)
    : null;
}

function resolveSeedOrder(targets: SeedTarget[]): SeedTarget[] {
  const order: SeedTarget[] = [];
  const visited = new Set<SeedTarget>();

  function visit(target: SeedTarget) {
    if (visited.has(target)) {
      return;
    }

    for (const dep of SEED_REGISTRY[target].deps) {
      visit(dep);
    }

    visited.add(target);
    order.push(target);
  }

  for (const target of targets) {
    visit(target);
  }

  return order;
}

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

export async function seedDatabase(options?: { targets?: string[] }) {
  const requestedTargets = options?.targets?.length
    ? options.targets
        .map(normalizeSeedTarget)
        .filter((target): target is SeedTarget => target !== null)
    : null;

  if (options?.targets?.length && requestedTargets?.length !== options.targets.length) {
    const invalid = options.targets.filter(
      (target) => normalizeSeedTarget(target) === null,
    );
    throw new Error(
      `Unknown seed target(s): ${invalid.join(", ")}. Run with --help to list available targets.`,
    );
  }

  const order = requestedTargets ? resolveSeedOrder(requestedTargets) : FULL_SEED_ORDER;

  if (requestedTargets) {
    console.log(`[Seed] Running: ${order.join(" -> ")}`);
  }

  for (const target of order) {
    const entry = SEED_REGISTRY[target];
    console.log(`[Seed] ${entry.label}...`);
    await entry.run();
  }
}
