import ssim, { Options } from "ssim.js";

type compareWithSSIMArgs = {
  testImage: Uint8ClampedArray;
  referenceImage: Uint8ClampedArray;
  diffImage: Uint8ClampedArray;
  width: number;
  height: number;
  diffConfig: Partial<Options>;
};

export const compareWithSSIM = ({
  testImage,
  referenceImage,
  diffImage,
  width,
  height,
  diffConfig,
}: compareWithSSIMArgs) => {
  const test: ImageData = { data: testImage, width: width, height: height };
  const reference: ImageData = { data: referenceImage, width: width, height: height };
  const { ssim_map, mssim } = ssim(test, reference, diffConfig);
  const diffPixels = (1 - mssim) * width * height;
  const diffRgbaPixels = new DataView(diffImage.buffer, diffImage.byteOffset);

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
                ssim_map.width * Math.round((ssim_map.height * ln) / height) +
                  Math.round((ssim_map.width * pos) / width)
              ])
        );
      diffRgbaPixels.setUint32(rpos * 4, diffValue);
    }
  }

  return diffPixels;
};
