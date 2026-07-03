import { execSync } from "child_process";
import path from "path";
import { PrismaClient } from "../generated/prisma";
import { prisma } from "./prisma";
import { seedDatabase } from "./seed";

const apiRoot = path.resolve(__dirname, "../..");

async function ensureDatabaseExists() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.replace(/^\//, "");
  if (!databaseName) {
    throw new Error("DATABASE_URL must include a database name");
  }

  parsed.pathname = "/postgres";
  const adminUrl = parsed.toString();

  const admin = new PrismaClient({
    datasources: { db: { url: adminUrl } },
  });

  try {
    const existing = await admin.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS(
        SELECT 1 FROM pg_database WHERE datname = ${databaseName}
      ) AS "exists"
    `;

    if (!existing[0]?.exists) {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
      console.log(`[DB] Created database "${databaseName}"`);
    }
  } finally {
    await admin.$disconnect();
  }
}

export async function migrate() {
  await ensureDatabaseExists();
  await prisma.$connect();

  execSync("npx prisma migrate deploy", {
    cwd: apiRoot,
    stdio: "inherit",
  });

  await seedDatabase();
  console.log("[DB] Migrations complete");
}
