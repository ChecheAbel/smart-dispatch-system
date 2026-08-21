import type { DriverPerformance, DriverRatingSummary, RoleSlug, User } from "@smart-dispatch/types";
import type { RequesterProfile as DbRequesterProfile } from "../generated/prisma";
import { getDriverPerformanceSummaries, getDriverRatingSummaries } from "../models/driver.model";
import { toPublicDriverProfile } from "./driver.mapper";
import { toPublicRequesterProfile } from "./requester-profile.mapper";

type UserWithRelations = {
  id: string;
  email: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  mobileNumber: string;
  accountStatus: User["account_status"];
  accountActivation: User["account_activation"];
  accountBlockReason?: string | null;
  authRoles?: { role: { slug: string } }[];
  driverProfile?: {
    licenseNumber: string;
    licensePhotoUrl: string | null;
    licensePhotoBackUrl?: string | null;
    createdAt: Date;
  } | null;
  assignedVehicle?: {
    id: string;
    plateNumber: string;
    make: string | null;
    model: string | null;
  } | null;
  requesterProfile?: DbRequesterProfile | null;
};

export function toPublicUser(
  user: UserWithRelations,
  rating?: DriverRatingSummary | null,
  performance?: DriverPerformance | null,
): User {
  return {
    id: user.id,
    email: user.email,
    first_name: user.firstName,
    middle_name: user.middleName,
    last_name: user.lastName,
    mobile_number: user.mobileNumber,
    driver: user.driverProfile ? toPublicDriverProfile(user.driverProfile, rating, performance) : null,
    assigned_vehicle: user.assignedVehicle
      ? {
          id: user.assignedVehicle.id,
          plate_number: user.assignedVehicle.plateNumber,
          make: user.assignedVehicle.make,
          model: user.assignedVehicle.model,
        }
      : null,
    requester_profile: user.requesterProfile
      ? toPublicRequesterProfile(user.requesterProfile)
      : null,
    account_status: user.accountStatus,
    account_activation: user.accountActivation,
    account_block_reason: user.accountBlockReason ?? null,
    roles: (user.authRoles ?? []).map((authRole) => authRole.role.slug as RoleSlug),
  };
}

export async function toPublicUsers(users: UserWithRelations[]): Promise<User[]> {
  const driverIds = users.filter((user) => user.driverProfile).map((user) => user.id);
  const [ratings, performances] = await Promise.all([
    getDriverRatingSummaries(driverIds),
    getDriverPerformanceSummaries(driverIds),
  ]);

  return users.map((user) => toPublicUser(user, ratings.get(user.id), performances.get(user.id)));
}

export async function toPublicUserWithRating(user: UserWithRelations): Promise<User> {
  const [mapped] = await toPublicUsers([user]);
  return mapped;
}
