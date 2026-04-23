import { describe, it, expect } from "vitest";
import { productSchema } from "./product";

describe("productSchema", () => {
  it("유효한 데이터를 통과시킨다", () => {
    const result = productSchema.safeParse({
      name: "테스트 상품",
      sku: "SKU-0001",
      price: 15000,
    });
    expect(result.success).toBe(true);
  });

  it("빈 상품명을 거부한다", () => {
    const result = productSchema.safeParse({
      name: "",
      sku: "SKU-0001",
      price: 15000,
    });
    expect(result.success).toBe(false);
  });

  it("음수 가격을 거부한다", () => {
    const result = productSchema.safeParse({
      name: "테스트",
      sku: "SKU-0001",
      price: -100,
    });
    expect(result.success).toBe(false);
  });

  it("선택 필드 없이도 통과한다", () => {
    const result = productSchema.safeParse({
      name: "테스트",
      sku: "SKU-0001",
      price: 0,
    });
    expect(result.success).toBe(true);
  });
});
