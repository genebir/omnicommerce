import { describe, expect, it } from "vitest";
import { applyChange, computeBulkPricePreview } from "./bulk-price-preview";

const items = [
  { id: "p1", name: "상품 A", sku: "A-001", price: 10000, cost_price: 6000 },
  { id: "p2", name: "상품 B", sku: "B-002", price: 25000, cost_price: null },
  { id: "p3", name: "상품 C", sku: "C-003", price: 7777, cost_price: 4444 },
];

describe("applyChange", () => {
  it("absolute는 입력값을 그대로 반올림 적용한다", () => {
    expect(applyChange(10000, "absolute", 12345, 10)).toBe(12350);
    expect(applyChange(10000, "absolute", 12345, 1)).toBe(12345);
  });
  it("inc_amount는 현재값에 더하고 반올림한다", () => {
    expect(applyChange(10000, "inc_amount", 1234, 10)).toBe(11230);
  });
  it("inc_percent는 비율로 증가시키고 반올림한다", () => {
    expect(applyChange(10000, "inc_percent", 10, 10)).toBe(11000);
    expect(applyChange(10000, "inc_percent", -10, 10)).toBe(9000);
  });
  it("음수 결과는 0으로 클램프한다", () => {
    expect(applyChange(1000, "inc_amount", -5000, 10)).toBe(0);
  });
});

describe("computeBulkPricePreview — price 모드", () => {
  it("inc_percent로 모든 상품의 price를 일괄 변경한다", () => {
    const rows = computeBulkPricePreview(items, {
      field: "price",
      mode: "inc_percent",
      value: 10,
      roundTo: 10,
      customMap: {},
    });
    expect(rows.map((r) => r.newValue)).toEqual([11000, 27500, 8550]);
    expect(rows.map((r) => r.oldValue)).toEqual([10000, 25000, 7777]);
    expect(rows.every((r) => r.newValue !== null && r.diff > 0)).toBe(true);
  });

  it("custom 모드는 customMap을 우선 사용하고 미입력은 기존값 유지", () => {
    const rows = computeBulkPricePreview(items, {
      field: "price",
      mode: "custom",
      value: 0,
      roundTo: 10,
      customMap: { p1: 9999 },
    });
    expect(rows[0]?.newValue).toBe(9999);
    expect(rows[1]?.newValue).toBe(25000);
    expect(rows[2]?.newValue).toBe(7777);
  });
});

describe("computeBulkPricePreview — cost_price 모드", () => {
  it("cost_price를 base로 사용해 새 값을 계산한다 (버그 회귀)", () => {
    const rows = computeBulkPricePreview(items, {
      field: "cost_price",
      mode: "absolute",
      value: 5000,
      roundTo: 10,
      customMap: {},
    });
    expect(rows[0]?.oldValue).toBe(6000);
    expect(rows[0]?.newValue).toBe(5000);
    expect(rows[2]?.oldValue).toBe(4444);
    expect(rows[2]?.newValue).toBe(5000);
  });

  it("cost_price가 null인 상품은 새 값도 null이며 미리보기 셀에 — 가 표시된다", () => {
    const rows = computeBulkPricePreview(items, {
      field: "cost_price",
      mode: "inc_amount",
      value: 1000,
      roundTo: 10,
      customMap: {},
    });
    // p1, p3는 cost_price가 있으므로 변경 적용됨
    expect(rows[0]?.newValue).toBe(7000);
    expect(rows[2]?.newValue).toBe(5440);
    // p2는 cost_price가 null → 새 값도 null (oldValue도 null)
    expect(rows[1]?.oldValue).toBeNull();
    expect(rows[1]?.newValue).toBeNull();
    expect(rows[1]?.diff).toBe(0);
  });

  it("custom 모드에서 cost_price가 null이어도 사용자가 직접 입력하면 그 값을 사용", () => {
    const rows = computeBulkPricePreview(items, {
      field: "cost_price",
      mode: "custom",
      value: 0,
      roundTo: 10,
      customMap: { p2: 3000 },
    });
    expect(rows[1]?.oldValue).toBeNull();
    expect(rows[1]?.newValue).toBe(3000);
    // p1은 미입력 → 기존 cost_price 유지
    expect(rows[0]?.newValue).toBe(6000);
  });
});
