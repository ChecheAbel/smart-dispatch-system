import type { ComplaintCategory, ComplaintPriority, ComplaintStatus, Prisma } from "../generated/prisma";
import { prisma } from "../db/prisma";

export const complaintInclude = {
  requester: true,
  assignedTo: true,
  rideRequest: true,
} satisfies Prisma.ComplaintInclude;

export type ComplaintWithRelations = Prisma.ComplaintGetPayload<{ include: typeof complaintInclude }>;

export type ComplaintFilters = {
  search?: string;
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
  category?: ComplaintCategory;
  requesterUserId?: string;
};

function complaintWhere(filters: ComplaintFilters): Prisma.ComplaintWhereInput {
  return {
    ...(filters.requesterUserId ? { requesterUserId: filters.requesterUserId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.search
      ? {
          OR: [
            { referenceNumber: { contains: filters.search, mode: "insensitive" } },
            { subject: { contains: filters.search, mode: "insensitive" } },
            { description: { contains: filters.search, mode: "insensitive" } },
            { requester: { firstName: { contains: filters.search, mode: "insensitive" } } },
            { requester: { lastName: { contains: filters.search, mode: "insensitive" } } },
            { requester: { email: { contains: filters.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

export function countComplaints(filters: ComplaintFilters) {
  return prisma.complaint.count({ where: complaintWhere(filters) });
}

export function listComplaints(filters: ComplaintFilters, pagination: { skip: number; take: number }) {
  return prisma.complaint.findMany({
    where: complaintWhere(filters),
    include: complaintInclude,
    orderBy: { createdAt: "desc" },
    ...pagination,
  });
}

export function findComplaintById(id: string) {
  return prisma.complaint.findUnique({ where: { id }, include: complaintInclude });
}

export function findComplaintForRequester(id: string, requesterUserId: string) {
  return prisma.complaint.findFirst({ where: { id, requesterUserId }, include: complaintInclude });
}

export function createComplaint(input: {
  referenceNumber: string;
  requesterUserId: string;
  rideRequestId?: string | null;
  category: ComplaintCategory;
  subject: string;
  description: string;
}) {
  return prisma.complaint.create({ data: input, include: complaintInclude });
}

export function updateComplaint(id: string, input: {
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
  assignedToUserId?: string | null;
  adminResponse?: string | null;
  resolvedAt?: Date | null;
}) {
  return prisma.complaint.update({ where: { id }, data: input, include: complaintInclude });
}

export async function getComplaintSummary(requesterUserId?: string) {
  const where = requesterUserId ? { requesterUserId } : {};
  const [total, open, urgent, resolved] = await Promise.all([
    prisma.complaint.count({ where }),
    prisma.complaint.count({ where: { ...where, status: { in: ["submitted", "under_review", "in_progress"] } } }),
    prisma.complaint.count({ where: { ...where, priority: "urgent", status: { notIn: ["resolved", "closed", "rejected"] } } }),
    prisma.complaint.count({ where: { ...where, status: { in: ["resolved", "closed"] } } }),
  ]);
  return { total, open, urgent, resolved };
}
