import type { ContractEnrollment } from "@smart-dispatch/types";
import type { listEnrollmentsByContractId } from "../models/contract-enrollment.model";
import { formatContractDate } from "../models/contract.model";

type DbContractEnrollment = Awaited<ReturnType<typeof listEnrollmentsByContractId>>[number];

function formatRequesterName(requester: DbContractEnrollment["requester"]) {
  return [requester.firstName, requester.middleName, requester.lastName].filter(Boolean).join(" ");
}

export function toPublicContractEnrollment(enrollment: DbContractEnrollment): ContractEnrollment {
  return {
    id: enrollment.id,
    contract_id: enrollment.contractId,
    requester_user_id: enrollment.requesterUserId,
    requester: {
      id: enrollment.requester.id,
      name: formatRequesterName(enrollment.requester),
      email: enrollment.requester.email,
      mobile_number: enrollment.requester.mobileNumber,
    },
    starts_at: formatContractDate(enrollment.startsAt) ?? "",
    ends_at: formatContractDate(enrollment.endsAt) ?? "",
    created_at: enrollment.createdAt.toISOString(),
  };
}

export function toPublicContractEnrollments(enrollments: DbContractEnrollment[]) {
  return enrollments.map((enrollment) => toPublicContractEnrollment(enrollment));
}
