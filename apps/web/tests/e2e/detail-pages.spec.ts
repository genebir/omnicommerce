import { test, expect } from "@playwright/test";
import { setupPage, waitForFonts } from "./helpers";

test.describe("상품 상세 페이지", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/products/prod_001");
    await setupPage(page);
    await waitForFonts(page);
  });

  test("상품 정보가 표시된다", async ({ page }) => {
    await expect(page.getByText("프리미엄 무선 이어폰")).toBeVisible();
    await expect(page.getByText("SKU-EAR-001")).toBeVisible();
  });

  test("Breadcrumb 네비게이션이 표시된다", async ({ page }) => {
    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb.getByText("상품")).toBeVisible();
  });

  test("탭으로 채널 현황을 볼 수 있다", async ({ page }) => {
    await page.getByRole("tab", { name: "채널 등록 현황" }).click();
    await expect(page.getByText("P00012345")).toBeVisible();
  });

  test("뒤로가기 버튼으로 목록으로 이동한다", async ({ page }) => {
    await page.getByRole("link", { name: "뒤로" }).click();
    await expect(page).toHaveURL("/products");
  });
});

test.describe("주문 상세 페이지", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/orders/ord_001");
    await setupPage(page);
    await waitForFonts(page);
  });

  test("주문 정보가 표시된다", async ({ page }) => {
    await expect(page.getByText("ORD-2026-0001")).toBeVisible();
    await expect(page.getByText("김민수")).toBeVisible();
  });

  test("주문 상품 목록이 표시된다", async ({ page }) => {
    await expect(page.getByText("프리미엄 무선 이어폰")).toBeVisible();
    await expect(page.getByText("이어폰 케이스")).toBeVisible();
  });

  test("Breadcrumb 네비게이션이 표시된다", async ({ page }) => {
    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb.getByText("주문")).toBeVisible();
  });
});

test.describe("상품 편집 페이지", () => {
  test("편집 폼에 기존 데이터가 채워져 있다", async ({ page }) => {
    await page.goto("/products/prod_001/edit");
    await setupPage(page);
    await waitForFonts(page);

    await expect(page.getByRole("textbox", { name: "상품명" })).toHaveValue("프리미엄 무선 이어폰");
    await expect(page.getByRole("textbox", { name: "SKU" })).toHaveValue("SKU-EAR-001");
  });
});

test.describe("검색 바 → 커맨드 팔레트", () => {
  test("검색 바 클릭 시 커맨드 팔레트가 열린다", async ({ page }) => {
    await page.goto("/dashboard");
    await setupPage(page);

    await page.getByText("검색 또는 명령어...").click();
    await expect(page.getByPlaceholder("검색 또는 명령어...")).toBeVisible();
  });
});
