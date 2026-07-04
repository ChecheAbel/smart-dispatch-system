const ETHIOPIA_COUNTRY_CODE = "+251";
const LOCAL_MOBILE_PATTERN = /^[79]\d{8}$/;

export function sanitizeEthiopianMobileInput(value: string) {
  const digits = value.replace(/\D/g, "");
  const withoutCountryCode = digits.startsWith("251") ? digits.slice(3) : digits;
  const withoutLeadingZero = withoutCountryCode.startsWith("0")
    ? withoutCountryCode.slice(1)
    : withoutCountryCode;

  return withoutLeadingZero.slice(0, 9);
}

export function parseStoredEthiopianMobile(value: string) {
  const trimmed = value.trim();

  if (trimmed.startsWith(ETHIOPIA_COUNTRY_CODE)) {
    return sanitizeEthiopianMobileInput(trimmed.slice(ETHIOPIA_COUNTRY_CODE.length));
  }

  return sanitizeEthiopianMobileInput(trimmed);
}

export function isValidEthiopianMobileLocal(value: string) {
  return LOCAL_MOBILE_PATTERN.test(value);
}

export function formatEthiopianMobileNumber(localValue: string) {
  return `${ETHIOPIA_COUNTRY_CODE}${localValue}`;
}

export const ETHIOPIA_MOBILE_COUNTRY_CODE = ETHIOPIA_COUNTRY_CODE;
