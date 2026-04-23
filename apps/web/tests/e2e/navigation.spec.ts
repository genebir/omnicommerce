import { test, expect } from "@playwright/test";
import { setupPage, waitForFonts } from "./helpers";

test.describe("기본 네비게이션", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await setupPage(page);
    await waitForFonts(page);
  });

  test("대시보드 페이지가 로드된다", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible();
  });

  test("사이드바로 상품 페이지로 이동한다", async ({ page }) => {
    await page.getByRole("link", { name: "상품" }).click();
    await expect(page).toHaveURL("/products");
    await expect(page.getByRole("heading", { name: "상품" })).toBeVisible();
  });

  test("사이드바로 주문 페이지로 이동한다", async ({ page }) => {
    await page.getByRole("link", { name: "주문" }).click();
    await expect(page).toHaveURL("/orders");
    await expect(page.getByRole("heading", { name: "주문" })).toBeVisible();
  });

  test("사이드바로 재고 페이지로 이동한다", async ({ page }) => {
    await page.getByRole("link", { name: "재고" }).click();
    await expect(page).toHaveURL("/inventory");
    await expect(page.getByRole("heading", { name: "재고" })).toBeVisible();
  });

  test("사이드바로 채널 연결 페이지로 이동한다", async ({ page }) => {
    await page.getByRole("link", { name: "채널 연결" }).click();
    await expect(page).toHaveURL("/channels");
    await expect(page.getByRole("heading", { name: "채널 연결" })).toBeVisible();
  });

  test("사이드바로 설정 페이지로 이동한다", async ({ page }) => {
    await page.getByRole("link", { name: "설정" }).click();
    await expect(page).toHaveURL("/settings");
    await expect(page.getByRole("heading", { name: "설정" })).toBeVisible();
  });
});

test.describe("커맨드 팔레트", () => {
  test("⌘K로 팔레트가 열린다", async ({ page }) => {
    await page.goto("/dashboard");
    await setupPage(page);

    await page.keyboard.press("Meta+k");
    await expect(page.getByPlaceholder("검색 또는 명령어...")).toBeVisible();
  });

  test("팔레트에서 상품 페이지로 이동한다", async ({ page }) => {
    await page.goto("/dashboard");
    await setupPage(page);

    await page.keyboard.press("Meta+k");
    await page.getByPlaceholder("검색 또는 명령어...").fill("상품");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/products");
  });

  test("Esc로 팔레트가 닫힌다", async ({ page }) => {
    await page.goto("/dashboard");
    await setupPage(page);

    await page.keyboard.press("Meta+k");
    await expect(page.getByPlaceholder("검색 또는 명령어...")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByPlaceholder("검색 또는 명령어...")).not.toBeVisible();
  });
});

test.describe("루트 리다이렉트", () => {
  test("/ 접속 시 /dashboard로 리다이렉트된다", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/dashboard");
  });
});
