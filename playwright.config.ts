import { devices } from "@playwright/test";
import { expect, PlaywrightTestConfig } from "@playwright/test";
import { toMatchImageSnapshot } from "./src/match-image-snapshot";

const config: PlaywrightTestConfig = {
  preserveOutput: "failures-only",
  repeatEach: 2,
  retries: 0,
  testMatch: "src/*.spec.ts",
  timeout: 2000,
  workers: 2,
  projects: [
    {
      name: "Mobile",
      use: {
        browserName: "chromium",
        contextOptions: { ...devices["iPhone 12"], ignoreHTTPSErrors: true },
        launchOptions: { headless: true },
        screenshot: "on",
        slowMo: 50,
        trace: "on",
        video: "on",
      },
    },
  ],
};

expect.extend({ toMatchImageSnapshot });

export default config;
