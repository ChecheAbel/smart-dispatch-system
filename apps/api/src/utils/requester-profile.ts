import type { RequesterSegment } from "@smart-dispatch/types";
import { getOptionalString, getString, isValidEmail } from "./validation";

export type RequesterProfileInput = {
  segment: RequesterSegment;
  organizationName?: string | null;
  jobTitle?: string | null;
  organizationAddress?: string | null;
  taxId?: string | null;
  registrationNumber?: string | null;
  governmentEntityType?: string | null;
  officialReference?: string | null;
  billingContactName?: string | null;
  billingContactEmail?: string | null;
};

export class RequesterProfileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequesterProfileValidationError";
  }
}

export function parseRequesterSegment(value: unknown): RequesterSegment | null {
  if (value === "individual" || value === "business" || value === "government") {
    return value;
  }
  return null;
}

export function parseRequesterProfileInput(body: unknown): RequesterProfileInput {
  const source = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const segment = parseRequesterSegment(source.segment);

  if (!segment) {
    throw new RequesterProfileValidationError(
      "A valid account type is required (individual, business, or government).",
    );
  }

  const billingContactEmail = getOptionalString(source.billing_contact_email);
  if (billingContactEmail && !isValidEmail(billingContactEmail)) {
    throw new RequesterProfileValidationError("Enter a valid billing contact email.");
  }

  return {
    segment,
    organizationName: getOptionalString(source.organization_name),
    jobTitle: getOptionalString(source.job_title),
    organizationAddress: getOptionalString(source.organization_address),
    taxId: getOptionalString(source.tax_id),
    registrationNumber: getOptionalString(source.registration_number),
    governmentEntityType: getOptionalString(source.government_entity_type),
    officialReference: getOptionalString(source.official_reference),
    billingContactName: getOptionalString(source.billing_contact_name),
    billingContactEmail,
  };
}

function requireField(value: string | null | undefined, message: string) {
  if (!value?.trim()) {
    throw new RequesterProfileValidationError(message);
  }
  return value.trim();
}

export function validateRequesterProfileInput(input: RequesterProfileInput): RequesterProfileInput {
  const normalized: RequesterProfileInput = {
    segment: input.segment,
    organizationName: input.organizationName?.trim() || null,
    jobTitle: input.jobTitle?.trim() || null,
    organizationAddress: input.organizationAddress?.trim() || null,
    taxId: input.taxId?.trim() || null,
    registrationNumber: input.registrationNumber?.trim() || null,
    governmentEntityType: input.governmentEntityType?.trim() || null,
    officialReference: input.officialReference?.trim() || null,
    billingContactName: input.billingContactName?.trim() || null,
    billingContactEmail: input.billingContactEmail?.trim().toLowerCase() || null,
  };

  if (input.segment === "individual") {
    return {
      segment: "individual",
      jobTitle: normalized.jobTitle,
      organizationName: null,
      organizationAddress: null,
      taxId: null,
      registrationNumber: null,
      governmentEntityType: null,
      officialReference: null,
      billingContactName: null,
      billingContactEmail: null,
    };
  }

  if (input.segment === "business") {
    return {
      segment: "business",
      organizationName: requireField(normalized.organizationName, "Organization name is required."),
      jobTitle: requireField(normalized.jobTitle, "Job title is required."),
      organizationAddress: requireField(
        normalized.organizationAddress,
        "Organization address is required.",
      ),
      taxId: requireField(normalized.taxId, "Tax ID / TIN is required."),
      registrationNumber: requireField(
        normalized.registrationNumber,
        "Business registration number is required.",
      ),
      governmentEntityType: null,
      officialReference: normalized.officialReference,
      billingContactName: normalized.billingContactName,
      billingContactEmail: normalized.billingContactEmail,
    };
  }

  return {
    segment: "government",
    organizationName: requireField(
      normalized.organizationName,
      "Government organization name is required.",
    ),
    jobTitle: requireField(normalized.jobTitle, "Job title is required."),
    organizationAddress: requireField(
      normalized.organizationAddress,
      "Organization address is required.",
    ),
    taxId: normalized.taxId,
    registrationNumber: null,
    governmentEntityType: requireField(
      normalized.governmentEntityType,
      "Government entity type is required.",
    ),
    officialReference: requireField(
      normalized.officialReference,
      "Official reference / procurement code is required.",
    ),
    billingContactName: requireField(
      normalized.billingContactName,
      "Billing contact name is required.",
    ),
    billingContactEmail: requireField(
      normalized.billingContactEmail,
      "Billing contact email is required.",
    ),
  };
}

export function toRequesterProfileCreateData(input: RequesterProfileInput) {
  return {
    segment: input.segment,
    organizationName: input.organizationName,
    jobTitle: input.jobTitle,
    organizationAddress: input.organizationAddress,
    taxId: input.taxId,
    registrationNumber: input.registrationNumber,
    governmentEntityType: input.governmentEntityType,
    officialReference: input.officialReference,
    billingContactName: input.billingContactName,
    billingContactEmail: input.billingContactEmail,
  };
}
