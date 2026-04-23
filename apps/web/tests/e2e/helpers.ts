import { type Page } from "@playwright/test";

const FIXED_TIME = "2026-01-01T00:00:00+09:00";

export async function setupPage(page: Page) {
  await page.clock.setFixedTime(new Date(FIXED_TIME));

  await page.addStyleTag({
    content: "*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }",
  });
}

export async function waitForFonts(page: Page) {
  await page.evaluate(() => document.fonts.ready);
}
