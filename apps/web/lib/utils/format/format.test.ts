import { describe, it, expect } from "vitest";
import { formatCurrency, formatNumber, formatCompact, formatPercent } from "./index";

describe("formatCurrency", () => {
  it("원화 형식으로 포맷한다", () => {
    const result = formatCurrency(15000);
    expect(result).toContain("15,000");
    expect(result).toContain("₩");
  });

  it("0을 포맷한다", () => {
    const result = formatCurrency(0);
    expect(result).toContain("0");
  });
});

describe("formatNumber", () => {
  it("천 단위 구분자를 추가한다", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("소수점을 유지한다", () => {
    expect(formatNumber(1234.56)).toBe("1,234.56");
  });
});

describe("formatCompact", () => {
  it("큰 숫자를 축약한다", () => {
    const result = formatCompact(1500000);
    expect(result).toBeTruthy();
  });
});

describe("formatPercent", () => {
  it("퍼센트 형식으로 포맷한다", () => {
    const result = formatPercent(0.856);
    expect(result).toContain("85.6");
    expect(result).toContain("%");
  });
});
