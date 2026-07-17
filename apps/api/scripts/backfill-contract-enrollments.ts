/**
 * One-off: ensure enrollments exist for contract rides already confirmed /
 * in_progress / completed (skipped by the old assign path).
 *
 * Usage: pnpm exec tsx scripts/backfill-contract-enrollments.ts
 */
import type { ContractBillingInterval } from "@smart-dispatch/types";
import { prisma } from "../src/db/prisma";
import { ensureContractEnrollment } from "../src/models/contract-enrollment.model";

async function main() {
  const rides = await prisma.rideRequest.findMany({
    where: {
      contractId: { not: null },
      status: { in: ["confirmed", "in_progress", "completed"] },
    },
    select: {
      id: true,
      status: true,
      contractId: true,
      requesterUserId: true,
      scheduledAt: true,
      assignedAt: true,
      startedAt: true,
      createdAt: true,
      contract: {
        select: {
          referenceNumber: true,
          billingInterval: true,
          title: true,
        },
      },
      requester: {
        select: { email: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  console.log(`Found ${rides.length} contract ride(s) to check.\n`);

  let created = 0;
  let alreadyHad = 0;

  for (const ride of rides) {
    if (!ride.contractId || !ride.contract) continue;

    const priorCount = await prisma.contractEnrollment.count({
      where: {
        contractId: ride.contractId,
        requesterUserId: ride.requesterUserId,
      },
    });

    const acceptedAt = ride.assignedAt ?? ride.startedAt ?? ride.createdAt;
    const enrollment = await ensureContractEnrollment({
      contractId: ride.contractId,
      requesterUserId: ride.requesterUserId,
      scheduledAt: ride.scheduledAt,
      acceptedAt,
      billingInterval: ride.contract.billingInterval as ContractBillingInterval,
    });

    const afterCount = await prisma.contractEnrollment.count({
      where: {
        contractId: ride.contractId,
        requesterUserId: ride.requesterUserId,
      },
    });

    const label = `${ride.status} | ${ride.contract.referenceNumber} | ${ride.requester?.email ?? ride.requesterUserId}`;

    if (afterCount > priorCount) {
      created += 1;
      console.log(
        `CREATED  ${ride.id}  ${label}\n` +
          `         period ${enrollment.startsAt.toISOString().slice(0, 10)} → ${enrollment.endsAt.toISOString().slice(0, 10)}`,
      );
    } else {
      alreadyHad += 1;
      console.log(`EXISTS   ${ride.id}  ${label}`);
    }
  }

  console.log(`\nDone. created=${created} already_had=${alreadyHad}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
