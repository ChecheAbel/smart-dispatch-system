import { prisma } from "../db/prisma";
import { regionTranslationInputsToMap } from "../types/region-translations";
import type { Prisma } from "../generated/prisma";

type SeedLocation = {
  translations: Array<{ locale: string; name: string; description: string | null }>;
  latitude: number;
  longitude: number;
  address: string;
};

const ADDIS_ABABA_LOCATIONS: SeedLocation[] = [
  {
    translations: [
      { locale: "en", name: "Bole International Airport", description: "Main international airport" },
      { locale: "am", name: "ቦሌ ዓለም አቀፍ አውራጃ", description: "ዋናው ዓለም አቀፍ አውራጃ" },
    ],
    latitude: 8.9779,
    longitude: 38.7993,
    address: "Bole, Addis Ababa",
  },
  {
    translations: [
      { locale: "en", name: "Meskel Square", description: "Central public square" },
      { locale: "am", name: "መስቀል አደባባይ", description: "ማዕከላዊ የህዝብ አደባባይ" },
    ],
    latitude: 9.0105,
    longitude: 38.7612,
    address: "Meskel Square, Addis Ababa",
  },
  {
    translations: [
      { locale: "en", name: "Addis Ababa Railway Station", description: "Main railway terminal" },
      { locale: "am", name: "አዲስ አበባ የባቡር ጣቢያ", description: "ዋናው የባቡር ተራ መጨረሻ" },
    ],
    latitude: 9.005,
    longitude: 38.7526,
    address: "Le Gare, Addis Ababa",
  },
  {
    translations: [
      { locale: "en", name: "Mercato", description: "Largest open-air market" },
      { locale: "am", name: "መርካቶ", description: "ትልቁ ክፍት ገበያ" },
    ],
    latitude: 9.0302,
    longitude: 38.7469,
    address: "Mercato, Addis Ababa",
  },
  {
    translations: [
      { locale: "en", name: "Piassa", description: "Historic city center" },
      { locale: "am", name: "ፒያሳ", description: "ታሪካዊ የከተማ ማዕከል" },
    ],
    latitude: 9.0315,
    longitude: 38.7505,
    address: "Piassa, Addis Ababa",
  },
  {
    translations: [
      { locale: "en", name: "Mexico Square", description: "Major traffic junction" },
      { locale: "am", name: "ሜክሲኮ አደባባይ", description: "ዋና የትራፊክ መገናኛ" },
    ],
    latitude: 9.014,
    longitude: 38.7485,
    address: "Mexico, Addis Ababa",
  },
  {
    translations: [
      { locale: "en", name: "Megenagna", description: "Eastern transport hub" },
      { locale: "am", name: "መገናኛ", description: "ምስራቃዊ የትራንስፖርት ማዕከል" },
    ],
    latitude: 9.0125,
    longitude: 38.791,
    address: "Megenagna, Addis Ababa",
  },
  {
    translations: [
      { locale: "en", name: "Kazanchis", description: "Business district" },
      { locale: "am", name: "ካዛንቺስ", description: "የንግድ ወረቀት" },
    ],
    latitude: 9.018,
    longitude: 38.768,
    address: "Kazanchis, Addis Ababa",
  },
  {
    translations: [
      { locale: "en", name: "CMC", description: "Northern residential and commercial area" },
      { locale: "am", name: "ሲ.ኤም.ሲ", description: "ሰሜናዊ የመኖሪያ እና ንግድ ቦታ" },
    ],
    latitude: 9.041,
    longitude: 38.804,
    address: "CMC, Addis Ababa",
  },
  {
    translations: [
      { locale: "en", name: "Lebu", description: "Southern gateway area" },
      { locale: "am", name: "ለቡ", description: "ደቡባዊ መግቢያ ቦታ" },
    ],
    latitude: 8.955,
    longitude: 38.72,
    address: "Lebu, Addis Ababa",
  },
];

async function upsertLocation(regionId: string, location: SeedLocation) {
  const translations = regionTranslationInputsToMap(
    location.translations.map((translation) => ({ ...translation })),
  ) as Prisma.InputJsonValue;

  const existing = await prisma.location.findFirst({
    where: {
      regionId,
      address: location.address,
    },
  });

  if (existing) {
    await prisma.location.update({
      where: { id: existing.id },
      data: {
        translations,
        latitude: location.latitude,
        longitude: location.longitude,
        isActive: true,
      },
    });
    return;
  }

  await prisma.location.create({
    data: {
      regionId,
      translations,
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address,
      isActive: true,
    },
  });
}

export async function seedLocations() {
  const addisAbaba = await prisma.region.findUnique({
    where: { slug: "addis-ababa" },
  });

  if (!addisAbaba) {
    console.warn("[Seed] Addis Ababa region not found — skipping location seed");
    return;
  }

  for (const location of ADDIS_ABABA_LOCATIONS) {
    await upsertLocation(addisAbaba.id, location);
  }

  console.log(
    `[Seed] Addis Ababa locations ready (${ADDIS_ABABA_LOCATIONS.length} locations)`,
  );
}
