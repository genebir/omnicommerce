/**
 * 페르소나(컴퓨터 비숙련 1인 셀러) 시점 UX 검증 워크스루.
 *
 * - 데스크톱 1280×800 + 모바일 390×844 두 뷰포트 + 영어 모드
 * - 백엔드에서 토큰 발급 후 localStorage에 직접 inject — 폼 제출 race를 회피
 * - 핵심 화면 + 일괄 가격/단가 미리보기 + 채널 위저드까지 캡처
 */

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const SCREENS = "/tmp/ux-screens";
const URL = "http://localhost:3000";
const API = "http://localhost:8000/api/v1";
const EMAIL = "qa@example.com";
const PASSWORD = "testpass1234"; // pragma: allowlist secret

const findings = [];
function note(area, severity, msg) {
  findings.push({ area, severity, msg });
  console.log(`[${severity}] ${area}: ${msg}`);
}

await mkdir(SCREENS, { recursive: true });

// 1) 백엔드에서 토큰 + 사용자 정보 받아오기 — Playwright에서 localStorage에 inject
async function loginAndGetState() {
  const r = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!r.ok) throw new Error(`login failed: ${r.status}`);
  const body = await r.json();
  const tokens = body.data;
  // /auth/me로 user 정보
  const me = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  }).then((r) => r.json());
  const user = me.data;
  return { user, tokens };
}

const authState = await loginAndGetState();
console.log("✓ logged in as", authState.user.email);

async function captureFlow(viewport, label, locale = "ko") {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport,
    locale: locale === "en" ? "en-US" : "ko-KR",
    timezoneId: "Asia/Seoul",
  });
  // 영어 모드 쿠키
  await ctx.addCookies([{ name: "NEXT_LOCALE", value: locale, url: URL }]);

  const page = await ctx.newPage();

  // 1. 인증 전 — 로그인 페이지
  await page.goto(`${URL}/login`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${SCREENS}/${label}-01-login.png`, fullPage: true });

  // 2. localStorage에 토큰 inject + 강제 새로고침
  await page.evaluate((state) => {
    localStorage.setItem("omni:auth", JSON.stringify(state));
  }, authState);

  // 3. 대시보드로 이동
  await page.goto(`${URL}/dashboard`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800); // chart/stats 그려질 시간
  await page.screenshot({ path: `${SCREENS}/${label}-02-dashboard.png`, fullPage: true });

  // 4. 상품 목록
  await page.goto(`${URL}/products`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SCREENS}/${label}-03-products-list.png`, fullPage: true });

  const rows = await page.locator("table tbody tr").count();
  if (rows < 1) note(label, "P1", `상품 목록 행 ${rows}건 — 시드/인증 문제`);

  // 5. 행 다중 선택 → floating 액션 바 → 일괄 가격/단가 다이얼로그
  // Radix 체크박스: button[role="checkbox"]
  const headerCheck = page.locator('table thead button[role="checkbox"]').first();
  if (await headerCheck.count()) {
    await headerCheck.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SCREENS}/${label}-04-products-selected.png`, fullPage: true });

    // 가격/할인 수정 버튼
    const priceBtn = page.getByRole("button", { name: /가격|price/i }).first();
    if (await priceBtn.count()) {
      await priceBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SCREENS}/${label}-05-bulk-price-default.png`, fullPage: true });

      // "단가" 토글로 전환 — 페이즈 9에서 고친 핵심 화면
      const costToggle = page.getByRole("button", { name: /단가|공급가|cost/i }).first();
      if (await costToggle.count()) {
        await costToggle.click();
        await page.waitForTimeout(200);
        // 절대값 모드는 기본 — 값 입력
        const valInput = page.locator('input[type="number"]').first();
        if (await valInput.count()) {
          await valInput.fill("5500");
          await page.waitForTimeout(400);
          await page.screenshot({
            path: `${SCREENS}/${label}-06-cost-preview.png`,
            fullPage: true,
          });
        }
      } else {
        note(label, "P2", "일괄 가격 다이얼로그에 단가 토글 없음");
      }

      // 닫기
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    } else {
      note(label, "P1", "행 선택 후 floating 액션바에 '가격 수정' 버튼 없음");
    }
  } else {
    note(label, "P1", "table thead의 Radix 체크박스 못 찾음");
  }

  // 6. 상품 상세
  const firstRow = page.locator("table tbody tr a").first();
  if (await firstRow.count()) {
    await firstRow.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENS}/${label}-07-product-detail.png`, fullPage: true });
  }

  // 7. 주문
  await page.goto(`${URL}/orders`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENS}/${label}-08-orders.png`, fullPage: true });

  // 8. 재고
  await page.goto(`${URL}/inventory`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENS}/${label}-09-inventory.png`, fullPage: true });

  // 9. 채널
  await page.goto(`${URL}/channels`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENS}/${label}-10-channels.png`, fullPage: true });

  // 9-1. 채널 연결 위저드 — naver "연결" 버튼 찾기
  const connectBtn = page.getByRole("button", { name: /연결|connect/i }).first();
  if (await connectBtn.count()) {
    await connectBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENS}/${label}-11-connect-wizard.png`, fullPage: true });
    await page.keyboard.press("Escape");
  }

  // 10. 설정
  await page.goto(`${URL}/settings`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENS}/${label}-12-settings.png`, fullPage: true });

  // 11. 커맨드 팔레트
  await page.goto(`${URL}/dashboard`);
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("Control+k");
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SCREENS}/${label}-13-command-palette.png`, fullPage: true });

  // 영어 모드 — 한글 잔존 검사
  if (locale === "en") {
    const dialogTexts = await page.locator('[role="dialog"]').allTextContents();
    const allText = dialogTexts.join(" ");
    const ko = allText.match(/[가-힣]+/g) || [];
    if (ko.length > 0) {
      note(label, "P0", `영어 CommandPalette에 한글 잔존: ${[...new Set(ko)].slice(0, 8).join(", ")}`);
    }
  }

  await page.keyboard.press("Escape");

  // 12. 모바일에서 사이드바 햄버거 → 오버레이
  if (viewport.width < 600) {
    await page.goto(`${URL}/dashboard`);
    await page.waitForLoadState("networkidle");
    const hamburger = page.locator('button[aria-label="메뉴"], button[aria-label="Menu"]').first();
    if (await hamburger.count()) {
      await hamburger.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SCREENS}/${label}-14-mobile-sidebar.png`, fullPage: true });
    }
  }

  await browser.close();
}

await captureFlow({ width: 1280, height: 800 }, "desktop", "ko");
await captureFlow({ width: 390, height: 844 }, "mobile", "ko");
await captureFlow({ width: 1280, height: 800 }, "en", "en");

await writeFile(`${SCREENS}/findings.json`, JSON.stringify(findings, null, 2), "utf8");
console.log("\n=== Findings ===");
for (const f of findings) console.log(`[${f.severity}] ${f.area}: ${f.msg}`);
console.log(`\nScreenshots: ${SCREENS}`);
