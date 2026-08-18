const ETHIOPIAN_TIN_PATTERN = /^\d{10}$/;

export function sanitizeEthiopianTinInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

export function isValidEthiopianTin(value: string) {
  return ETHIOPIAN_TIN_PATTERN.test(value.trim());
}
