import { Expect, TestInfo } from "@playwright/test";
import { ImageSnapshotMatcher } from "./matcher";
import { ImageSnapshotOptions } from "./image-snapshot-options.type";
const { currentTestInfo } = require("@playwright/test/lib/test/globals");

export function toMatchImageSnapshot(
  this: ReturnType<Expect["getState"]>,
  received: Buffer,
  name: string,
  options: ImageSnapshotOptions = {}
) {
  const testInfo: TestInfo | null = currentTestInfo();

  if (!testInfo) {
    throw new Error(`toMatchSnapshot() must be called during the test`);
  }

  const negateComparison = this.isNot;
  const { pass, message } = ImageSnapshotMatcher.compare({
    diffDir: testInfo.outputPath,
    name,
    negateComparison,
    options,
    snapshotsDir: testInfo.snapshotPath,
    testImageBuffer: received,
    updateSnapshots: testInfo.config.updateSnapshots,
  });

  return { pass, message: () => message };
}
