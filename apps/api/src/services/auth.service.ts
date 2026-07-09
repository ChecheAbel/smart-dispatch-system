import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { findRoleBySlug, findRolesByUserId } from "../models/role.model";
import {
  createToken,
  findValidTokenByHash,
  revokeToken,
  revokeUserTokensByType,
} from "../models/token.model";
import type { DbUser } from "../db/types";
import type { AuthTokenResponse, Permission, RoleSlug, User } from "@smart-dispatch/types";
import { findUserByEmail, findUserById, findUserByMobileNumber, updateUser, updateUserPassword } from "../models/user.model";
import { findDriverByLicenseNumber, findDriverByUserId } from "../models/driver.model";
import { findPermissionsByUserId } from "../models/permission.model";
import { toPublicPermission } from "../mappers/permission.mapper";
import { toPublicDriverProfile } from "../mappers/driver.mapper";
import { toPublicRequesterProfile } from "../mappers/requester-profile.mapper";
import { findRequesterProfileByUserId } from "../models/requester-profile.model";
import { createRequesterProfile } from "../models/requester-profile.model";
import { prisma } from "../db/prisma";
import type { RequesterProfileInput } from "../utils/requester-profile";
import {
  isValidEmail,
  normalizeEthiopianMobileNumber,
} from "../utils/validation";

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

function isAccountUsable(user: DbUser) {
  return user.accountStatus === "active" && user.accountActivation === "activated";
}

async function toSafeUser(user: DbUser): Promise<User> {
  const [roles, driverProfile, requesterProfile] = await Promise.all([
    findRolesByUserId(user.id),
    findDriverByUserId(user.id),
    findRequesterProfileByUserId(user.id),
  ]);

  return {
    id: user.id,
    email: user.email,
    first_name: user.firstName,
    middle_name: user.middleName,
    last_name: user.lastName,
    mobile_number: user.mobileNumber,
    driver: driverProfile ? toPublicDriverProfile(driverProfile) : null,
    requester_profile: requesterProfile ? toPublicRequesterProfile(requesterProfile) : null,
    account_status: user.accountStatus,
    account_activation: user.accountActivation,
    account_block_reason: user.accountBlockReason ?? null,
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
  if (!user) {
    throw new AuthError("Invalid email or password.", 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new AuthError("Invalid email or password.", 401);
  }

  if (!isAccountUsable(user)) {
    if (user.accountStatus === "deactivated") {
      throw new AuthError("Your account has been rejected.", 403, {
        accountBlockReason: user.accountBlockReason,
      });
    }

    if (user.accountActivation === "pending") {
      throw new AuthError("Your account is pending administrator approval.", 403);
    }

    if (user.accountStatus === "suspended") {
      throw new AuthError("Your account has been suspended.", 403);
    }

    throw new AuthError("Your account is not available.", 403);
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

export async function registerDriverApplication(input: {
  email: string;
  password: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  mobileNumber: string;
  driverLicenseNumber: string;
  driverLicensePhotoUrl: string;
}) {
  const email = input.email.trim().toLowerCase();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const mobileNumber = input.mobileNumber.trim();
  const middleName = input.middleName?.trim() || null;
  const driverLicenseNumber = input.driverLicenseNumber.trim().toUpperCase();
  const driverLicensePhotoUrl = input.driverLicensePhotoUrl.trim();

  if (!isValidEmail(email)) {
    throw new AuthError("A valid email address is required.", 400);
  }

  if (!input.password || input.password.length < 8) {
    throw new AuthError("Password must be at least 8 characters.", 400);
  }

  if (!firstName || !lastName || !mobileNumber || !driverLicenseNumber || !driverLicensePhotoUrl) {
    throw new AuthError(
      "First name, last name, mobile number, driver license number, and license photo are required.",
      400,
    );
  }

  const driverRole = await findRoleBySlug("driver");
  if (!driverRole) {
    throw new AuthError("Driver registration is temporarily unavailable.", 503);
  }

  const existingEmail = await findUserByEmail(email);
  if (existingEmail) {
    throw new AuthError("An account with this email already exists.", 409);
  }

  const existingMobile = await findUserByMobileNumber(mobileNumber);
  if (existingMobile) {
    throw new AuthError("This mobile number is already registered.", 409);
  }

  const existingLicense = await findDriverByLicenseNumber(driverLicenseNumber);
  if (existingLicense) {
    throw new AuthError("This driver license number is already registered.", 409);
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        middleName,
        lastName,
        mobileNumber,
        accountStatus: "active",
        accountActivation: "pending",
      },
    });

    await tx.authRole.create({
      data: {
        userId: user.id,
        roleId: driverRole.id,
      },
    });

    await tx.driver.create({
      data: {
        userId: user.id,
        licenseNumber: driverLicenseNumber,
        licensePhotoUrl: driverLicensePhotoUrl,
      },
    });
  });

  return {
    message:
      "Your application has been submitted. We will review your details and notify you once your account is activated.",
  };
}

