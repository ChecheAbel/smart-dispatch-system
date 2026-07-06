import { prisma } from "../db/prisma";
import { vehicleClassTranslationInputsToMap } from "../types/vehicle-class-translations";
import type { Prisma } from "../generated/prisma";

const VEHICLE_CLASSES = [
  {
    slug: "economy",
    translations: [
      {
        locale: "en",
        name: "Economy",
        description: "Budget-friendly service tier",
      },
      {
        locale: "am",
        name: "ኢኮኖሚ",
        description: "በበጀት የሚስማማ የአገልግሎት ደረጃ",
      },
    ],
  },
  {
    slug: "standard",
    translations: [
      {
        locale: "en",
        name: "Standard",
        description: "Default service tier for everyday trips",
      },
      {
        locale: "am",
        name: "መደበኛ",
        description: "ለመደበኛ ጉዞዎች ነባሪ የአገልግሎት ደረጃ",
      },
    ],
  },
  {
    slug: "premium",
    translations: [
      {
        locale: "en",
        name: "Premium",
        description: "Enhanced comfort and priority service",
      },
      {
        locale: "am",
        name: "ፕሪሚየም",
        description: "የተሻለ ምቾት እና ቅድሚያ የሚሰጥ አገልግሎት",
      },
    ],
  },
  {
    slug: "luxury",
    translations: [
      {
        locale: "en",
        name: "Luxury",
        description: "Top-tier executive service",
      },
      {
        locale: "am",
        name: "ቅንጦት",
        description: "ከፍተኛ ደረጃ የአስተዳዳሪ አገልግሎት",
      },
    ],
  },
] as const;

export async function seedVehicleClasses() {
  for (const vehicleClass of VEHICLE_CLASSES) {
    const translations = vehicleClassTranslationInputsToMap(
      vehicleClass.translations.map((translation) => ({ ...translation })),
    ) as Prisma.InputJsonValue;

    await prisma.vehicleClass.upsert({
      where: { slug: vehicleClass.slug },
      update: {
        translations,
        isActive: true,
      },
      create: {
        slug: vehicleClass.slug,
        translations,
        isActive: true,
      },
    });
  }

  console.log(`[Seed] ${VEHICLE_CLASSES.length} vehicle classes upserted`);
}
