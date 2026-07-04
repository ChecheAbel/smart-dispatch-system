import { prisma } from "../db/prisma";
import { VehicleStatus } from "../generated/prisma";

type SeedVehicle = {
  plateNumber: string;
  chassisNumber: string;
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
    chassisNumber: "JTDBT923X8A102341",
    vehicleTypeSlug: "sedan",
    make: "Toyota",
    model: "Corolla",
    year: 2018,
    notes: "Blue-and-white taxi operating around Bole and Kazanchis.",
  },
  {
    plateNumber: "AA-3-20567",
    chassisNumber: "JTDBT923X8A205672",
    vehicleTypeSlug: "sedan",
    make: "Toyota",
    model: "Corolla",
    year: 2019,
    notes: "On-demand city rides across Addis Ababa.",
  },
  {
    plateNumber: "AA-3-31890",
    chassisNumber: "MA3ZFBJ1S00318903",
    vehicleTypeSlug: "sedan",
    make: "Suzuki",
    model: "Dzire",
    year: 2020,
    notes: "Fuel-efficient sedan for short urban trips.",
  },
  {
    plateNumber: "AA-1-42100",
    chassisNumber: "JTEBU3FJ5JK421004",
    vehicleTypeSlug: "suv",
    make: "Toyota",
    model: "Land Cruiser Prado",
    year: 2021,
    notes: "Corporate shuttle for airport and hotel transfers.",
  },
  {
    plateNumber: "AA-1-53421",
    chassisNumber: "MR0KA3CD5J0534215",
    vehicleTypeSlug: "suv",
    make: "Toyota",
    model: "Fortuner",
    year: 2022,
    notes: "Assigned to executive team movements in Addis.",
  },
  {
    plateNumber: "AA-3-64532",
    chassisNumber: "JTFSX23P8H0645326",
    vehicleTypeSlug: "minibus",
    make: "Toyota",
    model: "HiAce",
    year: 2017,
    notes: "Mercato to Megenagna shared route service.",
  },
  {
    plateNumber: "AA-3-75643",
    chassisNumber: "JTFSX23P8J0756437",
    vehicleTypeSlug: "minibus",
    make: "Toyota",
    model: "HiAce",
    year: 2018,
    notes: "Piassa to Bole International Airport shuttle.",
  },
  {
    plateNumber: "AA-4-86754",
    chassisNumber: "JTFSX23P6G0867548",
    vehicleTypeSlug: "bus",
    make: "Toyota",
    model: "Coaster",
    year: 2016,
    notes: "Staff bus for Kazanchis office park routes.",
  },
  {
    plateNumber: "AA-4-97865",
    chassisNumber: "KMJWA18BPJU978659",
    vehicleTypeSlug: "bus",
    make: "Hyundai",
    model: "County",
    year: 2019,
    notes: "Scheduled commuter service on the Ring Road corridor.",
  },
  {
    plateNumber: "AA-2-08976",
    chassisNumber: "ZRR70-0089760",
    vehicleTypeSlug: "van",
    make: "Toyota",
    model: "Noah",
    year: 2020,
    notes: "Airport pickup van for group arrivals at Bole.",
  },
  {
    plateNumber: "AA-5-19087",
    chassisNumber: "MD2A18AX8PWC19087",
    vehicleTypeSlug: "motorcycle",
    make: "Bajaj",
    model: "Boxer",
    year: 2023,
    notes: "Quick document delivery across central Addis.",
  },
  {
    plateNumber: "AA-2-20198",
    chassisNumber: "MR0KA3CD5M0201980",
    vehicleTypeSlug: "pickup",
    make: "Toyota",
    model: "Hilux",
    year: 2021,
    notes: "Light cargo support for dispatch depot restocking.",
  },
  {
    plateNumber: "AA-1-31209",
    chassisNumber: "WDD2130421A312091",
    vehicleTypeSlug: "executive",
    make: "Mercedes-Benz",
    model: "E200",
    year: 2022,
    notes: "VIP protocol vehicle for diplomatic guests.",
  },
  {
    plateNumber: "AA-3-42310",
    chassisNumber: "JTDBT923X8A423102",
    vehicleTypeSlug: "sedan",
    make: "Toyota",
    model: "Yaris",
    year: 2017,
    status: VehicleStatus.maintenance,
    notes: "Awaiting brake service at garage near Mexico Square.",
  },
  {
    plateNumber: "OR-3-53421",
    chassisNumber: "JALC4W35X8J0534213",
    vehicleTypeSlug: "minibus",
    make: "Isuzu",
    model: "Journey",
    year: 2018,
    notes: "Adama to Addis Ababa intercity minibus service.",
  },
  {
    plateNumber: "AA-3-64510",
    chassisNumber: "KMHCN46C16U645104",
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
    const chassisNumber = vehicle.chassisNumber.trim().toUpperCase();

    await prisma.vehicle.upsert({
      where: { plateNumber },
      update: {
        chassisNumber,
        vehicleTypeId: vehicleType.id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        status: vehicle.status ?? VehicleStatus.active,
        notes: vehicle.notes ?? null,
      },
      create: {
        plateNumber,
        chassisNumber,
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
