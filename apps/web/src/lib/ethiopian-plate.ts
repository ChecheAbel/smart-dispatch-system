export type EthiopianPlateParts = {
  region: string;
  code: string;
  license: string;
};

export const ETHIOPIAN_PLATE_REGION_CODES = [
  "AA",
  "DD",
  "TI",
  "AF",
  "AM",
  "OR",
  "SO",
  "BG",
  "GA",
  "HA",
  "SD",
] as const;

export const ETHIOPIAN_PLATE_CATEGORY_CODES = ["1", "2", "3", "4", "5"] as const;

export type EthiopianPlateRegionCode = (typeof ETHIOPIAN_PLATE_REGION_CODES)[number];
export type EthiopianPlateCategoryCode = (typeof ETHIOPIAN_PLATE_CATEGORY_CODES)[number];

const PLATE_PATTERN = /^([A-Za-z]{2})-(\d+)-(\d+)$/;

export function parseEthiopianPlate(plateNumber: string): EthiopianPlateParts {
  const normalized = plateNumber.trim().toUpperCase();
  const match = normalized.match(PLATE_PATTERN);

  if (!match) {
    return { region: "", code: "", license: "" };
  }

  return {
    region: match[1],
    code: match[2],
    license: match[3],
  };
}

export function formatEthiopianPlate(parts: EthiopianPlateParts): string {
  const region = parts.region.trim().toUpperCase();
  const code = parts.code.trim();
  const license = parts.license.trim();

  if (!region || !code || !license) {
    return "";
  }

  return `${region}-${code}-${license}`;
}

export function isValidEthiopianPlateParts(parts: EthiopianPlateParts): boolean {
  const region = parts.region.trim().toUpperCase();
  const code = parts.code.trim();
  const license = parts.license.trim();

  return /^[A-Z]{2}$/.test(region) && /^\d+$/.test(code) && /^\d+$/.test(license);
}
