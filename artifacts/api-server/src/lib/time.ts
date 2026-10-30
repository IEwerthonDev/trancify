import { DateTime } from "luxon";

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTimezone(tz: string): boolean {
  return DateTime.local().setZone(tz).isValid;
}

/**
 * Converts a tenant-local wall-clock date/time into an absolute instant.
 * The single place where "YYYY-MM-DD" + "HH:mm" becomes a Date; never build
 * one with `new Date(`${date}T${time}`)` (that uses the server's timezone).
 * Throws on malformed input or an unknown timezone.
 */
export function toInstant(date: string, time: string, tz: string = DEFAULT_TIMEZONE): Date {
  if (!DATE_RE.test(date) || !TIME_RE.test(time)) {
    throw new RangeError(`Invalid local date/time: "${date}" "${time}"`);
  }
  const dt = DateTime.fromISO(`${date}T${time}`, { zone: tz });
  if (!dt.isValid) {
    throw new RangeError(`Invalid local date/time or timezone: "${date}" "${time}" "${tz}"`);
  }
  return dt.toJSDate();
}

/** Current wall-clock date/time in the tenant's timezone. */
export function nowInTz(tz: string = DEFAULT_TIMEZONE, now: Date = new Date()): { date: string; time: string } {
  const dt = DateTime.fromJSDate(now, { zone: tz });
  if (!dt.isValid) throw new RangeError(`Invalid timezone: "${tz}"`);
  return { date: dt.toFormat("yyyy-MM-dd"), time: dt.toFormat("HH:mm") };
}

/** Adds calendar days to a "YYYY-MM-DD" local date (DST-safe, no timezone involved). */
export function addDaysLocal(date: string, days: number): string {
  if (!DATE_RE.test(date)) throw new RangeError(`Invalid local date: "${date}"`);
  const dt = DateTime.fromISO(date, { zone: "utc" });
  if (!dt.isValid) throw new RangeError(`Invalid local date: "${date}"`);
  return dt.plus({ days }).toFormat("yyyy-MM-dd");
}
