import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import multer from "multer";

const DRIVER_LICENSE_SUBDIR = "driver-licenses";

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

export function getDriverLicenseUploadDir() {
  return path.join(getUploadRoot(), DRIVER_LICENSE_SUBDIR);
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export function ensureDriverLicenseUploadDir() {
  const uploadDir = getDriverLicenseUploadDir();

  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error creating upload directory";
    throw new Error(
      `Failed to create upload directory at ${uploadDir}. Check UPLOAD_ROOT in .env (${message}).`,
    );
  }
}

function buildStoredFilename(mimetype: string) {
  const extension = MIME_TO_EXTENSION[mimetype] ?? "";
  return `${crypto.randomUUID()}${extension}`;
}

export const driverLicensePhotoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      ensureDriverLicenseUploadDir();
      callback(null, getDriverLicenseUploadDir());
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
      callback(new Error("Driver license photo must be a JPG, PNG, or WEBP image."));
      return;
    }

    callback(null, true);
  },
});

export function buildDriverLicensePhotoUrl(filename: string) {
  return `/uploads/driver-licenses/${filename}`;
}

export const DRIVER_LICENSE_PHOTO_MAX_SIZE_BYTES = MAX_FILE_SIZE_BYTES;
export const DRIVER_LICENSE_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
