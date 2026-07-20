import type { CustomerPaymentOptions } from "@smart-dispatch/types";

function envFlag(name: string, defaultValue = true) {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return value === "true" || value === "1";
}

function envString(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function getCustomerPaymentOptions(): CustomerPaymentOptions {
  const telebirrShortCode = envString("PAYMENT_TELEBIRR_SHORT_CODE");
  const cbeAccount = envString("PAYMENT_CBE_ACCOUNT_NUMBER");

  return {
    telebirr: {
      enabled: envFlag("PAYMENT_TELEBIRR_ENABLED", true),
      merchant_name: envString("PAYMENT_TELEBIRR_MERCHANT_NAME"),
      short_code: telebirrShortCode,
      ussd: envString("PAYMENT_TELEBIRR_USSD") ?? "*127#",
    },
    cbe_birr: {
      enabled: envFlag("PAYMENT_CBE_ENABLED", true),
      account_name: envString("PAYMENT_CBE_ACCOUNT_NAME"),
      account_number: cbeAccount,
    },
  };
}
