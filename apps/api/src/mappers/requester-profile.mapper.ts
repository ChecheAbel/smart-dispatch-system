import type { RequesterProfile, RequesterSegment } from "@smart-dispatch/types";
import type { RequesterProfile as DbRequesterProfile } from "../generated/prisma";

export function toPublicRequesterProfile(profile: DbRequesterProfile): RequesterProfile {
  return {
    segment: profile.segment as RequesterSegment,
    organization_name: profile.organizationName,
    job_title: profile.jobTitle,
    organization_address: profile.organizationAddress,
    tax_id: profile.taxId,
    registration_number: profile.registrationNumber,
    government_entity_type: profile.governmentEntityType,
    official_reference: profile.officialReference,
    billing_contact_name: profile.billingContactName,
    billing_contact_email: profile.billingContactEmail,
    created_at: profile.createdAt.toISOString(),
    updated_at: profile.updatedAt.toISOString(),
  };
}
