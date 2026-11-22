import puppeteer from "puppeteer";
import { renderResumeHtml } from "@airesume/templates/render";
import type { ResumeConfig, ResumeData } from "@airesume/templates";

/**
 * Print a resume HTML document to PDF. The input HTML comes from the same
 * renderResumeHtml() used by the live preview — output is pixel-identical
 * by construction (plan §11).
 */
export async function htmlToPdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=none",
    ],
  });
  try {
    const page = await browser.newPage();
    // html is fully self-contained (inline CSS, no network resources)
    await page.setContent(html, { waitUntil: "load", timeout: 30000 });
    const pdf = await page.pdf({
      preferCSSPageSize: true, // honors @page size from the template
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      timeout: 45000,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export function resumeHtml(data: ResumeData, config: ResumeConfig, templateId: string): string {
  return renderResumeHtml({ data, config, templateSlug: templateId });
}
