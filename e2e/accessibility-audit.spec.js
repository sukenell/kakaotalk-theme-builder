import AxeBuilder from "@axe-core/playwright";
import { PREVIEW_PAGES } from "../src/preview-pages.js";
import { expect, test } from "./support/a11y-fixture.js";

const AXE_WCAG_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
];

for (const [activeIndex, previewPage] of PREVIEW_PAGES.entries()) {
  test(`@task10-audit ${previewPage.label} 기본 화면은 WCAG 자동 감사와 접근성 트리를 통과한다`, async ({
    page,
  }, testInfo) => {
    await page.goto("/");

    const activeTab = page.locator(`#preview-tab-${previewPage.id}`);
    await activeTab.click();
    await expect(activeTab).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(`#preview-panel-${previewPage.id}`)).not.toHaveAttribute(
      "aria-hidden",
      "true",
    );

    const accessibilitySnapshot = await page.locator("#preview-frame").ariaSnapshot();
    expect(accessibilitySnapshot.match(/tabpanel "/g) ?? []).toHaveLength(1);
    expect(accessibilitySnapshot).toContain(`tabpanel "${previewPage.label}"`);
    for (const inactivePage of PREVIEW_PAGES.filter((_, index) => index !== activeIndex)) {
      expect(accessibilitySnapshot).not.toContain(`tabpanel "${inactivePage.label}"`);
      const inactiveSnapshot = await page
        .locator(`#preview-panel-${inactivePage.id}`)
        .ariaSnapshot();
      expect(inactiveSnapshot.trim(), `${inactivePage.label}: inactive subtree is absent`).toBe("");
    }

    const scrollRegionStates = await page.locator("[data-preview-scroll-region]").evaluateAll((regions) =>
      regions.map((region) => ({
        label: region.getAttribute("aria-label"),
        hasOverflow:
          region.scrollHeight > region.clientHeight + 1 ||
          region.scrollWidth > region.clientWidth + 1,
        tabIndex: region.getAttribute("tabindex"),
      })),
    );
    for (const region of scrollRegionStates) {
      expect(region.tabIndex, `${region.label}: only actual overflow is a Tab stop`).toBe(
        region.hasOverflow ? "0" : null,
      );
    }

    const results = await new AxeBuilder({ page })
      .withTags(AXE_WCAG_TAGS)
      .analyze();
    await testInfo.attach(`axe-${previewPage.id}`, {
      body: Buffer.from(JSON.stringify(results, null, 2)),
      contentType: "application/json",
    });

    expect(results.violations).toEqual([]);
  });
}
