import { ImageSnapshotOptions } from "./image-snapshot-options.type";
import { test as base, expect } from "@playwright/test";
import http from "http";
import StaticServer from "node-static";

// const SNAPSHOT_SETTINGS: ImageSnapshotOptions = { failureThreshold: 0.01, failureThresholdType: "percent" };

const startServer = async (port: number = 8080, timeout: number = 5000): Promise<http.Server> => {
  const statiServer = new StaticServer.Server("./test-files");

  return new Promise((resolve, reject) => {
    const rejectTimer = setTimeout(() => reject(new Error("Server start timed out")), timeout);

    const server = http
      .createServer((request, response) => {
        request
          .addListener("end", function () {
            statiServer.serve(request, response);
          })
          .resume();
      })
      .listen(port, () => {
        clearTimeout(rejectTimer);
        resolve(server);
      });
  });
};

type ServerWorkerFixtures = {
  port: number;
  server: http.Server;
};

const test = base.extend<{}, ServerWorkerFixtures>({
  port: [
    async ({}, use, workerInfo) => {
      await use(8080 + workerInfo.workerIndex);
    },
    { scope: "worker" },
  ],
  server: [
    async ({ port }, use) => {
      let server = await startServer(port);
      await use(server);
      await new Promise((resolve) => server.close(resolve));
    },
    { scope: "worker", auto: true },
  ],
});

// test.describe("green page", () => {
//   test.beforeAll(async () => await startServer());

//   test("base", async ({ page }) => {
//     await page.goto("http://localhost:8080/green-page.html");
//     expect(await page.screenshot()).toMatchImageSnapshot(`green-page`, SNAPSHOT_SETTINGS);
//   });
// });

test.describe("pixelmatch", () => {
  const config = { comparisonAlgorithm: "pixelmatch" as "pixelmatch" };

  test("matches images", async ({ page, port }) => {
    await page.goto(`http://localhost:${port}/green-page.html`);
    expect(await page.screenshot()).toMatchImageSnapshot(`green-page`, config);
  });

  test("does not match image", async ({ page, port }) => {
    await page.goto(`http://localhost:${port}/red-page.html`);
    expect(await page.screenshot()).not.toMatchImageSnapshot(`green-page`, config);
  });
});

test.describe("SSIM", () => {
  const config = { comparisonAlgorithm: "ssim" as "ssim" };

  test("matches images", async ({ page, port }) => {
    await page.goto(`http://localhost:${port}/green-page.html`);
    expect(await page.screenshot()).toMatchImageSnapshot(`green-page`, config);
  });

  test("does not match image", async ({ page, port }) => {
    await page.goto(`http://localhost:${port}/red-page.html`);
    expect(await page.screenshot()).not.toMatchImageSnapshot(`green-page`, config);
  });
});
