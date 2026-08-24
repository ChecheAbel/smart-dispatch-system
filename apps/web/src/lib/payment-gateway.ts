import type {
  PaymentGatewayField,
  PaymentGatewayKind,
  PaymentGatewayMethod,
  PaymentGatewaySettings,
} from "@/lib/system-settings-api";

export const PAYMENT_GATEWAY_KINDS: PaymentGatewayKind[] = ["stripe", "custom"];

export function isOnlineCheckoutKind(kind: PaymentGatewayKind) {
  return kind === "stripe";
}

export function isSecretPaymentFieldKey(key: string) {
  return key === "secret_key" || key === "webhook_secret";
}

export function maskSecretPaymentFieldValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 8) return "••••••••";
  return `${trimmed.slice(0, 7)}…${trimmed.slice(-4)}`;
}

export function createClientPaymentGatewayId(kind: PaymentGatewayKind) {
  if (kind === "stripe") return "stripe";
  return `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultFieldsForKind(kind: PaymentGatewayKind): PaymentGatewayField[] {
  if (kind === "stripe") {
    return [
      { key: "secret_key", label: "Secret key", value: "" },
      { key: "webhook_secret", label: "Webhook secret", value: "" },
    ];
  }

  return [];
}

export function defaultNameForKind(kind: PaymentGatewayKind) {
  if (kind === "stripe") return "Stripe";
  return "Payment method";
}

export function defaultDescriptionForKind(kind: PaymentGatewayKind) {
  if (kind === "stripe") return "Pay internationally with Visa, Mastercard, and other cards.";
  return "Transfer using the account details below.";
}

export function requiredFieldKeyForKind(kind: PaymentGatewayKind) {
  if (kind === "stripe") return "secret_key";
  return "";
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
  if (method.kind !== "stripe") {
    return method.fields[0]?.label || "payment details";
  }
  const required = requiredFieldKeyForKind(method.kind);
  return method.fields.find((field) => field.key === required)?.label || required;
}

export function hasRequiredDetails(method: PaymentGatewayMethod) {
  if (method.kind === "stripe") {
    return getMethodFieldValue(method, "secret_key").startsWith("sk_");
  }
  return method.fields.some((field) => field.value.trim().length > 0);
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
  if (kind === "stripe") {
    return { src: "/providers/stripe.svg", width: 140, height: 48 } as const;
  }
  return null;
}

export function providerLogoForMethodId(methodId: string) {
  if (methodId === "telebirr") {
    return { src: "/providers/telebirr.webp", width: 140, height: 48 } as const;
  }
  if (methodId === "cbe_birr") {
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

export function methodLogoSrc(
  method: Pick<PaymentGatewayMethod, "kind" | "logo_url"> & { id?: string },
) {
  const uploaded = method.logo_url?.trim();
  if (uploaded) return paymentMethodAssetUrl(uploaded);
  if (method.id) {
    const byId = providerLogoForMethodId(method.id);
    if (byId) return byId.src;
  }
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
