import { prisma } from "../db/prisma";

const TYPE_CLASS_PAIRS: Array<{ typeSlug: string; classSlugs: string[] }> = [
  { typeSlug: "sedan", classSlugs: ["economy", "standard", "premium"] },
  { typeSlug: "suv", classSlugs: ["standard", "premium", "luxury"] },
  { typeSlug: "minibus", classSlugs: ["standard"] },
  { typeSlug: "bus", classSlugs: ["standard"] },
  { typeSlug: "van", classSlugs: ["standard", "premium"] },
  { typeSlug: "motorcycle", classSlugs: ["economy"] },
  { typeSlug: "pickup", classSlugs: ["economy", "standard"] },
  { typeSlug: "executive", classSlugs: ["premium", "luxury"] },
];

export async function seedVehicleTypeClasses() {
  for (const pair of TYPE_CLASS_PAIRS) {
    const vehicleType = await prisma.vehicleType.findUnique({
      where: { slug: pair.typeSlug },
    });

    if (!vehicleType) {
      console.warn(`[Seed] Vehicle type "${pair.typeSlug}" not found — skipping class links`);
      continue;
    }

    for (const classSlug of pair.classSlugs) {
      const vehicleClass = await prisma.vehicleClass.findUnique({
        where: { slug: classSlug },
      });

      if (!vehicleClass) {
        console.warn(
          `[Seed] Vehicle class "${classSlug}" not found — skipping link for ${pair.typeSlug}`,
        );
        continue;
      }

      await prisma.vehicleTypeClass.upsert({
        where: {
          vehicleTypeId_vehicleClassId: {
            vehicleTypeId: vehicleType.id,
            vehicleClassId: vehicleClass.id,
          },
        },
        update: {},
        create: {
          vehicleTypeId: vehicleType.id,
          vehicleClassId: vehicleClass.id,
        },
      });
    }
  }
}
