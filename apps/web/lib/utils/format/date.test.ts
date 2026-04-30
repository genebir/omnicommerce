import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatDate, formatDateTime, formatRelative } from "./index";

describe("formatDate", () => {
  it("ISO 문자열을 한국 날짜 형식으로 포맷한다", () => {
    const result = formatDate("2026-01-15T14:30:00+09:00");
    expect(result).toContain("2026");
    expect(result).toContain("01");
    expect(result).toContain("15");
  });

  it("Date 객체를 포맷한다", () => {
    const date = new Date("2026-03-05T00:00:00+09:00");
    const result = formatDate(date);
    expect(result).toContain("2026");
    expect(result).toContain("03");
    expect(result).toContain("05");
  });
});

describe("formatDateTime", () => {
  it("날짜와 시간을 포함한다", () => {
    const result = formatDateTime("2026-01-15T14:30:00+09:00");
    expect(result).toContain("2026");
    expect(result).toContain("14");
    expect(result).toContain("30");
  });
});

describe("formatRelative — ko (default)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00+09:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("1분 미만은 '방금 전'을 반환한다", () => {
    expect(formatRelative("2026-01-01T11:59:30+09:00")).toBe("방금 전");
  });

  it("분 단위 (numeric: always — '15분 전')", () => {
    expect(formatRelative("2026-01-01T11:45:00+09:00")).toBe("15분 전");
  });

  it("시간 단위", () => {
    expect(formatRelative("2026-01-01T09:00:00+09:00")).toBe("3시간 전");
  });

  it("일 단위 — auto가 '어제/그저께'로 바꾸지 않고 항상 숫자", () => {
    expect(formatRelative("2025-12-30T12:00:00+09:00")).toBe("2일 전");
  });

  it("30일 이상은 절대 날짜 폴백", () => {
    const result = formatRelative("2025-11-01T12:00:00+09:00");
    expect(result).toContain("2025");
    expect(result).toContain("11");
  });
});

describe("formatRelative — en", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00+09:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("1분 미만 → 'just now'", () => {
    expect(formatRelative("2026-01-01T11:59:30+09:00", "en")).toBe("just now");
  });

  it("분 단위 → '15 minutes ago'", () => {
    expect(formatRelative("2026-01-01T11:45:00+09:00", "en")).toBe("15 minutes ago");
  });

  it("시간 단위 → '3 hours ago'", () => {
    expect(formatRelative("2026-01-01T09:00:00+09:00", "en")).toBe("3 hours ago");
  });

  it("일 단위 → '2 days ago' (auto의 'the day before yesterday' 방지)", () => {
    expect(formatRelative("2025-12-30T12:00:00+09:00", "en")).toBe("2 days ago");
  });

  it("30일 이상은 영어식 절대 날짜 폴백", () => {
    const result = formatRelative("2025-11-01T12:00:00+09:00", "en");
    // "11/01/2025" 형태 — 정확한 포맷 대신 핵심 토큰 검증
    expect(result).toContain("2025");
  });
});
