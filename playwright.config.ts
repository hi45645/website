import { defineConfig, devices } from "@playwright/test";
import { configureTestDatabase } from "./tests/database-env";

const port = 3417;
const origin = `http://127.0.0.1:${port}`;
const env = configureTestDatabase(origin);
const production = process.env.TEST_RUN_MODE === "production";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    ...devices["Desktop Chrome"],
    baseURL: origin,
    launchOptions: executablePath ? { executablePath } : undefined,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run ${production ? "start" : "dev"} -- --hostname 127.0.0.1 --port ${port}`,
    url: origin,
    env,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
