# playwright-image-snapshot

Enhanced image snapshots for @playwright/test. A slightly modified port of `jest-image-snapshot` (https://github.com/americanexpress/jest-image-snapshot)

## Installation

`npm install --save-dev playwright-image-snapshot`

## Usage

```ts
// playwright.config.ts file
import { toMatchImageSnapshot } from "playwright-image-snapshot";
expect.extend({ toMatchImageSnapshot });

// in your test (the following config is less prone to false positives due to text antialiasing )
expect(await page.screenshot()).toMatchImageSnapshot("name to identify snapshot", {
  blur: 2,
  comparisonMethod: "ssim",
  failureThreshold: 0.02,
  failureThresholdType: "percent",
});
```
