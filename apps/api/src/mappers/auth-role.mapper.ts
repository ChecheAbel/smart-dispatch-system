import type { AuthRole, User } from "@smart-dispatch/types";
import { toPublicRole } from "./role.mapper";
import { toPublicUser } from "./user.mapper";

type DbAuthRole = {
  userId: string;
  roleId: string;
  assignedAt: Date;
  user?: Parameters<typeof toPublicUser>[0];
  role?: Parameters<typeof toPublicRole>[0];
};

export function toPublicAuthRole(
  authRole: DbAuthRole,
  options?: { locale?: string },
): AuthRole {
  const result: AuthRole = {
    user_id: authRole.userId,
    role_id: authRole.roleId,
    assigned_at: authRole.assignedAt.toISOString(),
  };

  if (authRole.user) {
    result.user = toPublicUser(authRole.user);
  }

  if (authRole.role) {
    result.role = toPublicRole(authRole.role, {
      locale: options?.locale,
      includeAllTranslations: true,
    });
  }

  return result;
}
