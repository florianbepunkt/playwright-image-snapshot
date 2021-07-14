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

export class ImageSnapshotMatcher {
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

  static getComparisonConfig(
    comparisonAlgorithm: ImageSnapshotOptions["comparisonAlgorithm"],
    customConfig: ImageSnapshotOptions["comparisonConfig"]
  ) {
    const defaultConfig =
      comparisonAlgorithm === "ssim"
        ? ImageSnapshotMatcher.DEFAULT_SSIM_CONFIG
        : ImageSnapshotMatcher.DEFAULT_PIXELMATCH_CONFIG;

    return Object.assign({}, defaultConfig, customConfig);
  }

  static compare = ({
    diffDir,
    name,
    negateComparison = false,
    options,
    snapshotsDir,
    testImageBuffer,
    updateSnapshots = "missing",
  }: {
    diffDir: (name: string) => string;
    name: string;
    negateComparison: boolean;
    options: ImageSnapshotOptions;
    snapshotsDir: (name: string) => string;
    testImageBuffer: Buffer;
    updateSnapshots: "all" | "none" | "missing";
  }): { pass: boolean; message?: string } => {
    const {
      blur,
      comparisonAlgorithm = "ssim",
      comparisonConfig = {},
      failureThreshold = 0.02,
      failureThresholdType = "percent",
    } = options;

    const result = { pass: false, message: "" };
    const writeMissingSnapshots = updateSnapshots === "all" || updateSnapshots === "missing";
    const snapshotFile = snapshotsDir(name);
    const snapshotPath = path.join(snapshotFile, `${name}.snap.png`);

    /** write missing snapshots */
    if (!fs.existsSync(snapshotPath) && writeMissingSnapshots) {
      const commonMissingSnapshotMessage = `${snapshotFile} is missing in snapshots`;

      if (negateComparison) {
        const message = `${commonMissingSnapshotMessage}${
          writeMissingSnapshots ? ', matchers using ".not" won\'t write them automatically.' : "."
        }`;

        return { pass: true, message };
      }

      const message = `${commonMissingSnapshotMessage}${
        writeMissingSnapshots ? ", writing actual." : "."
      }`;

      mkdirp.sync(path.dirname(snapshotPath));
      fs.writeFileSync(snapshotPath, testImageBuffer);

      result.pass = false;
      result.message = message;

      return result;
    }

    const diffOutputPath = path.join(diffDir(name), `${name}.diff.png`);
    rimraf.sync(diffOutputPath);

    const config = ImageSnapshotMatcher.getComparisonConfig(comparisonAlgorithm, comparisonConfig);
    const testImage = PNG.sync.read(testImageBuffer);
    const referenceImage = PNG.sync.read(fs.readFileSync(snapshotPath));
    const width = testImage.width;
    const height = testImage.height;
    const totalPixels = width * height;

    let diffPixelCount = 0;

    /** blur image */
    if (typeof blur === "number" && blur > 0) {
      glur(testImage.data, width, height, blur);
      glur(referenceImage.data, width, height, blur);
    }

    const diffImage = new PNG({ width, height });

    if (comparisonAlgorithm === "ssim") {
      diffPixelCount = compareWithSSIM({
        config: config as any,
        diffImage,
        height,
        referenceImage,
        testImage,
        width,
      });
    } else {
      diffPixelCount = pixelmatch(
        testImage.data as any,
        referenceImage.data as any,
        diffImage.data as any,
        width,
        height,
        config as any // can only be SSIM or PIXELMATCH, so this should be fine
      );
    }

    const { pass, diffRatio } = ImageSnapshotMatcher.shouldFail({
      totalPixels,
      diffPixelCount,
      failureThresholdType,
      failureThreshold,
    });

    if (!pass && negateComparison) {
      return { pass: false };
    }

    if (ImageSnapshotMatcher.isFailure({ pass, updateSnapshots })) {
      mkdirp.sync(path.dirname(diffOutputPath));
      const composer = new DiffComposer();
      composer.addImages({
        images: [referenceImage, diffImage, testImage],
        width: width,
        height: height,
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
      output.push(`Diff ratio: ${diffRatio}`);
      result.pass = false;
      result.message = output.join("\n");
    } else if (!pass && updateSnapshots) {
      mkdirp.sync(path.dirname(snapshotPath));
      fs.writeFileSync(snapshotPath, testImageBuffer);
      result.pass = false;
      result.message = snapshotFile + " running with --update-snapshots, writing actual.";
    } else {
      result.pass = pass;
      result.message = `Comparison passed with diff ratio ${diffRatio}`;
    }

    return result;
  };
}
