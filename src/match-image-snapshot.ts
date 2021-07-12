import { compareWithSSIM } from "./comparators";
import { DiffComposer } from "./diff-composer";
import { ImageSnapshotOptions } from "./image-snapshot-options.type";
import { PNG } from "pngjs";
import colors from "colors/safe";
import fs from "fs";
import glur from "glur";
import mkdirp from "mkdirp";
import path from "path";
import pixelmatch from "pixelmatch";
import rimraf from "rimraf";

const { currentTestInfo } = require("@playwright/test/lib/test/globals");

class ImageSnapshotMatcher {
  static readonly DEFAULT_PIXELMATCH_CONFIG = { threshold: 0.01 };
  static readonly DEFAULT_SSIM_CONFIG = { ssim: "weber" };

  static isFailure = ({
    pass,
    updateSnapshots,
  }: {
    pass: boolean;
    updateSnapshots: "all" | "none" | "missing";
  }) => !pass && updateSnapshots !== "all";

  static shouldFail = ({
    diffPixelCount,
    failureThreshold,
    failureThresholdType,
    totalPixels,
  }: {
    diffPixelCount: number;
    failureThreshold: number;
    failureThresholdType: "pixel" | "percent";
    totalPixels: number;
  }) => {
    const diffRatio = diffPixelCount / totalPixels;
    let pass: boolean = false;

    if (failureThresholdType === "pixel") {
      pass = diffPixelCount <= failureThreshold;
    } else if (failureThresholdType === "percent") {
      pass = diffRatio <= failureThreshold;
    }

    return { diffRatio, pass };
  };

  static getImageComparisonConfig(
    comparisonAlgorithm: ImageSnapshotOptions["comparisonAlgorithm"],
    customConfig: ImageSnapshotOptions["comparisonConfig"]
  ) {
    const defaultConfig =
      comparisonAlgorithm === "ssim"
        ? ImageSnapshotMatcher.DEFAULT_SSIM_CONFIG
        : ImageSnapshotMatcher.DEFAULT_PIXELMATCH_CONFIG;

    return Object.assign({}, defaultConfig, customConfig);
  }

  static compare = (
    receivedImageBuffer: Buffer,
    snapshotIdentifier: string,
    snapshotsDir: (name: string) => string,
    diffDir: (name: string) => string,
    updateSnapshots: "all" | "none" | "missing" = "missing",
    options: ImageSnapshotOptions
  ): { pass: boolean; message?: string } => {
    const {
      blur,
      comparisonAlgorithm = "ssim",
      comparisonConfig = {},
      failureThreshold = 0.02,
      failureThresholdType = "percent",
    } = options;

    const result = { pass: false, message: "" };
    const writeMissingSnapshots = updateSnapshots === "all" || updateSnapshots === "missing";
    const comparisonFn = comparisonAlgorithm === "ssim" ? compareWithSSIM : pixelmatch;
    const snapshotFile = snapshotsDir(snapshotIdentifier);
    const snapshotPath = path.join(snapshotFile, `${snapshotIdentifier}.snap.png`);

    /** write missing snapshots */
    if (!fs.existsSync(snapshotPath) && writeMissingSnapshots) {
      const commonMissingSnapshotMessage = `${snapshotFile} is missing in snapshots`;
      const message = `${commonMissingSnapshotMessage}${
        writeMissingSnapshots ? ", writing actual." : "."
      }`;

      mkdirp.sync(path.dirname(snapshotPath));
      fs.writeFileSync(snapshotPath, receivedImageBuffer);

      result.pass = false;
      result.message = message;

      return result;
    }

    const diffOutputPath = path.join(diffDir(snapshotIdentifier), `${snapshotIdentifier}.diff.png`);
    rimraf.sync(diffOutputPath);

    const config = ImageSnapshotMatcher.getImageComparisonConfig(comparisonAlgorithm, comparisonConfig);
    const receivedImage = PNG.sync.read(receivedImageBuffer);
    const baselineImage = PNG.sync.read(fs.readFileSync(snapshotPath));
    const imageWidth = receivedImage.width;
    const imageHeight = receivedImage.height;
    const totalPixels = imageWidth * imageHeight;

    let diffPixelCount = 0;

    /** blur image */
    if (typeof blur === "number" && blur > 0) {
      glur(receivedImage.data, imageWidth, imageHeight, blur);
      glur(baselineImage.data, imageWidth, imageHeight, blur);
    }

    const diffImage = new PNG({ width: imageWidth, height: imageHeight });

    diffPixelCount = comparisonFn(
      receivedImage.data as any,
      baselineImage.data as any,
      diffImage.data as any,
      imageWidth,
      imageHeight,
      config as any // can only be SSIM or PIXELMATCH, so this should be fine
    );

    const { pass, diffRatio } = ImageSnapshotMatcher.shouldFail({
      totalPixels,
      diffPixelCount,
      failureThresholdType,
      failureThreshold,
    });

    if (ImageSnapshotMatcher.isFailure({ pass, updateSnapshots })) {
      mkdirp.sync(path.dirname(diffOutputPath));
      const composer = new DiffComposer();
      composer.addImages({
        images: [baselineImage, diffImage, receivedImage],
        width: imageWidth,
        height: imageHeight,
      });

      const { compositeHeight, compositeWidth, images, offsetX, offsetY } = composer.getParams();
      const diffCompositeImage = new PNG({ width: compositeWidth, height: compositeHeight });

      // copy baseline, diff, and received images into composite result image
      images.forEach((image, index) => {
        PNG.bitblt(
          image.data,
          diffCompositeImage,
          0,
          0,
          image.width,
          image.height,
          offsetX * index,
          offsetY * index
        );
      });

      const pngBuffer = PNG.sync.write(diffCompositeImage, { filterType: 4 });
      fs.writeFileSync(diffOutputPath, pngBuffer);

      const output = [colors.red(`Snapshot comparison failed: `)];
      output.push(`Expected: ${colors.yellow(snapshotPath)}`);
      output.push(`Received: ${colors.yellow(diffOutputPath)}`);
      result.pass = false;
      result.message = output.join("\n");
    } else if (!pass && updateSnapshots) {
      mkdirp.sync(path.dirname(snapshotPath));
      fs.writeFileSync(snapshotPath, receivedImageBuffer);
      result.pass = false;
      result.message = snapshotFile + " running with --update-snapshots, writing actual.";
    } else {
      result.pass = pass;
      result.message = `Comparison passed with diff ratio ${diffRatio}`;
    }

    return result;
  };
}

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
