import { describe, expect, it } from "vitest";
import { isValidPhoneBR, normalizePhoneBR } from "./phone";

describe("normalizePhoneBR", () => {
  it.each([
    ["(11) 98888-7777", "+5511988887777"],
    ["11988887777", "+5511988887777"],
    ["+55 11 98888-7777", "+5511988887777"],
    ["5511988887777", "+5511988887777"],
    ["0011988887777", "+5511988887777"],
    ["011 98888-7777", "+5511988887777"],
    ["(11) 3333-4444", "+551133334444"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizePhoneBR(input)).toBe(expected);
  });

  it.each([
    "",
    "abc",
    "12345",
    "(00) 98888-7777",
    "(11) 88888-7777",
    "(11) 1333-4444",
    "119888877778",
    "+1 415 555 2671",
  ])("returns null for invalid input %s", (input) => {
    expect(normalizePhoneBR(input)).toBeNull();
  });

  it("returns null for null/undefined", () => {
    expect(normalizePhoneBR(null)).toBeNull();
    expect(normalizePhoneBR(undefined)).toBeNull();
  });
});

describe("isValidPhoneBR", () => {
  it("mirrors normalizePhoneBR", () => {
    expect(isValidPhoneBR("(11) 98888-7777")).toBe(true);
    expect(isValidPhoneBR("123")).toBe(false);
  });
});
