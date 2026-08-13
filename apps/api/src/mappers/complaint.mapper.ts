import type { ComplaintWithRelations } from "../models/complaint.model";

function person(user: ComplaintWithRelations["requester"]) {
  return {
    id: user.id,
    name: [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" "),
    email: user.email,
    mobile_number: user.mobileNumber,
  };
}

export function toPublicComplaint(complaint: ComplaintWithRelations) {
  return {
    id: complaint.id,
    reference_number: complaint.referenceNumber,
    requester_user_id: complaint.requesterUserId,
    ride_request_id: complaint.rideRequestId,
    assigned_to_user_id: complaint.assignedToUserId,
    category: complaint.category,
    subject: complaint.subject,
    description: complaint.description,
    status: complaint.status,
    priority: complaint.priority,
    admin_response: complaint.adminResponse,
    resolved_at: complaint.resolvedAt?.toISOString() ?? null,
    created_at: complaint.createdAt.toISOString(),
    updated_at: complaint.updatedAt.toISOString(),
    requester: person(complaint.requester),
    assigned_to: complaint.assignedTo ? person(complaint.assignedTo) : null,
    ride_request: complaint.rideRequest
      ? {
          id: complaint.rideRequest.id,
          pickup_address: complaint.rideRequest.pickupAddress,
          dropoff_address: complaint.rideRequest.dropoffAddress,
          status: complaint.rideRequest.status,
        }
      : null,
  };
}
