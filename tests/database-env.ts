const syntheticAuthSecret = "clinic-tests-only-85bf78b91bea5851dbcd798acbce9781";

function isolatedUrl(variable: string, value?: string): string {
  if (!value) throw new Error(`Set ${variable} to an isolated PostgreSQL database with a name ending in _test.`);
  const url = new URL(value);
  const database = decodeURIComponent(url.pathname.slice(1));
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !database.endsWith("_test")) {
    throw new Error(`${variable} must point to PostgreSQL with a database name ending in _test.`);
  }
  return value;
}

export function configureTestDatabase(origin: string) {
  const databaseUrl = isolatedUrl("TEST_DATABASE_URL", process.env.TEST_DATABASE_URL);
  const directUrl = isolatedUrl("TEST_DIRECT_URL", process.env.TEST_DIRECT_URL || databaseUrl);
  const testEnv = {
    DATABASE_URL: databaseUrl,
    DIRECT_URL: directUrl,
    APP_URL: origin,
    BETTER_AUTH_URL: origin,
    BETTER_AUTH_SECRET: syntheticAuthSecret,
    RESEND_API_KEY: "",
    NOTIFICATION_FROM: "",
    NOTIFICATION_TO: "",
    VERCEL: "0",
  };
  Object.assign(process.env, testEnv);
  return testEnv;
}
