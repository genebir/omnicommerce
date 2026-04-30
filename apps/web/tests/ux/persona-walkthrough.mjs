/**
 * 페르소나(컴퓨터 비숙련 1인 셀러) 시점 UX 검증 스크립트.
 *
 * - 데스크톱 1280×800 + 모바일 390×844 두 뷰포트
 * - 한국어/영어 두 로케일
 * - 핵심 화면 + 일괄 가격/단가 수정 흐름까지 따라가며 스크린샷 캡처
 * - "사용자 입장에서 막히는 지점"을 메모로 기록
 */

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const SCREENS = "/tmp/ux-screens";
const URL = "http://localhost:3000";
const EMAIL = "qa@example.com";
const PASSWORD = "testpass1234"; // pragma: allowlist secret

const findings = [];

function note(area, severity, msg) {
  findings.push({ area, severity, msg });
  console.log(`[${severity}] ${area}: ${msg}`);
}

await mkdir(SCREENS, { recursive: true });

async function captureFlow(viewport, label) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport,
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
  });
  const page = await ctx.newPage();

  // ─── 1. 루트 → 로그인 리다이렉트 ───
  await page.goto(URL);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${SCREENS}/${label}-01-login.png`, fullPage: true });

  // 로그인 페이지에서 보이는 텍스트 점검
  const loginText = await page.content();
  if (!loginText.includes("로그인") && !loginText.includes("Login")) {
    note(label, "P1", "로그인 페이지에서 '로그인' 라벨이 식별되지 않음");
  }

  // ─── 2. 로그인 ───
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.screenshot({ path: `${SCREENS}/${label}-02-login-filled.png`, fullPage: true });
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard|\/login/, { timeout: 10000 });
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${SCREENS}/${label}-03-dashboard.png`, fullPage: true });

  // ─── 3. 상품 목록 ───
  await page.goto(`${URL}/products`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${SCREENS}/${label}-04-products-list.png`, fullPage: true });

  // 상품 행 4개 보여야 함
  const rowCount = await page.locator("table tbody tr").count();
  if (rowCount < 1) note(label, "P1", `상품 목록 행이 ${rowCount}건 — 시드 데이터가 안 보임`);

  // ─── 4. 행 선택 → 일괄 가격 수정 다이얼로그 ───
  // 모든 행 체크박스 선택
  const allCheckbox = page.locator('thead input[type="checkbox"], thead [role="checkbox"]').first();
  if (await allCheckbox.isVisible()) {
    await allCheckbox.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SCREENS}/${label}-05-products-selected.png`, fullPage: true });

    // "가격 수정" 또는 영어 라벨 버튼 찾기
    const priceBtn = page.getByRole("button", { name: /가격|price/i }).first();
    if (await priceBtn.count()) {
      await priceBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SCREENS}/${label}-06-bulk-price-dialog.png`, fullPage: true });

      // 단가 모드 버튼 클릭 — 새로 고친 cost_price 미리보기 검증
      const costBtn = page.getByRole("button", { name: /단가|공급가|cost/i }).first();
      if (await costBtn.count()) {
        await costBtn.click();
        // absolute(고정) 모드 + 값 입력
        const valueInput = page.locator('input[type="number"]').first();
        await valueInput.fill("5500");
        await page.waitForTimeout(400);
        await page.screenshot({ path: `${SCREENS}/${label}-07-cost-preview.png`, fullPage: true });

        // 미리보기 행 텍스트 확인 — 새 값에 "—" 만 보이면 회귀
        const previewRows = await page.locator("table table tbody tr, [class*='border-b'] td").allTextContents();
        const dashOnly = previewRows.filter((t) => t.trim() === "—").length;
        if (dashOnly > 4) {
          note(label, "P0", `cost_price 미리보기에 '—'만 ${dashOnly}개 — 회귀 의심`);
        }
      } else {
        note(label, "P2", "일괄 가격 다이얼로그에서 '단가' 버튼을 못 찾음 (라벨/i18n)");
      }

      // 다이얼로그 닫기
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    } else {
      note(label, "P1", "행 선택 후 '가격 수정' 버튼이 floating 액션바에 안 보임");
    }
  } else {
    note(label, "P2", "테이블 헤더 전체 선택 체크박스가 안 보임");
  }

  // ─── 5. 상품 상세 ───
  const firstRowName = page.locator("table tbody tr").first().locator("a, button").first();
  if (await firstRowName.count()) {
    await firstRowName.click();
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `${SCREENS}/${label}-08-product-detail.png`, fullPage: true });
  }

  // ─── 6. 주문 페이지 ───
  await page.goto(`${URL}/orders`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${SCREENS}/${label}-09-orders.png`, fullPage: true });

  // ─── 7. 재고 페이지 ───
  await page.goto(`${URL}/inventory`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${SCREENS}/${label}-10-inventory.png`, fullPage: true });

  // ─── 8. 채널 페이지 ───
  await page.goto(`${URL}/channels`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${SCREENS}/${label}-11-channels.png`, fullPage: true });

  // ─── 9. 설정 페이지 ───
  await page.goto(`${URL}/settings`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${SCREENS}/${label}-12-settings.png`, fullPage: true });

  // ─── 10. 커맨드 팔레트 (⌘K) ───
  await page.goto(`${URL}/dashboard`);
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("Control+k");
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SCREENS}/${label}-13-command-palette.png`, fullPage: true });
  await page.keyboard.press("Escape");

  // ─── 11. 영어 모드 — 설정에서 전환 시도 ───
  await page.goto(`${URL}/settings`);
  await page.waitForLoadState("networkidle");
  // 언어 섹션 찾기
  const langSection = page.getByRole("button", { name: /언어|language/i }).first();
  if (await langSection.count()) {
    await langSection.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SCREENS}/${label}-14-settings-lang.png`, fullPage: true });
  }

  await browser.close();
}

await captureFlow({ width: 1280, height: 800 }, "desktop");
await captureFlow({ width: 390, height: 844 }, "mobile");

// ─── 영어 모드 별도 캡처 ───
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  locale: "en-US",
  timezoneId: "Asia/Seoul",
  // next-intl 쿠키 강제
  storageState: undefined,
});
const page = await ctx.newPage();
// 쿠키 직접 주입
await page.context().addCookies([
  {
    name: "NEXT_LOCALE",
    value: "en",
    url: URL,
  },
]);
await page.goto(URL);
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${SCREENS}/en-01-login.png`, fullPage: true });
await page.fill('input[type="email"], input[name="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL(/dashboard|login/, { timeout: 10000 });
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${SCREENS}/en-02-dashboard.png`, fullPage: true });
await page.goto(`${URL}/products`);
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${SCREENS}/en-03-products.png`, fullPage: true });

