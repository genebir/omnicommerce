/**
 * 첫 워크스루에서 못 잡은 핵심 화면을 보강 캡처:
 * - 영어 모드 핵심 페이지
 * - 일괄 가격 다이얼로그 cost_price 미리보기 (페이즈 9 검증)
 * - 모바일 사이드바 오버레이
 * - 채널 연결 위저드
 */

import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";

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

const tokensRes = await fetch(`${API}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const tokens = (await tokensRes.json()).data;
const me = (await (await fetch(`${API}/auth/me`, {
  headers: { Authorization: `Bearer ${tokens.access_token}` },
})).json()).data;
const authState = { user: me, tokens };

async function setup(page) {
  await page.goto(`${URL}/login`);
  await page.evaluate((s) => localStorage.setItem("omni:auth", JSON.stringify(s)), authState);
}

// ============== 1) 영어 모드 ==============
{
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: "en-US",
    timezoneId: "Asia/Seoul",
  });
  await ctx.addCookies([{ name: "NEXT_LOCALE", value: "en", url: URL }]);
  const page = await ctx.newPage();
  await setup(page);

  await page.goto(`${URL}/dashboard`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SCREENS}/en-02-dashboard.png`, fullPage: true });

  // 한글 잔존 검사 (헤더/사이드바)
  const layout = await page.locator("header, nav, aside").allTextContents();
  const ko = (layout.join(" ").match(/[가-힣]+/g) || []);
  if (ko.length > 0) note("en-dashboard", "P0", `사이드바/헤더 한글 잔존: ${[...new Set(ko)].slice(0, 6).join(", ")}`);

  await page.goto(`${URL}/products`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SCREENS}/en-03-products.png`, fullPage: true });

  // 커맨드 팔레트
  await page.keyboard.press("Control+k");
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SCREENS}/en-04-command-palette.png`, fullPage: true });
  const palText = (await page.locator('[role="dialog"]').last().innerText().catch(() => ""));
  const palKo = (palText.match(/[가-힣]+/g) || []);
  if (palKo.length > 0) note("en-cmdk", "P0", `CommandPalette 한글 잔존: ${[...new Set(palKo)].slice(0, 8).join(", ")}`);
  await page.keyboard.press("Escape");

  // 채널 페이지
  await page.goto(`${URL}/channels`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SCREENS}/en-05-channels.png`, fullPage: true });

  await browser.close();
}
console.log("✓ 영어 모드 캡처 완료");

// ============== 2) 일괄 가격 다이얼로그 (cost_price 미리보기) ==============
{
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: "ko-KR",
  });
  const page = await ctx.newPage();
  await setup(page);

  await page.goto(`${URL}/products`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);

  // 행별 체크박스 한 개씩 클릭 (헤더는 셀렉터 충돌 가능)
  const rowChecks = page.locator('table tbody tr button[role="checkbox"]');
  const rowCount = await rowChecks.count();
  console.log("rows", rowCount);
  for (let i = 0; i < Math.min(rowCount, 3); i++) {
    await rowChecks.nth(i).click();
    await page.waitForTimeout(80);
  }
  await page.screenshot({ path: `${SCREENS}/extra-01-rows-selected.png`, fullPage: true });

  // floating 액션 — 가격/할인 수정 버튼
  const priceBtn = page.getByRole("button", { name: /가격|할인/i }).first();
  if (await priceBtn.count()) {
    await priceBtn.click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${SCREENS}/extra-02-bulk-price-default.png`, fullPage: true });

    // 단가 토글
    const costBtn = page.getByRole("button", { name: /단가|공급가/ }).first();
    if (await costBtn.count()) {
      await costBtn.click();
      await page.waitForTimeout(200);
      // 절대값(고정) 모드 + 5500 입력
      const absMode = page.getByRole("button", { name: /고정|절대/ }).first();
      if (await absMode.count()) await absMode.click();
      await page.locator('input[type="number"]').first().fill("5500");
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SCREENS}/extra-03-cost-preview.png`, fullPage: true });

      // 미리보기 새 값 셀에 "5,500"이 있는지 / "—" 잔존 여부
      const newCells = await page.locator('table tbody td').allTextContents();
      const has5500 = newCells.some((t) => t.includes("5,500") || t.includes("5500"));
      const dashCount = newCells.filter((t) => t.trim() === "—").length;
      console.log(`cost preview: has5500=${has5500}, dashCount=${dashCount}`);
      if (!has5500) note("cost-preview", "P0", "단가 5500 모드인데 미리보기 셀에 ₩5,500 없음 (페이즈 9 회귀?)");
    }
  } else {
    note("bulk-price", "P1", "행 선택 후 floating 가격 버튼 못 찾음");
  }
  await browser.close();
}
console.log("✓ 일괄 가격 캡처 완료");

// ============== 3) 모바일 사이드바 오버레이 ==============
{
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "ko-KR",
  });
  const page = await ctx.newPage();
  await setup(page);
  await page.goto(`${URL}/dashboard`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);

  // 온보딩 모달 닫기
  const skipBtn = page.getByRole("button", { name: /건너뛰기|skip/i }).first();
  if (await skipBtn.count()) {
    await skipBtn.click();
    await page.waitForTimeout(400);
  }

  await page.screenshot({ path: `${SCREENS}/extra-04-mobile-after-onboarding.png`, fullPage: false });

  // 햄버거 메뉴
  const hamburger = page.locator('button[aria-label="메뉴"]').first();
  if (await hamburger.count()) {
    await hamburger.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENS}/extra-05-mobile-sidebar.png`, fullPage: false });
  } else {
    note("mobile-sidebar", "P1", "햄버거 버튼(aria-label='메뉴') 못 찾음");
  }
  await browser.close();
}
console.log("✓ 모바일 사이드바 캡처 완료");

// ============== 4) 채널 연결 위저드 ==============
{
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: "ko-KR",
  });
  const page = await ctx.newPage();
  await setup(page);
  await page.goto(`${URL}/channels`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);

  // 카페24 카드의 연결하기 버튼
  const connect = page.getByRole("button", { name: /연결하기/ }).first();
  if (await connect.count()) {
    await connect.click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${SCREENS}/extra-06-connect-wizard-step1.png`, fullPage: true });
  }
  await browser.close();
}
console.log("✓ 채널 위저드 캡처 완료");

await writeFile(`${SCREENS}/extra-findings.json`, JSON.stringify(findings, null, 2), "utf8");
console.log("\n=== Extra Findings ===");
for (const f of findings) console.log(`[${f.severity}] ${f.area}: ${f.msg}`);
