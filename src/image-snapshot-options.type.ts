import { Options as SSIMOptions } from "ssim.js";
import { PixelmatchOptions } from "pixelmatch";

export interface ImageSnapshotOptions {
  /**
   * Blur snapshot and test image before comparison
   * @default 0.
   */
  blur?: number;
  /**
   * The algorithm used for image comparison.
   * @default 'ssim'
   */
  comparisonAlgorithm?: "pixelmatch" | "ssim";
  /**
   * Config passed to image comparison algorithm
   */
  comparisonConfig?: PixelmatchOptions | Partial<SSIMOptions>;
  /**
   * Threshold unit that causes a test to failure.
   * @default 0.
   */
  failureThreshold?: number;
  /**
   * Unit of threshold
   * @default 'percent'.
   */
  failureThresholdType?: "pixel" | "percent";
}
