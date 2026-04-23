import { describe, it, expect, vi, beforeEach } from "vitest";
import { api, ApiClientError } from "./client";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

function mockResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(data),
  };
}

describe("api.get", () => {
  it("GET 요청을 보내고 데이터를 반환한다", async () => {
    const payload = { data: { id: "1", name: "test" }, meta: {} };
    mockFetch.mockResolvedValueOnce(mockResponse(payload));

    const result = await api.get("/products");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/products",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
    expect(result.data).toEqual({ id: "1", name: "test" });
  });
});

describe("api.post", () => {
  it("POST 요청을 body와 함께 보낸다", async () => {
    const payload = { data: { id: "2" } };
    mockFetch.mockResolvedValueOnce(mockResponse(payload));

    await api.post("/products", { name: "new" });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/products",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "new" }),
      }),
    );
  });
});

describe("에러 핸들링", () => {
  it("4xx 응답 시 ApiClientError를 throw한다", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse(
        { type: "validation_error", title: "Bad", status: 400, detail: "Invalid input" },
        400,
      ),
    );

    await expect(api.get("/invalid")).rejects.toThrow(ApiClientError);
    await mockFetch.mockResolvedValueOnce(
      mockResponse(
        { type: "validation_error", title: "Bad", status: 400, detail: "Invalid input" },
        400,
      ),
    );

    try {
      await api.get("/invalid");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiClientError);
      expect((e as ApiClientError).status).toBe(400);
      expect((e as ApiClientError).detail).toBe("Invalid input");
    }
  });

  it("JSON 파싱 실패 시 기본 에러를 생성한다", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.reject(new Error("invalid json")),
    });

    try {
      await api.get("/broken");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiClientError);
      expect((e as ApiClientError).status).toBe(500);
    }
  });
});
