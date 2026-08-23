import dns from "node:dns";
import type {
  BusinessLicenseAddress,
  BusinessLicenseAssociate,
  BusinessLicenseDetail,
  BusinessLicenseSubGroup,
  BusinessTinLicense,
  BusinessTinRegistration,
} from "@smart-dispatch/types";
import { normalizeEthiopianTin } from "../utils/validation";

dns.setDefaultResultOrder("ipv4first");

export class BusinessTinLookupError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = "BusinessTinLookupError";
  }
}

type EtradeLicense = {
  licenseNo?: unknown;
  mainGuid?: unknown;
  businessName?: unknown;
  legalStatus?: unknown;
  issuedDate?: unknown;
  expiryDate?: unknown;
};

type EtradeRegistration = {
  tin?: unknown;
  ownerName?: unknown;
  licenses?: unknown;
};

function getEtradeRegistrationUrl() {
  const configured = process.env.ETRADE_REGISTRATION_URL?.trim().replace(/\/+$/, "");
  if (!configured) {
    throw new BusinessTinLookupError(
      "ETRADE_REGISTRATION_URL is required. Set it in apps/api/.env or the Compose environment.",
      500,
    );
  }

  return configured;
}

function getEtradeLicenseUrl() {
  const configured = process.env.ETRADE_LICENSE_URL?.trim().replace(/\/+$/, "");
  if (configured) {
    return configured;
  }

  return getEtradeRegistrationUrl().replace(/\/registration$/i, "/license");
}

function getEtradeHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const apiKey = process.env.ETRADE_REGISTRATION_API_KEY?.trim();
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  return headers;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return record[key];
    }
  }

  return undefined;
}

function toSnakeKey(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

function mapAssociate(value: unknown): BusinessLicenseAssociate | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const mapped: BusinessLicenseAssociate = {};
  for (const [key, entry] of Object.entries(record)) {
    mapped[toSnakeKey(key)] = typeof entry === "string" ? entry.trim() : entry;
  }

  return mapped;
}

function mapAddress(value: unknown): BusinessLicenseAddress | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  return {
    region: asString(getField(record, "Region", "region")) || null,
    zone: asString(getField(record, "Zone", "zone")) || null,
    woreda: asString(getField(record, "Woreda", "woreda")) || null,
    kebele: asString(getField(record, "Kebele", "kebele")) || null,
    house_no: asString(getField(record, "HouseNo", "houseNo", "house_no")) || null,
    mobile_phone: asString(getField(record, "MobilePhone", "mobilePhone", "mobile_phone")) || null,
    regular_phone:
      asString(getField(record, "RegularPhone", "regularPhone", "regular_phone")) || null,
  };
}

function mapSubGroup(value: unknown): BusinessLicenseSubGroup | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const code = asNumber(getField(record, "Code", "code"));
  const description = asString(getField(record, "Description", "description"));
  if (code === null && !description) {
    return null;
  }

  return {
    code,
    description: description || null,
  };
}

function normalizeLicenseNo(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : undefined;
}

function mapLicenseSummary(value: unknown): BusinessTinLicense | null {
  const record = asRecord(value) as EtradeLicense | null;
  if (!record) {
    return null;
  }

  const licenseNo = asString(record.licenseNo);
  const businessName = asString(record.businessName);
  if (!licenseNo && !businessName) {
    return null;
  }

  return {
    license_no: licenseNo,
    main_guid: asString(record.mainGuid) || null,
    business_name: businessName,
    legal_status: asString(record.legalStatus) || null,
    issued_date: asString(record.issuedDate) || null,
    expiry_date: asString(record.expiryDate) || null,
  };
}

function mapRegistration(payload: unknown, requestedTin: string): BusinessTinRegistration | null {
  const record = asRecord(payload) as EtradeRegistration | null;
  if (!record) {
    return null;
  }

  const tin = normalizeEthiopianTin(asString(record.tin)) ?? requestedTin;
  const ownerName = asString(record.ownerName);
  if (!ownerName) {
    return null;
  }

  const licenses = Array.isArray(record.licenses)
    ? record.licenses.flatMap((license) => {
        const mapped = mapLicenseSummary(license);
        return mapped ? [mapped] : [];
      })
    : [];

  return {
    tin,
    owner_name: ownerName,
    licenses,
  };
}

