import type { AuthMeResponse, Permission, User } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse } from "./api-response";

export type UpdateMyProfileInput = {
  email: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  mobile_number: string;
  requester_profile?: {
    organization_name?: string | null;
    job_title?: string | null;
    organization_address?: string | null;
    tax_id?: string | null;
    registration_number?: string | null;
    government_entity_type?: string | null;
    official_reference?: string | null;
    billing_contact_name?: string | null;
    billing_contact_email?: string | null;
  };
};

export async function updateMyProfile(input: UpdateMyProfileInput) {
  const { data } = await apiClient.patch("/api/auth/me", input);
  return unwrapApiResponse<{ user: User; permissions: Permission[] }>(data);
}

export async function changeMyPassword(input: {
  current_password: string;
  new_password: string;
}) {
  const { data } = await apiClient.patch("/api/auth/password", input);
  return unwrapApiResponse<{ message: string }>(data);
}

export type { AuthMeResponse };
