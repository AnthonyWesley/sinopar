import { describe, it, expect } from "vitest";
import { centsToInput, parsePrice } from "./money";

describe("parsePrice", () => {
  it.each([
    ["R$ 12,90", 1290],
    ["12,9", 1290],
    ["12", 1200],
    ["1.234,56", 123456],
    ["R$1.234", 123400],
    ["12.90", 1290],
    [" 0,05 ", 5],
    ["0", 0],
  ])("%s → %i", (text, cents) => expect(parsePrice(text)).toBe(cents));

  it.each(["", "abc", "12,999", "-3", "1,2,3", "12.3.4,5"])("%s → null", (text) => expect(parsePrice(text)).toBeNull());

  it("centsToInput", () => {
    expect(centsToInput(1290)).toBe("12,90");
    expect(centsToInput(123456)).toBe("1.234,56");
    expect(centsToInput(null)).toBe("");
  });
});
