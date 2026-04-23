import { describe, it, expect } from "vitest";
import { loginSchema, signupSchema } from "./auth";

describe("loginSchema", () => {
  it("유효한 데이터를 통과시킨다", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("잘못된 이메일을 거부한다", () => {
    const result = loginSchema.safeParse({
      email: "invalid",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("짧은 비밀번호를 거부한다", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });
});

describe("signupSchema", () => {
  it("유효한 데이터를 통과시킨다", () => {
    const result = signupSchema.safeParse({
      name: "테스트",
      email: "test@example.com",
      password: "password123",
      passwordConfirm: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("비밀번호 불일치를 거부한다", () => {
    const result = signupSchema.safeParse({
      name: "테스트",
      email: "test@example.com",
      password: "password123",
      passwordConfirm: "different456",
    });
    expect(result.success).toBe(false);
  });
});
