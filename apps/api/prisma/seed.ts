import { prisma } from "../src/db/prisma";
import { seedDatabase } from "../src/db/seed";

seedDatabase()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
