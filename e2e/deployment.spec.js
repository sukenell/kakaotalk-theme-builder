import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./support/a11y-fixture.js";

const deploymentUrlValue = process.env.DEPLOYMENT_URL?.trim();
const deploymentUrl = deploymentUrlValue ? new URL(deploymentUrlValue) : null;
const AXE_WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

test.describe("@task10-deployment GitHub Pages smoke", () => {
  test.skip(!deploymentUrl, "DEPLOYMENT_URL is only set for the post-deployment gate.");

  test("serves the expected app, assets, and accessible default state", async ({ page }, testInfo) => {
    const assetResponses = [];
    const failedRequests = [];
    page.on("response", (assetResponse) => {
      const request = assetResponse.request();
      if (request.resourceType() === "document") {
        return;
      }
      const assetUrl = new URL(assetResponse.url());
      assetResponses.push({
        inDeploymentSubpath:
          assetUrl.origin === deploymentUrl.origin &&
          assetUrl.pathname.startsWith(deploymentUrl.pathname),
        ok: assetResponse.ok(),
        resourceType: request.resourceType(),
        status: assetResponse.status(),
        url: assetResponse.url(),
      });
    });
    page.on("requestfailed", (request) => {
      failedRequests.push({
        error: request.failure()?.errorText ?? "unknown request failure",
        resourceType: request.resourceType(),
        url: request.url(),
      });
    });

    const response = await page.goto(deploymentUrl.href, { waitUntil: "networkidle" });
    expect(response, "the deployed document must return a response").not.toBeNull();
    expect(response.ok(), `deployment returned HTTP ${response.status()}`).toBe(true);

    const finalUrl = new URL(page.url());
    expect(finalUrl.origin, "the deployed document must remain on the requested origin").toBe(
      deploymentUrl.origin,
    );
    expect(finalUrl.pathname, "the deployed document must remain at the repository subpath").toBe(
      deploymentUrl.pathname,
    );

    await expect(page).toHaveTitle(/카톡 테마 만들기/);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("tablist", { name: "템플릿 페이지" })).toBeVisible();
    await expect(page.getByRole("tab")).toHaveCount(10);
    await expect(page.getByRole("button", { name: "Android 소스 다운로드" })).toBeVisible();

    const declaredAssets = await page.evaluate(() => [
      ...[...document.querySelectorAll('link[rel="stylesheet"][href]')].map((node) => ({
        kind: "stylesheet",
        url: node.href,
      })),
      ...[...document.querySelectorAll("script[src]")].map((node) => ({
        kind: "script",
        url: node.src,
      })),
    ]);
    expect(declaredAssets.some(({ kind }) => kind === "stylesheet"), "the deployment references CSS").toBe(true);
    expect(declaredAssets.some(({ kind }) => kind === "script"), "the deployment references JavaScript").toBe(true);

    await testInfo.attach("deployment-assets", {
      body: Buffer.from(JSON.stringify({ declaredAssets, assetResponses, failedRequests }, null, 2)),
      contentType: "application/json",
    });
    expect(assetResponses.length, "the browser must load deployment subresources").toBeGreaterThan(0);
    expect(failedRequests, "deployment asset requests must not fail before receiving a response").toEqual([]);
    for (const asset of assetResponses) {
      expect(asset.inDeploymentSubpath, `${asset.url} must resolve under the deployment subpath`).toBe(true);
      expect(asset.ok, `${asset.url} returned HTTP ${asset.status}`).toBe(true);
    }

    const axeResults = await new AxeBuilder({ page }).withTags(AXE_WCAG_TAGS).analyze();
    await testInfo.attach("deployment-axe", {
      body: Buffer.from(JSON.stringify(axeResults, null, 2)),
      contentType: "application/json",
    });
    expect(axeResults.violations).toEqual([]);
  });
});
