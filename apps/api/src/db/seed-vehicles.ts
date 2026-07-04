import { prisma } from "../db/prisma";
import { VehicleStatus } from "../generated/prisma";

type SeedVehicle = {
  plateNumber: string;
  vehicleTypeSlug: string;
  make: string;
  model: string;
  year: number;
  status?: VehicleStatus;
  notes?: string;
};

const ETHIOPIAN_FLEET: SeedVehicle[] = [
  {
    plateNumber: "AA-3-10234",
    vehicleTypeSlug: "sedan",
    make: "Toyota",
    model: "Corolla",
    year: 2018,
    notes: "Blue-and-white taxi operating around Bole and Kazanchis.",
  },
  {
    plateNumber: "AA-3-20567",
    vehicleTypeSlug: "sedan",
    make: "Toyota",
    model: "Corolla",
    year: 2019,
    notes: "On-demand city rides across Addis Ababa.",
  },
  {
    plateNumber: "AA-3-31890",
    vehicleTypeSlug: "sedan",
    make: "Suzuki",
    model: "Dzire",
    year: 2020,
    notes: "Fuel-efficient sedan for short urban trips.",
  },
  {
    plateNumber: "AA-1-42100",
    vehicleTypeSlug: "suv",
    make: "Toyota",
    model: "Land Cruiser Prado",
    year: 2021,
    notes: "Corporate shuttle for airport and hotel transfers.",
  },
  {
    plateNumber: "AA-1-53421",
    vehicleTypeSlug: "suv",
    make: "Toyota",
    model: "Fortuner",
    year: 2022,
    notes: "Assigned to executive team movements in Addis.",
  },
  {
    plateNumber: "AA-3-64532",
    vehicleTypeSlug: "minibus",
    make: "Toyota",
    model: "HiAce",
    year: 2017,
    notes: "Mercato to Megenagna shared route service.",
  },
  {
    plateNumber: "AA-3-75643",
    vehicleTypeSlug: "minibus",
    make: "Toyota",
    model: "HiAce",
    year: 2018,
    notes: "Piassa to Bole International Airport shuttle.",
  },
  {
    plateNumber: "AA-4-86754",
    vehicleTypeSlug: "bus",
    make: "Toyota",
    model: "Coaster",
    year: 2016,
    notes: "Staff bus for Kazanchis office park routes.",
  },
  {
    plateNumber: "AA-4-97865",
    vehicleTypeSlug: "bus",
    make: "Hyundai",
    model: "County",
    year: 2019,
    notes: "Scheduled commuter service on the Ring Road corridor.",
  },
  {
    plateNumber: "AA-2-08976",
    vehicleTypeSlug: "van",
    make: "Toyota",
    model: "Noah",
    year: 2020,
    notes: "Airport pickup van for group arrivals at Bole.",
  },
  {
    plateNumber: "AA-5-19087",
    vehicleTypeSlug: "motorcycle",
    make: "Bajaj",
    model: "Boxer",
    year: 2023,
    notes: "Quick document delivery across central Addis.",
  },
  {
    plateNumber: "AA-2-20198",
    vehicleTypeSlug: "pickup",
    make: "Toyota",
    model: "Hilux",
    year: 2021,
    notes: "Light cargo support for dispatch depot restocking.",
  },
  {
    plateNumber: "AA-1-31209",
    vehicleTypeSlug: "executive",
    make: "Mercedes-Benz",
    model: "E200",
    year: 2022,
    notes: "VIP protocol vehicle for diplomatic guests.",
  },
  {
    plateNumber: "AA-3-42310",
    vehicleTypeSlug: "sedan",
    make: "Toyota",
    model: "Yaris",
    year: 2017,
    status: VehicleStatus.maintenance,
    notes: "Awaiting brake service at garage near Mexico Square.",
  },
  {
    plateNumber: "OR-3-53421",
    vehicleTypeSlug: "minibus",
    make: "Isuzu",
    model: "Journey",
    year: 2018,
    notes: "Adama to Addis Ababa intercity minibus service.",
  },
  {
    plateNumber: "AA-3-64510",
    vehicleTypeSlug: "sedan",
    make: "Hyundai",
    model: "Accent",
    year: 2016,
    status: VehicleStatus.retired,
    notes: "Retired from fleet after high mileage on city taxi duty.",
  },
];

export async function seedVehicles() {
  let seeded = 0;

  for (const vehicle of ETHIOPIAN_FLEET) {
    const vehicleType = await prisma.vehicleType.findUnique({
      where: { slug: vehicle.vehicleTypeSlug },
    });

    if (!vehicleType) {
      console.warn(
        `[Seed] Vehicle type "${vehicle.vehicleTypeSlug}" not found — skipping ${vehicle.plateNumber}`,
      );
      continue;
    }

    const plateNumber = vehicle.plateNumber.trim().toUpperCase();

    await prisma.vehicle.upsert({
      where: { plateNumber },
      update: {
        vehicleTypeId: vehicleType.id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        status: vehicle.status ?? VehicleStatus.active,
        notes: vehicle.notes ?? null,
      },
      create: {
        plateNumber,
        vehicleTypeId: vehicleType.id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        status: vehicle.status ?? VehicleStatus.active,
        notes: vehicle.notes ?? null,
      },
    });

    seeded += 1;
  }

  console.log(`[Seed] Ethiopian fleet ready (${seeded} vehicles)`);
}
