declare namespace PlaywrightTest {
  interface Matchers<R> {
    toMatchImageSnapshot(
      name: string,
      options?: import("./image-snapshot-options.type").ImageSnapshotOptions
    ): R;
  }
}
