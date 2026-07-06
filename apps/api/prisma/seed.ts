import { prisma } from "../src/db/prisma";
import { printSeedHelp, seedDatabase } from "../src/db/seed";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  printSeedHelp();
  process.exit(0);
}

const targets = args.filter((arg) => !arg.startsWith("-"));

seedDatabase({ targets: targets.length > 0 ? targets : undefined })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
