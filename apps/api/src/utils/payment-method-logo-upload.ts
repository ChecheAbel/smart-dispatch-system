import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import multer from "multer";

const PAYMENT_METHODS_SUBDIR = "payment-methods";

function expandHomePath(value: string) {
  if (value === "~") {
    return os.homedir();
  }

  if (value.startsWith("~/") || value.startsWith("~\\")) {
    return path.join(os.homedir(), value.slice(2));
  }

  return value;
}

function getUploadRoot() {
  const configuredRoot = process.env.UPLOAD_ROOT?.trim();
  if (!configuredRoot) {
    throw new Error("UPLOAD_ROOT is required. Set it in apps/api/.env (see .env.example).");
  }

  const expandedRoot = expandHomePath(configuredRoot);
  return path.isAbsolute(expandedRoot)
    ? expandedRoot
    : path.resolve(expandedRoot);
}

export function getPaymentMethodLogoUploadDir() {
  return path.join(getUploadRoot(), PAYMENT_METHODS_SUBDIR);
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/x-webp"]);

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/x-webp": ".webp",
};

export function ensurePaymentMethodLogoUploadDir() {
  const uploadDir = getPaymentMethodLogoUploadDir();

  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error creating upload directory";
    throw new Error(
      `Failed to create payment method logo directory at ${uploadDir}. Check UPLOAD_ROOT in .env (${message}).`,
    );
  }
}

function buildStoredFilename(mimetype: string) {
  const extension = MIME_TO_EXTENSION[mimetype] ?? ".webp";
  return `logo-${crypto.randomUUID()}${extension}`;
}

export const paymentMethodLogoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      ensurePaymentMethodLogoUploadDir();
      callback(null, getPaymentMethodLogoUploadDir());
    },
    filename: (_req, file, callback) => {
      callback(null, buildStoredFilename(file.mimetype));
    },
  }),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(new Error("Payment method logo must be a JPG, PNG, or WEBP image."));
      return;
    }

    callback(null, true);
  },
});

export function buildPaymentMethodLogoUrl(filename: string) {
  return `/uploads/payment-methods/${filename}`;
}

export function removePaymentMethodLogoFile(logoUrl: string | null | undefined) {
  if (!logoUrl || !logoUrl.startsWith("/uploads/payment-methods/")) {
    return;
  }

  const filename = path.basename(logoUrl);
  if (!filename || filename.includes("..")) {
    return;
  }

  const filePath = path.join(getPaymentMethodLogoUploadDir(), filename);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Best-effort cleanup; ignore filesystem errors.
  }
}

export const PAYMENT_METHOD_LOGO_MAX_SIZE_BYTES = MAX_FILE_SIZE_BYTES;
export const PAYMENT_METHOD_LOGO_ACCEPT = "image/jpeg,image/png,image/webp";
