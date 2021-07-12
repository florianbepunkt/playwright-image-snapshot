import { PNG } from "pngjs";

type ComposerImage = {
  data: PNG;
  width: number;
  height: number;
};

export class DiffComposer {
  constructor(private images: ComposerImage[] = []) {}

  public addImage({ data, width, height }: ComposerImage): void {
    this.images.push({ data, height, width });
  }

  public addImages({ images, width, height }: { images: PNG[]; width: number; height: number }): void {
    images.forEach((data) => this.images.push({ data, width, height }));
  }

  public getParams() {
    const { width, height } = this.getMaxImageSize(this.images);
    const compositeWidth = width * this.images.length;
    const compositeHeight = height;
    const offsetX = width;
    const offsetY = 0;

    return {
      compositeHeight,
      compositeWidth,
      images: this.images,
      offsetX,
      offsetY,
    };
  }

  private getMaxImageSize(images: ComposerImage[]) {
    const width = Math.max(...images.map((i) => i.width));
    const height = Math.max(...images.map((i) => i.height));
    return { width, height };
  }
}