export async function registerUserApplication(input: {
  email: string;
  password: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  mobileNumber: string;
  requesterProfile: RequesterProfileInput;
}) {
  const email = input.email.trim().toLowerCase();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const mobileNumber = input.mobileNumber.trim();
  const middleName = input.middleName?.trim() || null;

  if (!isValidEmail(email)) {
    throw new AuthError("A valid email address is required.", 400);
  }

  if (!input.password || input.password.length < 8) {
    throw new AuthError("Password must be at least 8 characters.", 400);
  }

  if (!firstName || !lastName || !mobileNumber) {
    throw new AuthError("First name, last name, and mobile number are required.", 400);
  }

  const existingEmail = await findUserByEmail(email);
  if (existingEmail) {
    throw new AuthError("An account with this email already exists.", 409);
  }

  const existingMobile = await findUserByMobileNumber(mobileNumber);
  if (existingMobile) {
    throw new AuthError("This mobile number is already registered.", 409);
  }

  const userRole = await findRoleBySlug("user");
  if (!userRole) {
    throw new AuthError("User registration is temporarily unavailable.", 503);
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  let createdUserId = "";

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        middleName,
        lastName,
        mobileNumber,
        accountStatus: "active",
        accountActivation: "pending",
      },
    });

    createdUserId = user.id;

    await tx.authRole.create({
      data: {
        userId: user.id,
        roleId: userRole.id,
      },
    });

    await createRequesterProfile(user.id, input.requesterProfile, tx);
  });

  return {
    message:
      "Your account has been created. We will review your details and notify you once your account is activated.",
    userId: createdUserId,
  };
}

function normalizeAccessToken(accessToken: string) {
  const trimmed = accessToken.trim();
  if (trimmed.startsWith("Bearer ")) {
    return trimmed.slice("Bearer ".length).trim();
  }
  return trimmed;
}

export async function getUserFromAccessToken(accessToken: string) {
  try {
    const payload = jwt.verify(normalizeAccessToken(accessToken), getJwtSecret()) as jwt.JwtPayload;
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

export async function updateMyProfile(
  userId: string,
  input: {
    email: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    mobileNumber: string;
  },
) {
  const email = input.email.trim().toLowerCase();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const middleName = input.middleName?.trim() || null;
  const mobileNumber = normalizeEthiopianMobileNumber(input.mobileNumber);

  if (!isValidEmail(email)) {
    throw new AuthError("A valid email address is required.", 400);
  }

  if (!firstName || !lastName) {
    throw new AuthError("First name and last name are required.", 400);
  }

  if (!mobileNumber) {
    throw new AuthError("A valid mobile number is required.", 400);
  }

  const existingEmail = await findUserByEmail(email);
  if (existingEmail && existingEmail.id !== userId) {
    throw new AuthError("An account with this email already exists.", 409);
  }

  const existingMobile = await findUserByMobileNumber(mobileNumber);
  if (existingMobile && existingMobile.id !== userId) {
    throw new AuthError("This mobile number is already registered.", 409);
  }

  await updateUser(userId, {
    email,
    firstName,
    middleName,
    lastName,
    mobileNumber,
  });

  const user = await findUserById(userId);
  if (!user) {
    throw new AuthError("User not found.", 404);
  }

  return {
    user: await toSafeUser(user),
    permissions: await getUserPermissions(userId),
  };
}

export async function changeMyPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  if (!currentPassword) {
    throw new AuthError("Current password is required.", 400);
  }

  if (!newPassword || newPassword.length < 8) {
    throw new AuthError("Password must be at least 8 characters.", 400);
  }

  const user = await findUserById(userId);
  if (!user) {
    throw new AuthError("User not found.", 404);
  }

  const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!passwordMatches) {
    throw new AuthError("Current password is incorrect.", 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await updateUserPassword(userId, passwordHash);
  await revokeUserTokensByType(userId, "refresh");

  return { message: "Password updated successfully." };
}

export class AuthError extends Error {
  status: number;
  accountBlockReason?: string | null;

  constructor(
    message: string,
    status: number,
    options?: { accountBlockReason?: string | null },
  ) {
    super(message);
    this.name = "AuthError";
    this.status = status;
    this.accountBlockReason = options?.accountBlockReason ?? null;
  }
}
