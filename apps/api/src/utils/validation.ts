import type { AccountActivation, AccountStatus } from "@smart-dispatch/types";

const ACCOUNT_STATUSES: AccountStatus[] = ["active", "suspended", "deactivated"];
const ACCOUNT_ACTIVATIONS: AccountActivation[] = ["pending", "activated"];

export function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function getOptionalString(value: unknown) {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function getStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function getRoleTranslations(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const locale = getString(record.locale);
      const name = getString(record.name);
      if (!locale || !name) return null;

      return {
        locale,
        name,
        description: getOptionalString(record.description),
      };
    })
    .filter((item): item is { locale: string; name: string; description: string | null } =>
      Boolean(item),
    );
}

export function parseAccountStatus(value: unknown): AccountStatus | undefined {
  if (typeof value !== "string") return undefined;
  return ACCOUNT_STATUSES.includes(value as AccountStatus) ? (value as AccountStatus) : undefined;
}

export function parseAccountActivation(value: unknown): AccountActivation | undefined {
  if (typeof value !== "string") return undefined;
  return ACCOUNT_ACTIVATIONS.includes(value as AccountActivation)
    ? (value as AccountActivation)
    : undefined;
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