function mapLicenseDetail(payload: unknown, requestedTin: string, requestedLicenseNo: string) {
  const record = asRecord(payload);
  if (!record) {
    return null;
  }

  const licenseNo =
    asString(getField(record, "LicenceNumber", "LicenseNumber", "licenceNumber", "licenseNo")) ||
    requestedLicenseNo;
  const tradeName = asString(getField(record, "TradeName", "tradeName"));
  const ownerTin =
    normalizeEthiopianTin(asString(getField(record, "OwnerTIN", "OwnerTin", "ownerTIN", "ownerTin"))) ??
    requestedTin;

  if (!licenseNo && !tradeName) {
    return null;
  }

  const associatesRaw = getField(record, "AssociateShortInfos", "associateShortInfos");
  const associates = Array.isArray(associatesRaw)
    ? associatesRaw.flatMap((associate) => {
        const mapped = mapAssociate(associate);
        return mapped ? [mapped] : [];
      })
    : [];

  const subGroupsRaw = getField(record, "SubGroups", "subGroups");
  const subGroups = Array.isArray(subGroupsRaw)
    ? subGroupsRaw.flatMap((group) => {
        const mapped = mapSubGroup(group);
        return mapped ? [mapped] : [];
      })
    : [];

  const detail: BusinessLicenseDetail = {
    main_guid: asString(getField(record, "MainGuid", "mainGuid")) || null,
    owner_tin: ownerTin,
    date_registered: asString(getField(record, "DateRegistered", "dateRegistered")) || null,
    trade_name: tradeName || null,
    license_no: licenseNo,
    status: asNumber(getField(record, "Status", "status")),
    status_description: asString(getField(record, "StatusDescription", "statusDescription")) || null,
    capital: asNumber(getField(record, "Capital", "capital")),
    associates,
    address: mapAddress(getField(record, "AddressInfo", "addressInfo", "address")),
    sub_groups: subGroups,
    renewed_to: asString(getField(record, "RenewedTo", "renewedTo")) || null,
    renewed_to_date_string:
      asString(getField(record, "RenewedToDateString", "renewedToDateString")) || null,
    renewal_date: asString(getField(record, "RenewalDate", "renewalDate")) || null,
    renewed_from: asString(getField(record, "RenewedFrom", "renewedFrom")) || null,
    cancellation_date: asString(getField(record, "CancellationDate", "cancellationDate")) || null,
  };

  return detail;
}

async function fetchEtradeJson(url: string, notFoundMessage: string) {
  let response: Response | undefined;
  let lastFailure = "Unknown network error.";

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      response = await fetch(url, {
        method: "GET",
        headers: getEtradeHeaders(),
        signal: AbortSignal.timeout(15_000),
      });
      break;
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : "Unknown network error.";
      console.error(`[eTrade] Failed to reach ${url} (attempt ${attempt}/3): ${lastFailure}`);

      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      }
    }
  }

  if (!response) {
    throw new BusinessTinLookupError(`Could not reach the eTrade lookup service (${lastFailure}).`, 502);
  }

  if (response.status === 404) {
    throw new BusinessTinLookupError(notFoundMessage, 404);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const record = asRecord(payload);
    const message =
      (typeof record?.error === "string" && record.error.trim()) ||
      (typeof record?.message === "string" && record.message.trim()) ||
      `eTrade lookup failed (${response.status}).`;
    throw new BusinessTinLookupError(message, response.status >= 500 ? 502 : 400);
  }

  return payload;
}

export async function lookupBusinessTin(rawTin: string): Promise<BusinessTinRegistration> {
  const tin = normalizeEthiopianTin(rawTin);
  if (!tin) {
    throw new BusinessTinLookupError("Enter a valid 10-digit TIN.");
  }

  const payload = await fetchEtradeJson(
    `${getEtradeRegistrationUrl()}/${encodeURIComponent(tin)}`,
    "No business was found for this TIN.",
  );

  const registration = mapRegistration(payload, tin);
  if (!registration) {
    throw new BusinessTinLookupError("No business was found for this TIN.", 404);
  }

  return registration;
}

export async function lookupBusinessLicense(
  rawTin: string,
  rawLicenseNo: string,
): Promise<BusinessLicenseDetail> {
  const tin = normalizeEthiopianTin(rawTin);
  if (!tin) {
    throw new BusinessTinLookupError("Enter a valid 10-digit TIN.");
  }

  const licenseNo = normalizeLicenseNo(rawLicenseNo);
  if (!licenseNo) {
    throw new BusinessTinLookupError("License number is required.");
  }

  const url = new URL(getEtradeLicenseUrl());
  url.searchParams.set("tin", tin);
  url.searchParams.set("licenseNo", licenseNo);

  const payload = await fetchEtradeJson(url.toString(), "No business license was found.");
  const license = mapLicenseDetail(payload, tin, licenseNo);
  if (!license) {
    throw new BusinessTinLookupError("No business license was found.", 404);
  }

  return license;
}