// 영어 모드에서 일괄 가격 다이얼로그 — 한글 하드코딩이 남아 있는지
const allCheckbox = page.locator('thead input[type="checkbox"], thead [role="checkbox"]').first();
if (await allCheckbox.isVisible()) {
  await allCheckbox.click();
  await page.waitForTimeout(300);
  const priceBtn = page.getByRole("button", { name: /가격|price/i }).first();
  if (await priceBtn.count()) {
    await priceBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENS}/en-04-bulk-price.png`, fullPage: true });

    // 한글이 남아있는지
    const dialogHTML = await page.locator('[role="dialog"]').innerText();
    const koLeftover = dialogHTML.match(/[가-힣]+/g) || [];
    if (koLeftover.length > 0) {
      note("en", "P1", `영어 모드 일괄 가격 다이얼로그에 한글 잔존: ${koLeftover.slice(0, 5).join(", ")}`);
    }
  }
}

// 커맨드 팔레트 영어 모드
await page.keyboard.press("Escape");
await page.waitForTimeout(200);
await page.keyboard.press("Control+k");
await page.waitForTimeout(400);
await page.screenshot({ path: `${SCREENS}/en-05-command-palette.png`, fullPage: true });

// CommandPalette HTML에서 한글 잔존 검사
const cmdHTML = await page.locator('[cmdk-root], [role="dialog"]').last().innerText().catch(() => "");
const cmdKo = (cmdHTML.match(/[가-힣]+/g) || []);
if (cmdKo.length > 0) {
  note("en", "P0", `영어 모드 CommandPalette에 한글 잔존: ${cmdKo.slice(0, 8).join(", ")}`);
}

await browser.close();

await writeFile(`${SCREENS}/findings.json`, JSON.stringify(findings, null, 2), "utf8");
console.log("\n=== Findings ===");
for (const f of findings) console.log(`[${f.severity}] ${f.area}: ${f.msg}`);
console.log(`\nScreenshots: ${SCREENS}`);
