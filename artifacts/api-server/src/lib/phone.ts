// Brazilian numbers only: DDD (11-99, first digit never 0) + 8-digit landline
// (starts 2-5) or 9-digit mobile (starts with 9).
const NATIONAL_RE = /^([1-9][1-9])(9\d{8}|[2-5]\d{7})$/;

/** Normalizes a BR phone to E.164 (`+55DDDNUMERO`), or null when invalid. */
export function normalizePhoneBR(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null;
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("55") && digits.length >= 12) digits = digits.slice(2);
  digits = digits.replace(/^0+/, "");
  return NATIONAL_RE.test(digits) ? `+55${digits}` : null;
}

export function isValidPhoneBR(input: string | null | undefined): boolean {
  return normalizePhoneBR(input) !== null;
}
