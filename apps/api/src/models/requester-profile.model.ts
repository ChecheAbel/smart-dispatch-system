import type { RequesterSegment } from "@smart-dispatch/types";
import type { Prisma } from "../generated/prisma";
import { prisma } from "../db/prisma";
import type { RequesterProfileInput } from "../utils/requester-profile";
import { toRequesterProfileCreateData } from "../utils/requester-profile";

export async function createRequesterProfile(
  userId: string,
  input: RequesterProfileInput,
  tx?: Prisma.TransactionClient,
) {
  const client = tx ?? prisma;
  return client.requesterProfile.create({
    data: {
      userId,
      ...toRequesterProfileCreateData(input),
    },
  });
}

export async function findRequesterProfileByUserId(userId: string) {
  return prisma.requesterProfile.findUnique({
    where: { userId },
  });
}
