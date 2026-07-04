import { prisma } from "../db/prisma";
import { regionTranslationInputsToMap } from "../types/region-translations";
import type { Prisma } from "../generated/prisma";

const ETHIOPIAN_REGIONS = [
  {
    slug: "addis-ababa",
    translations: [
      { locale: "en", name: "Addis Ababa", description: "Chartered city" },
      { locale: "am", name: "አዲስ አበባ", description: "ተሸፋፊ ከተማ" },
    ],
  },
  {
    slug: "dire-dawa",
    translations: [
      { locale: "en", name: "Dire Dawa", description: "Chartered city" },
      { locale: "am", name: "ድሬ ዳዋ", description: "ተሸፋፊ ከተማ" },
    ],
  },
  {
    slug: "tigray",
    translations: [
      { locale: "en", name: "Tigray", description: "Regional state" },
      { locale: "am", name: "ትግራይ", description: "ክልል" },
    ],
  },
  {
    slug: "afar",
    translations: [
      { locale: "en", name: "Afar", description: "Regional state" },
      { locale: "am", name: "አፋር", description: "ክልል" },
    ],
  },
  {
    slug: "amhara",
    translations: [
      { locale: "en", name: "Amhara", description: "Regional state" },
      { locale: "am", name: "አማራ", description: "ክልል" },
    ],
  },
  {
    slug: "oromia",
    translations: [
      { locale: "en", name: "Oromia", description: "Regional state" },
      { locale: "am", name: "ኦሮሚያ", description: "ክልል" },
    ],
  },
  {
    slug: "somali",
    translations: [
      { locale: "en", name: "Somali", description: "Regional state" },
      { locale: "am", name: "ሶማሌ", description: "ክልል" },
    ],
  },
  {
    slug: "benishangul-gumuz",
    translations: [
      { locale: "en", name: "Benishangul-Gumuz", description: "Regional state" },
      { locale: "am", name: "ቤንሻንጉል ጉሙዝ", description: "ክልል" },
    ],
  },
  {
    slug: "gambela",
    translations: [
      { locale: "en", name: "Gambela", description: "Regional state" },
      { locale: "am", name: "ጋምቤላ", description: "ክልል" },
    ],
  },
  {
    slug: "harari",
    translations: [
      { locale: "en", name: "Harari", description: "Regional state" },
      { locale: "am", name: "ሐረሪ", description: "ክልል" },
    ],
  },
  {
    slug: "sidama",
    translations: [
      { locale: "en", name: "Sidama", description: "Regional state" },
      { locale: "am", name: "ሲዳማ", description: "ክልል" },
    ],
  },
  {
    slug: "snnpr",
    translations: [
      {
        locale: "en",
        name: "Southern Nations, Nationalities, and Peoples' Region",
        description: "Regional state",
      },
      {
        locale: "am",
        name: "የደቡብ ብሔሮች ብሔረሰቦችና ሕዝቦች ክልል",
        description: "ክልል",
      },
    ],
  },
  {
    slug: "south-west-ethiopia",
    translations: [
      {
        locale: "en",
        name: "Southwest Ethiopia Peoples' Region",
        description: "Regional state",
      },
      {
        locale: "am",
        name: "የደቡብ ምዕራብ ኢትዮጵያ ሕዝቦች ክልል",
        description: "ክልል",
      },
    ],
  },
  {
    slug: "central-ethiopia",
    translations: [
      {
        locale: "en",
        name: "Central Ethiopia Regional State",
        description: "Regional state",
      },
      {
        locale: "am",
        name: "ማዕከላዊ ኢትዮጵያ ክልል",
        description: "ክልል",
      },
    ],
  },
  {
    slug: "south-ethiopia",
    translations: [
      {
        locale: "en",
        name: "South Ethiopia Regional State",
        description: "Regional state",
      },
      {
        locale: "am",
        name: "ደቡብ ኢትዮጵያ ክልል",
        description: "ክልል",
      },
    ],
  },
] as const;

export async function seedRegions() {
  for (const region of ETHIOPIAN_REGIONS) {
    const translations = regionTranslationInputsToMap(
      region.translations.map((translation) => ({ ...translation })),
    ) as Prisma.InputJsonValue;

    await prisma.region.upsert({
      where: { slug: region.slug },
      update: {
        translations,
        isActive: true,
      },
      create: {
        slug: region.slug,
        translations,
        isActive: true,
      },
    });
  }

  console.log(`[Seed] Ethiopian regions ready (${ETHIOPIAN_REGIONS.length} regions)`);
}
