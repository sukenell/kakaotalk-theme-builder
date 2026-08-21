import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:43173";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  timeout: 120_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run serve",
    url: baseURL,
    env: {
      PORT: "43173",
      SKIP_ENV_CONFIG: "1",
    },
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
