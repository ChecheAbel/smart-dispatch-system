import type {
  CustomerPaymentOptions,
  PaymentGatewayField,
  PaymentGatewayKind,
  PaymentGatewayMethod,
} from "@smart-dispatch/types";

export const SECRET_PAYMENT_FIELD_KEYS = ["secret_key", "webhook_secret"] as const;

export function isSecretPaymentFieldKey(key: string) {
  return SECRET_PAYMENT_FIELD_KEYS.includes(key as (typeof SECRET_PAYMENT_FIELD_KEYS)[number]);
}

export function isOnlineCheckoutKind(kind: PaymentGatewayKind) {
  return kind === "stripe";
}

export function createPaymentGatewayId(kind: PaymentGatewayKind) {
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

function fieldValue(fields: PaymentGatewayField[], key: string) {
  return fields.find((field) => field.key === key)?.value.trim() || null;
}

export function createPaymentGatewayMethod(
  kind: PaymentGatewayKind,
  overrides: Partial<PaymentGatewayMethod> = {},
): PaymentGatewayMethod {
  return {
    id: overrides.id ?? createPaymentGatewayId(kind),
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

/** Empty until an admin adds methods in System Settings → Payment Gateway. */
export function getPaymentGatewayDefaultsFromEnv(): CustomerPaymentOptions {
  return { methods: [] };
}

export function getPaymentGatewayFieldValue(
  method: PaymentGatewayMethod,
  key: string,
) {
  return fieldValue(method.fields, key);
}

export function requiredFieldLabel(method: PaymentGatewayMethod) {
  if (method.kind !== "stripe") {
    return method.fields[0]?.label || "payment details";
  }
  const required = requiredFieldKeyForKind(method.kind);
  return method.fields.find((field) => field.key === required)?.label || required;
}

export function isPaymentGatewayMethodReady(method: PaymentGatewayMethod) {
  if (!method.enabled) return false;
  if (method.kind === "stripe") {
    return Boolean(getPaymentGatewayFieldValue(method, "secret_key")?.startsWith("sk_"));
  }
  return method.fields.some((field) => field.value.trim().length > 0);
}

export function toPublicPaymentGatewaySettings(
  settings: CustomerPaymentOptions,
): CustomerPaymentOptions {
  return {
    methods: settings.methods.map((method) => ({
      ...method,
      fields: isOnlineCheckoutKind(method.kind)
        ? []
        : method.fields.filter((field) => !isSecretPaymentFieldKey(field.key)),
    })),
  };
}
