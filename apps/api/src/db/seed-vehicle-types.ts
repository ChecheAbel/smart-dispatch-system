import { prisma } from "../db/prisma";
import { vehicleTypeTranslationInputsToMap } from "../types/vehicle-type-translations";
import type { Prisma } from "../generated/prisma";

const VEHICLE_TYPES = [
  {
    slug: "sedan",
    passengerCapacity: 4,
    translations: [
      {
        locale: "en",
        name: "Sedan",
        description: "Standard passenger car for everyday trips",
      },
      {
        locale: "am",
        name: "ሴዳን",
        description: "ለመደበኛ ጉዞዎች መደበኛ የመንገድ መኪና",
      },
    ],
  },
  {
    slug: "suv",
    passengerCapacity: 6,
    translations: [
      {
        locale: "en",
        name: "SUV",
        description: "Sport utility vehicle for groups and rough roads",
      },
      {
        locale: "am",
        name: "ኤስዩቪ",
        description: "ለቡድኖች እና ለአሳሳቢ መንገዶች የስፖርት ዩቲሊቲ መኪና",
      },
    ],
  },
  {
    slug: "minibus",
    passengerCapacity: 12,
    translations: [
      {
        locale: "en",
        name: "Minibus",
        description: "Shared minibus for higher-capacity routes",
      },
      {
        locale: "am",
        name: "ሚኒባስ",
        description: "ለከፍተኛ ቅዳሴ መስመሮች የሚያገለግል የጋራ ሚኒባስ",
      },
    ],
  },
  {
    slug: "bus",
    passengerCapacity: 30,
    translations: [
      {
        locale: "en",
        name: "Bus",
        description: "Full-size bus for scheduled and charter service",
      },
      {
        locale: "am",
        name: "አውቶቡስ",
        description: "ለወቅታዊ እና ለተከራየ አገልግሎት ሙሉ መጠን ያለው አውቶቡስ",
      },
    ],
  },
  {
    slug: "van",
    passengerCapacity: 8,
    translations: [
      {
        locale: "en",
        name: "Van",
        description: "Passenger or cargo van for flexible dispatch",
      },
      {
        locale: "am",
        name: "ቫን",
        description: "ለተለዋዋጭ ዲስፓች የመንገደኛ ወይም የጭነት ቫን",
      },
    ],
  },
  {
    slug: "motorcycle",
    passengerCapacity: 1,
    translations: [
      {
        locale: "en",
        name: "Motorcycle",
        description: "Two-wheeler for quick urban deliveries and rides",
      },
      {
        locale: "am",
        name: "ሞተርሳይክል",
        description: "ለፈጣን የከተማ ጉዞዎች እና ለማድረስ ሁለት ተሽከርካሪ",
      },
    ],
  },
  {
    slug: "pickup",
    passengerCapacity: 4,
    translations: [
      {
        locale: "en",
        name: "Pickup",
        description: "Light truck with open cargo bed",
      },
      {
        locale: "am",
        name: "ፒክአፕ",
        description: "ክፍት የጭነት ክፍል ያለው ቀላል መኪና",
      },
    ],
  },
  {
    slug: "executive",
    passengerCapacity: 4,
    translations: [
      {
        locale: "en",
        name: "Executive",
        description: "Premium sedan for VIP and corporate travel",
      },
      {
        locale: "am",
        name: "ኤክዚኪዩቲቭ",
        description: "ለቪአይፒ እና ለድርጅታዊ ጉዞዎች ፕሪሚየም ሴዳን",
      },
    ],
  },
] as const;

export async function seedVehicleTypes() {
  for (const vehicleType of VEHICLE_TYPES) {
    const translations = vehicleTypeTranslationInputsToMap(
      vehicleType.translations.map((translation) => ({ ...translation })),
    ) as Prisma.InputJsonValue;

    await prisma.vehicleType.upsert({
      where: { slug: vehicleType.slug },
      update: {
        translations,
        passengerCapacity: vehicleType.passengerCapacity,
        isActive: true,
      },
      create: {
        slug: vehicleType.slug,
        translations,
        passengerCapacity: vehicleType.passengerCapacity,
        isActive: true,
      },
    });
  }

  console.log(`[Seed] Vehicle types ready (${VEHICLE_TYPES.length} types)`);
}
