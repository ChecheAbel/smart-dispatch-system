import type {
  CustomerPaymentOptions,
  PaymentGatewayField,
  PaymentGatewayKind,
  PaymentGatewayMethod,
} from "@smart-dispatch/types";

export function createPaymentGatewayId(kind: PaymentGatewayKind) {
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
  if (method.kind === "custom") {
    return method.fields[0]?.label || "payment details";
  }
  const required = requiredFieldKeyForKind(method.kind);
  return method.fields.find((field) => field.key === required)?.label || required;
}

export function isPaymentGatewayMethodReady(method: PaymentGatewayMethod) {
  if (!method.enabled) return false;
  if (method.kind === "custom") {
    return method.fields.some((field) => field.value.trim().length > 0);
  }
  const required = requiredFieldKeyForKind(method.kind);
  return Boolean(getPaymentGatewayFieldValue(method, required));
}
