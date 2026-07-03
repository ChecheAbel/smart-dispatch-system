import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { findRolesByUserId } from "../models/role.model";
import {
  createToken,
  findValidTokenByHash,
  revokeToken,
  revokeUserTokensByType,
} from "../models/token.model";
import type { DbUser } from "../db/types";
import type { AuthTokenResponse, Permission, RoleSlug, User } from "@smart-dispatch/types";
import { findUserByEmail, findUserById, updateUserPassword } from "../models/user.model";
import { findPermissionsByUserId } from "../models/permission.model";
import { toPublicPermission } from "../mappers/permission.mapper";

const ACCESS_TOKEN_TTL_SECONDS = 60 * 15;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return secret;
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateOpaqueToken() {
  return crypto.randomBytes(48).toString("hex");
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isAccountUsable(user: DbUser) {
  return user.accountStatus === "active" && user.accountActivation === "activated";
}

async function toSafeUser(user: DbUser): Promise<User> {
  const roles = await findRolesByUserId(user.id);
  return {
    id: user.id,
    email: user.email,
    first_name: user.firstName,
    middle_name: user.middleName,
    last_name: user.lastName,
    mobile_number: user.mobileNumber,
    account_status: user.accountStatus,
    account_activation: user.accountActivation,
    roles: roles.map((role) => role.slug as RoleSlug),
  };
}

function signAccessToken(user: User) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    },
    getJwtSecret(),
    { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
  );
}

export async function getUserPermissions(userId: string): Promise<Permission[]> {
  const permissions = await findPermissionsByUserId(userId);
  return permissions.map((permission) => toPublicPermission(permission));
}

async function issueTokenPair(user: DbUser): Promise<AuthTokenResponse> {
  const safeUser = await toSafeUser(user);
  const permissions = await getUserPermissions(user.id);
  const accessToken = signAccessToken(safeUser);
  const refreshToken = generateOpaqueToken();

  await revokeUserTokensByType(user.id, "refresh");
  await createToken(
    user.id,
    hashToken(refreshToken),
    "refresh",
    new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  );

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    user: safeUser,
    permissions,
  };
}

export async function loginWithPassword(email: string, password: string) {
  if (!isValidEmail(email)) {
    throw new AuthError("A valid email address is required.", 400);
  }

  if (!password) {
    throw new AuthError("Password is required.", 400);
  }

  const user = await findUserByEmail(email);
  if (!user || !isAccountUsable(user)) {
    throw new AuthError("Invalid email or password.", 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new AuthError("Invalid email or password.", 401);
  }

  return issueTokenPair(user);
}

export async function refreshAccessToken(refreshToken: string) {
  if (!refreshToken) {
    throw new AuthError("Refresh token is required.", 400);
  }

  const tokenRecord = await findValidTokenByHash(hashToken(refreshToken), "refresh");
  if (!tokenRecord) {
    throw new AuthError("Invalid or expired refresh token.", 401);
  }

  const user = await findUserById(tokenRecord.userId);
  if (!user || !isAccountUsable(user)) {
    throw new AuthError("User account is not available.", 401);
  }

  await revokeToken(tokenRecord.id);
  return issueTokenPair(user);
}

export async function logout(refreshToken: string) {
  if (!refreshToken) {
    throw new AuthError("Refresh token is required.", 400);
  }

  const tokenRecord = await findValidTokenByHash(hashToken(refreshToken), "refresh");
  if (tokenRecord) {
    await revokeToken(tokenRecord.id);
  }

  return { message: "Logged out successfully." };
}

export async function requestPasswordReset(email: string) {
  if (!isValidEmail(email)) {
    throw new AuthError("A valid email address is required.", 400);
  }

  const user = await findUserByEmail(email);
  if (user && isAccountUsable(user)) {
    const resetToken = generateOpaqueToken();
    await revokeUserTokensByType(user.id, "password_reset");
    await createToken(
      user.id,
      hashToken(resetToken),
      "password_reset",
      new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    );

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const resetLink = `${appUrl}/U@RQ$f/reset-password?token=${resetToken}`;
    console.log(`[Password Reset Invitation] ${user.email}`);
    console.log(`[Password Reset Link] ${resetLink}`);
  }

  return {
    message:
      "If an administrator account exists for this email, a password reset invitation has been sent.",
  };
}

export async function resetPasswordWithToken(token: string, password: string) {
  if (!token) {
    throw new AuthError("Reset token is required.", 400);
  }

  if (!password || password.length < 8) {
    throw new AuthError("Password must be at least 8 characters.", 400);
  }

  const tokenRecord = await findValidTokenByHash(hashToken(token), "password_reset");
  if (!tokenRecord) {
    throw new AuthError("This reset invitation is invalid or has already been used.", 400);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await updateUserPassword(tokenRecord.userId, passwordHash);
  await revokeToken(tokenRecord.id);
  await revokeUserTokensByType(tokenRecord.userId, "refresh");

  return { message: "Your password has been reset. You can now sign in." };
}

export async function getUserFromAccessToken(accessToken: string) {
  try {
    const payload = jwt.verify(accessToken, getJwtSecret()) as jwt.JwtPayload;
    if (!payload.sub || typeof payload.sub !== "string") {
      throw new AuthError("Invalid access token.", 401);
    }

    const user = await findUserById(payload.sub);
    if (!user || !isAccountUsable(user)) {
      throw new AuthError("User account is not available.", 401);
    }

    return toSafeUser(user);
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError("Invalid or expired access token.", 401);
  }
}

export class AuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}
