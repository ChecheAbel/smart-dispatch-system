import { PricingModel } from "../generated/prisma";
import { prisma } from "../db/prisma";
import { farePlanTranslationInputsToMap } from "../types/fare-plan-translations";
import type { Prisma } from "../generated/prisma";

const DEFAULT_FARE_PLANS = [
  {
    slug: "addis-sedan-standard",
    vehicleTypeSlug: "sedan",
    regionSlug: "addis-ababa",
    pricingModel: PricingModel.distance_time,
    currency: "ETB",
    baseFare: 150,
    perKmRate: 18,
    perMinuteRate: 2.5,
    minimumFare: 200,
    bookingFee: 25,
    freeWaitingMinutes: 5,
    waitingFeePerMinute: 2.5,
    priority: 100,
    translations: [
      {
        locale: "en",
        name: "Addis Sedan Standard",
        description: "Standard sedan fare for trips within Addis Ababa.",
      },
      {
        locale: "am",
        name: "አዲስ አበባ ሴዳን መደበኛ",
        description: "በአዲስ አበባ ውስጥ ለሴዳን ጉዞዎች መደበኛ ክፍያ።",
      },
    ],
  },
  {
    slug: "addis-executive-flat",
    vehicleTypeSlug: "executive",
    regionSlug: "addis-ababa",
    pricingModel: PricingModel.flat,
    currency: "ETB",
    baseFare: 2500,
    perKmRate: null,
    perMinuteRate: null,
    minimumFare: 2500,
    bookingFee: 100,
    freeWaitingMinutes: 15,
    waitingFeePerMinute: 8,
    priority: 90,
    translations: [
      {
        locale: "en",
        name: "Addis Executive Flat",
        description: "Flat executive transfer rate within Addis Ababa.",
      },
      {
        locale: "am",
        name: "አዲስ አበባ ኤክዘኪዩቲቭ ቋሚ",
        description: "በአዲስ አበባ ውስጥ ቋሚ የኤክዘኪዩቲቭ ትራንስፈር ክፍያ።",
      },
    ],
  },
  {
    slug: "oromia-minibus-distance",
    vehicleTypeSlug: "minibus",
    regionSlug: "oromia",
    pricingModel: PricingModel.distance,
    currency: "ETB",
    baseFare: 300,
    perKmRate: 22,
    perMinuteRate: null,
    minimumFare: 350,
    bookingFee: null,
    freeWaitingMinutes: 10,
    waitingFeePerMinute: 3,
    priority: 80,
    translations: [
      {
        locale: "en",
        name: "Oromia Minibus Distance",
        description: "Distance-based minibus fare for Oromia regional trips.",
      },
      {
        locale: "am",
        name: "ኦሮሚያ ሚኒባስ ርቀት",
        description: "ለኦሮሚያ ክልላዊ ጉዞዎች በርቀት ላይ የተመሰረተ የሚኒባስ ክፍያ።",
      },
    ],
  },
  {
    slug: "national-van-hourly",
    vehicleTypeSlug: "van",
    regionSlug: null,
    pricingModel: PricingModel.hourly,
    currency: "ETB",
    baseFare: 800,
    perKmRate: null,
    perMinuteRate: 13.33,
    minimumFare: 2400,
    bookingFee: 150,
    freeWaitingMinutes: 30,
    waitingFeePerMinute: 5,
    priority: 50,
    translations: [
      {
        locale: "en",
        name: "National Van Hourly",
        description: "Hourly van charter rate available across all regions.",
      },
      {
        locale: "am",
        name: "ብሔራዊ ቫን ሰዓታዊ",
        description: "በሁሉም ክልሎች የሚገኝ ሰዓታዊ የቫን ቻርተር ክፍያ።",
      },
    ],
  },
] as const;

export async function seedFarePlans() {
  for (const farePlan of DEFAULT_FARE_PLANS) {
    const vehicleType = farePlan.vehicleTypeSlug
      ? await prisma.vehicleType.findUnique({ where: { slug: farePlan.vehicleTypeSlug } })
      : null;
    const region = farePlan.regionSlug
      ? await prisma.region.findUnique({ where: { slug: farePlan.regionSlug } })
      : null;

    const translations = farePlanTranslationInputsToMap(
      farePlan.translations.map((translation) => ({ ...translation })),
    ) as Prisma.InputJsonValue;

    await prisma.farePlan.upsert({
      where: { slug: farePlan.slug },
      update: {
        translations,
        vehicleTypeId: vehicleType?.id ?? null,
        regionId: region?.id ?? null,
        pricingModel: farePlan.pricingModel,
        currency: farePlan.currency,
        baseFare: farePlan.baseFare,
        perKmRate: farePlan.perKmRate,
        perMinuteRate: farePlan.perMinuteRate,
        minimumFare: farePlan.minimumFare,
        bookingFee: farePlan.bookingFee,
        freeWaitingMinutes: farePlan.freeWaitingMinutes,
        waitingFeePerMinute: farePlan.waitingFeePerMinute,
        priority: farePlan.priority,
        isActive: true,
      },
      create: {
        slug: farePlan.slug,
        translations,
        vehicleTypeId: vehicleType?.id ?? null,
        regionId: region?.id ?? null,
        pricingModel: farePlan.pricingModel,
        currency: farePlan.currency,
        baseFare: farePlan.baseFare,
        perKmRate: farePlan.perKmRate,
        perMinuteRate: farePlan.perMinuteRate,
        minimumFare: farePlan.minimumFare,
        bookingFee: farePlan.bookingFee,
        freeWaitingMinutes: farePlan.freeWaitingMinutes,
        waitingFeePerMinute: farePlan.waitingFeePerMinute,
        priority: farePlan.priority,
        isActive: true,
      },
    });
  }

  console.log(`[Seed] ${DEFAULT_FARE_PLANS.length} fare plans upserted`);
}
