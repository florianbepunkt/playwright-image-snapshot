# playwright-image-snapshot

Enhanced image snapshots for @playwright/test. An improved port of `jest-image-snapshot` (https://github.com/americanexpress/jest-image-snapshot)

## Installation

`npm install --save-dev playwright-image-snapshot`

## Usage

```ts
// playwright.config.ts file
import { toMatchImageSnapshot } from "playwright-image-snapshot";
expect.extend({ toMatchImageSnapshot });
```
