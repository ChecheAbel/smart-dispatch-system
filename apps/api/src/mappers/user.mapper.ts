import type { RoleSlug, User } from "@smart-dispatch/types";
import { toPublicDriverProfile } from "./driver.mapper";

type UserWithRelations = {
  id: string;
  email: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  mobileNumber: string;
  accountStatus: User["account_status"];
  accountActivation: User["account_activation"];
  authRoles?: { role: { slug: string } }[];
  driverProfile?: {
    licenseNumber: string;
    licensePhotoUrl: string | null;
  } | null;
};

export function toPublicUser(user: UserWithRelations): User {
  return {
    id: user.id,
    email: user.email,
    first_name: user.firstName,
    middle_name: user.middleName,
    last_name: user.lastName,
    mobile_number: user.mobileNumber,
    driver: user.driverProfile ? toPublicDriverProfile(user.driverProfile) : null,
    account_status: user.accountStatus,
    account_activation: user.accountActivation,
    roles: (user.authRoles ?? []).map((authRole) => authRole.role.slug as RoleSlug),
  };
}
