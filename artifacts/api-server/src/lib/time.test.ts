import { describe, expect, it } from "vitest";
import { addDaysLocal, isValidTimezone, nowInTz, toInstant } from "./time";

describe("toInstant", () => {
  it("converts São Paulo wall-clock time to UTC regardless of process TZ", () => {
    expect(toInstant("2026-11-02", "09:00", "America/Sao_Paulo").toISOString()).toBe("2026-11-02T12:00:00.000Z");
  });

  it("respects other timezones", () => {
    expect(toInstant("2026-11-02", "09:00", "America/Manaus").toISOString()).toBe("2026-11-02T13:00:00.000Z");
  });

  it("defaults to America/Sao_Paulo", () => {
    expect(toInstant("2026-11-02", "09:00").toISOString()).toBe("2026-11-02T12:00:00.000Z");
  });

  it.each([
    ["2026-13-01", "09:00"],
    ["2026-11-02", "25:00"],
    ["2026-11-02", "9:00"],
    ["02/11/2026", "09:00"],
    ["", ""],
  ])("rejects malformed input %s %s", (date, time) => {
    expect(() => toInstant(date, time)).toThrow(RangeError);
  });

  it("rejects an unknown timezone", () => {
    expect(() => toInstant("2026-11-02", "09:00", "Mars/Olympus")).toThrow(RangeError);
  });
});

describe("nowInTz", () => {
  it("returns tenant-local date and time", () => {
    const now = new Date("2026-11-02T02:30:00.000Z");
    expect(nowInTz("America/Sao_Paulo", now)).toEqual({ date: "2026-11-01", time: "23:30" });
    expect(nowInTz("Asia/Tokyo", now)).toEqual({ date: "2026-11-02", time: "11:30" });
  });
});

describe("addDaysLocal", () => {
  it("adds and subtracts calendar days across month and year boundaries", () => {
    expect(addDaysLocal("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDaysLocal("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysLocal("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("rejects malformed dates", () => {
    expect(() => addDaysLocal("2026-02-30", 1)).toThrow(RangeError);
    expect(() => addDaysLocal("nope", 1)).toThrow(RangeError);
  });
});

describe("isValidTimezone", () => {
  it("accepts IANA zones and rejects garbage", () => {
    expect(isValidTimezone("America/Sao_Paulo")).toBe(true);
    expect(isValidTimezone("Mars/Olympus")).toBe(false);
  });
});
