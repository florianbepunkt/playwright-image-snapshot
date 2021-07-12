import { ImageSnapshotMatcher } from "./matcher";
import { ImageSnapshotOptions } from "./image-snapshot-options.type";
const { currentTestInfo } = require("@playwright/test/lib/test/globals");

export const toMatchImageSnapshot = (
  received: Buffer,
  name: string,
  options: ImageSnapshotOptions = {}
) => {
  const testInfo = currentTestInfo();

  if (!testInfo) {
    throw new Error(`toMatchSnapshot() must be called during the test`);
  }

  const { pass, message } = ImageSnapshotMatcher.compare(
    received,
    name,
    testInfo.snapshotPath,
    testInfo.outputPath,
    testInfo.config.updateSnapshots,
    options
  );

  return { pass, message: () => message };
};
