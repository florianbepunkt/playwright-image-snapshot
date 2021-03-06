import { PNG } from "pngjs";
import ssim, { Options } from "ssim.js";

type compareWithSSIMArgs = {
  config: Partial<Options>;
  diffImage: PNG;
  height: number;
  referenceImage: PNG;
  testImage: PNG;
  width: number;
};

export const compareWithSSIM = ({
  config,
  diffImage,
  height,
  referenceImage,
  testImage,
  width,
}: compareWithSSIMArgs) => {
  // from https://github.com/americanexpress/jest-image-snapshot/blob/2ef1ca810e60c4aa9951e1f373744dd05938e4cb/src/diff-snapshot.js#L91

  const reference: ImageData = {
    data: new Uint8ClampedArray(referenceImage.data),
    width: width,
    height: height,
  };
  const test: ImageData = { data: new Uint8ClampedArray(testImage.data), width: width, height: height };
  const { ssim_map, mssim } = ssim(test, reference, config);
  const diffPixels = (1 - mssim) * width * height;
  const diffRgbaPixels = new DataView(diffImage.data.buffer, diffImage.data.byteOffset);

  for (let ln = 0; ln !== height; ++ln) {
    for (let pos = 0; pos !== width; ++pos) {
      const rpos = ln * width + pos;
      // initial value is transparent.  We'll add in the SSIM offset.
      // red (ff) green (00) blue (00) alpha (00)
      const diffValue =
        0xff000000 +
        Math.floor(
          0xff *
            (1 -
              ssim_map.data[
                // eslint-disable-next-line no-mixed-operators
                ssim_map.width * Math.round((ssim_map.height * ln) / height) +
                  // eslint-disable-next-line no-mixed-operators
                  Math.round((ssim_map.width * pos) / width)
              ])
        );
      diffRgbaPixels.setUint32(rpos * 4, diffValue);
    }
  }

  return diffPixels;
};
