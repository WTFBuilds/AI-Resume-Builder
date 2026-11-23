import puppeteer, { type Browser } from "puppeteer";
import { renderResumeHtml } from "@airesume/templates/render";
import type { ResumeConfig, ResumeData } from "@airesume/templates";

/**
 * Persistent Chromium: launched once and reused across renders (a fresh
 * launch costs 2–4 s on a 1-vCPU box). Pages are opened/closed per render;
 * the browser is relaunched automatically if it crashes or disconnects.
 */
let browserPromise: Promise<Browser> | null = null;

function launchBrowser(): Promise<Browser> {
  const promise = puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--font-render-hinting=none",
    ],
  });
  promise.then(
    (browser) =>
      browser.on("disconnected", async () => {
        if ((await browserPromise) === browser) browserPromise = null;
      }),
    () => {
      browserPromise = null;
    },
  );
  return promise;
}

function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = launchBrowser();
  }
  return browserPromise;
}

export async function htmlToPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    // html is fully self-contained (inline CSS + embedded fonts, no network)
    await page.setContent(html, { waitUntil: "load", timeout: 30000 });
    const pdf = await page.pdf({
      preferCSSPageSize: true, // honors @page size from the template
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      timeout: 45000,
    });
    return Buffer.from(pdf);
  } finally {
    await page.close().catch(() => {});
  }
}

export function resumeHtml(data: ResumeData, config: ResumeConfig, templateId: string): string {
  return renderResumeHtml({ data, config, templateSlug: templateId });
}
