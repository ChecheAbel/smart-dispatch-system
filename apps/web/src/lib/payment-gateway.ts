import type {
  PaymentGatewayField,
  PaymentGatewayKind,
  PaymentGatewayMethod,
  PaymentGatewaySettings,
} from "@/lib/system-settings-api";

export function createClientPaymentGatewayId(kind: PaymentGatewayKind) {
  if (kind === "telebirr") return "telebirr";
  if (kind === "cbe_birr") return "cbe_birr";
  return `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultFieldsForKind(kind: PaymentGatewayKind): PaymentGatewayField[] {
  if (kind === "telebirr") {
    return [
      { key: "merchant_name", label: "Merchant name", value: "" },
      { key: "short_code", label: "Short code", value: "" },
      { key: "ussd", label: "USSD", value: "*127#" },
    ];
  }

  if (kind === "cbe_birr") {
    return [
      { key: "account_name", label: "Account name", value: "" },
      { key: "account_number", label: "Account number", value: "" },
    ];
  }

  return [];
}

export function defaultNameForKind(kind: PaymentGatewayKind) {
  if (kind === "telebirr") return "Telebirr";
  if (kind === "cbe_birr") return "CBE Birr";
  return "Bank transfer";
}

export function defaultDescriptionForKind(kind: PaymentGatewayKind) {
  if (kind === "telebirr") return "Pay from the Telebirr app or USSD.";
  if (kind === "cbe_birr") return "Transfer via Commercial Bank of Ethiopia (CBE Birr).";
  return "Transfer using the account details below.";
}

export function requiredFieldKeyForKind(kind: PaymentGatewayKind) {
  if (kind === "telebirr") return "short_code";
  return "account_number";
}

export function createPaymentGatewayMethod(
  kind: PaymentGatewayKind,
  overrides: Partial<PaymentGatewayMethod> = {},
): PaymentGatewayMethod {
  return {
    id: overrides.id ?? createClientPaymentGatewayId(kind),
    kind,
    name: overrides.name ?? defaultNameForKind(kind),
    description:
      overrides.description === undefined
        ? defaultDescriptionForKind(kind)
        : overrides.description,
    enabled: overrides.enabled ?? true,
    sort_order: overrides.sort_order ?? 0,
    logo_url: overrides.logo_url === undefined ? null : overrides.logo_url,
    fields: overrides.fields ?? defaultFieldsForKind(kind),
  };
}

export function getMethodFieldValue(method: PaymentGatewayMethod, key: string) {
  return method.fields.find((field) => field.key === key)?.value.trim() || "";
}

export function requiredFieldLabel(method: PaymentGatewayMethod) {
  if (method.kind === "custom") {
    return method.fields[0]?.label || "payment details";
  }
  const required = requiredFieldKeyForKind(method.kind);
  return method.fields.find((field) => field.key === required)?.label || required;
}

export function hasRequiredDetails(method: PaymentGatewayMethod) {
  if (method.kind === "custom") {
    return method.fields.some((field) => field.value.trim().length > 0);
  }
  return Boolean(getMethodFieldValue(method, requiredFieldKeyForKind(method.kind)));
}

export function isMethodReady(method: PaymentGatewayMethod) {
  return method.enabled && hasRequiredDetails(method);
}

export function nextCustomFieldKey() {
  return `field_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function slugifyPaymentFieldKey(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64);
}

export function paymentFieldLabelFromKey(raw: string) {
  const typed = raw.trim();
  if (!typed) return "";
  if (/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/i.test(typed)) {
    return typed.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  }
  return typed;
}

export function normalizePaymentField(
  rawKey: string,
  value: string,
): PaymentGatewayField | null {
  const key = slugifyPaymentFieldKey(rawKey);
  if (!key) return null;
  return {
    key,
    label: paymentFieldLabelFromKey(rawKey) || key,
    value: value.trim(),
  };
}

export function providerLogoForKind(kind: PaymentGatewayKind) {
  if (kind === "telebirr") {
    return { src: "/providers/telebirr.webp", width: 140, height: 48 } as const;
  }
  if (kind === "cbe_birr") {
    return { src: "/providers/cbe-birr.webp", width: 140, height: 48 } as const;
  }
  return null;
}

export const PAYMENT_METHOD_LOGO_ACCEPT = "image/jpeg,image/png,image/webp";
export const PAYMENT_METHOD_LOGO_MAX_BYTES = 5 * 1024 * 1024;

export function paymentMethodAssetUrl(logoUrl: string) {
  if (
    logoUrl.startsWith("http://") ||
    logoUrl.startsWith("https://") ||
    logoUrl.startsWith("data:") ||
    logoUrl.startsWith("blob:")
  ) {
    return logoUrl;
  }

  if (logoUrl.startsWith("/") && !logoUrl.startsWith("/uploads/")) {
    return logoUrl;
  }

  const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(
    /\/$/,
    "",
  );
  return `${base}${logoUrl.startsWith("/") ? logoUrl : `/${logoUrl}`}`;
}

export function methodLogoSrc(method: Pick<PaymentGatewayMethod, "kind" | "logo_url">) {
  const uploaded = method.logo_url?.trim();
  if (uploaded) return paymentMethodAssetUrl(uploaded);
  return providerLogoForKind(method.kind)?.src ?? null;
}

export function resolvePaymentMethodLabel(
  methodId: string | null | undefined,
  options: PaymentGatewaySettings | null,
  fallbacks: Record<string, string>,
) {
  if (!methodId) return fallbacks.notRecorded ?? "Not recorded";
  if (methodId === "manual") return fallbacks.manual ?? "Marked paid by an administrator";

  const configured = options?.methods.find((method) => method.id === methodId);
  if (configured) return configured.name;

  return fallbacks[methodId] ?? methodId;
}
