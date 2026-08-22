import { defineConfig, devices } from "@playwright/test";

const deploymentUrlValue = process.env.DEPLOYMENT_URL?.trim();

if (!deploymentUrlValue) {
  throw new Error("DEPLOYMENT_URL is required for deployment verification.");
}

let deploymentUrl;
try {
  deploymentUrl = new URL(deploymentUrlValue);
} catch {
  throw new Error("DEPLOYMENT_URL must be an absolute HTTP(S) URL.");
}

if (
  !["http:", "https:"].includes(deploymentUrl.protocol) ||
  deploymentUrl.pathname === "/" ||
  !deploymentUrl.pathname.endsWith("/")
) {
  throw new Error(
    "DEPLOYMENT_URL must be an absolute HTTP(S) URL whose pathname is a trailing-slash deployment subpath.",
  );
}

const reporter = process.env.CI
  ? [
      ["line"],
      ["html", { open: "never", outputFolder: "playwright-report/deployment" }],
    ]
  : [["line"]];

export default defineConfig({
  testDir: "./e2e",
  testMatch: "deployment.spec.js",
  fullyParallel: false,
  timeout: 120_000,
  reporter,
  outputDir: "test-results/deployment",
  use: {
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "Deployed Desktop Chrome",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
