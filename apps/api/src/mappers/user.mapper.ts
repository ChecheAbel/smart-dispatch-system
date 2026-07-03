import type { RoleSlug, User } from "@smart-dispatch/types";

type UserWithRoles = {
  id: string;
  email: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  mobileNumber: string;
  accountStatus: User["account_status"];
  accountActivation: User["account_activation"];
  authRoles?: { role: { slug: string } }[];
};

export function toPublicUser(user: UserWithRoles): User {
  return {
    id: user.id,
    email: user.email,
    first_name: user.firstName,
    middle_name: user.middleName,
    last_name: user.lastName,
    mobile_number: user.mobileNumber,
    account_status: user.accountStatus,
    account_activation: user.accountActivation,
    roles: (user.authRoles ?? []).map((authRole) => authRole.role.slug as RoleSlug),
  };
}
