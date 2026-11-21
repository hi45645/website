import { createHmac, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { appointment, dateAhead } from "../fixtures";

const ownerEmail = `owner-${randomUUID()}@example.test`;
const ownerPassword = `synthetic-${randomUUID()}`;
const bookedReferences: string[] = [];
const startedAt = Date.now();

test.beforeAll(async () => {
  await cleanupRateLimits();
  const { provisionOwner } = await import("../../src/lib/owner");
  await provisionOwner(ownerEmail, ownerPassword);
});

test.afterAll(async () => {
  const { db } = await import("../../src/lib/db");
  await db.appointment.deleteMany({ where: { reference: { in: bookedReferences } } });
  const owner = await db.user.findUnique({ where: { email: ownerEmail }, select: { id: true } });
  if (owner) {
    await db.auditLog.deleteMany({ where: { actorId: owner.id } });
    await db.user.delete({ where: { id: owner.id } });
  }
  await cleanupRateLimits();
  await db.$disconnect();
});

async function cleanupRateLimits() {
  const { db } = await import("../../src/lib/db");
  const { authSecret, rateLimitPolicy } = await import("../../src/lib/security");
  const keys = (["appointment", "login"] as const).flatMap((scope) => {
    const width = rateLimitPolicy[scope].seconds * 1000;
    return [startedAt, Date.now()].map((time) =>
      createHmac("sha256", authSecret()).update(`${scope}:${Math.floor(time / width)}:local`).digest("hex"),
    );
  });
  await db.rateLimitBucket.deleteMany({ where: { key: { in: keys } } });
}

test("public pages, clinic contact links, and mobile keyboard navigation", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.getByText("Skin & Diabetes Care in Chintamani", { exact: true })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus-visible")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  const navigation = page.getByRole("button", { name: "Open navigation" });
  await navigation.focus();
  await page.keyboard.press("Enter");
  const contact = page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Contact" });
  await expect(contact).toBeVisible();
  const callLink = page.locator('a[href="tel:+919916731170"]').first();
  await expect(callLink).toHaveAttribute("href", "tel:+919916731170");
  await contact.click();
  await expect(page).toHaveURL(/\/contact$/);
  const directions = page.getByRole("link", { name: /directions/i }).first();
  await expect(directions).toHaveAttribute("href", /google.*maps/);
  const address = new URL((await directions.getAttribute("href"))!).searchParams.get("query");
  expect(address).toContain("Thiyosopicapal Society");

  const footer = page.getByRole("navigation", { name: "Footer navigation" });
  for (const [label, path] of [
    ["About the clinic", "about"],
    ["Skin and diabetes care", "care"],
    ["Privacy notice", "privacy"],
  ]) {
    await footer.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${path}$`));
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  }
});

test("appointment submission is persisted and can be managed through owner login", async ({ page }) => {
  const preferredDate = dateAhead(14);
  await page.goto("/appointment");
  const whatsapp = new URL((await page.getByRole("link", { name: "Send on WhatsApp" }).getAttribute("href"))!);
  expect(whatsapp.origin + whatsapp.pathname).toBe("https://wa.me/919916731170");
  expect(whatsapp.searchParams.get("text")).toContain("request an appointment");
  await page.getByRole("link", { name: "Use the online appointment form" }).click();
  await page.getByLabel(/patient name/i).fill("Synthetic Browser Patient");
  await page.getByLabel(/mobile number/i).fill("+919000000002");
  await page.getByLabel(/preferred date/i).fill(preferredDate);
  await page.getByLabel(/preferred start time/i).fill("09:00");
  await page.getByLabel(/preferred end time/i).fill("10:00");
  await page.getByLabel(/care category/i).selectOption("SKIN");
  const posted = page.waitForResponse((response) =>
    response.url().endsWith("/api/appointments") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /request|submit/i }).click();
  const response = await posted;
  expect(response.ok()).toBe(true);
  const { reference } = await response.json();
  bookedReferences.push(reference);
  await expect(page.getByText("Your request has been received. The clinic will contact you to confirm availability.")).toBeVisible();

  const loginPage = await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  expect(loginPage?.headers()["content-security-policy"]).toMatch(/nonce-/);
  await page.getByLabel("Email").fill(ownerEmail);
  await page.getByLabel("Password").fill(ownerPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/?$/);
  const dashboard = await page.reload();
  expect(dashboard?.headers()["cache-control"]).toMatch(/no-store/);
  const search = page.getByRole("searchbox", { name: "Search", exact: true });
  const searchButton = page.getByRole("button", { name: "Search", exact: true });
  await search.fill("Unmatchable synthetic filter");
  await searchButton.click();
  await expect(page.getByText("No matching appointment requests.")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/?$/);
  await search.fill("Synthetic Browser Patient");
  await page.getByLabel("Status filter").selectOption("PENDING");
  await searchButton.click();
  await expect(page).toHaveURL(/\/admin\/?$/);
  await expect(page.getByRole("link", { name: reference, exact: true })).toBeVisible();
  await page.getByRole("link", { name: reference, exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/appointments\/[^/]+$/);
  await expect(page.getByRole("heading", { name: "Appointment request", exact: true })).toBeVisible();
  await expect(page.getByText("Synthetic Browser Patient")).toBeVisible();
  await expect(page.getByText("Pending", { exact: true })).toBeVisible();
  const schedule = page.getByRole("form", { name: "Schedule appointment" });
  await schedule.getByLabel("Scheduled time", { exact: true }).fill("09:00");
  await schedule.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
  await schedule.getByLabel("Scheduled time", { exact: true }).fill("09:30");
  await schedule.getByRole("button", { name: "Reschedule", exact: true }).click();
  await expect(page.getByText(`${preferredDate} at 09:30 IST`)).toBeVisible();
  await page.getByRole("button", { name: "Mark no-show" }).click();
  await expect(page.getByText("No-show", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /sign out|log out/i }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.goto("/admin/settings");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("booking API rejects invalid requests and replays a submission without changing its reference", async ({ request, baseURL }) => {
  const headers = { origin: baseURL! };
  const invalid = await request.post("/api/appointments", {
    headers,
    data: appointment({ date: dateAhead(-1) }),
  });
  expect(invalid.status()).toBe(400);

  const requestBody = appointment({ mobile: "+919000000003" });
  const first = await request.post("/api/appointments", { headers, data: requestBody });
  expect(first.ok()).toBe(true);
  const retry = await request.post("/api/appointments", { headers, data: requestBody });
  expect(retry.ok()).toBe(true);
  const created = await first.json();
  bookedReferences.push(created.reference);
  expect(await retry.json()).toEqual(created);

  const crossOrigin = await request.post("/api/appointments", {
    headers: { origin: "https://foreign.example.test" },
    data: appointment(),
  });
  expect(crossOrigin.status()).toBe(403);
});

test("an authenticated account without the administrator role cannot see protected data or register an account", async ({ request, baseURL }) => {
  const headers = { origin: baseURL! };
  const login = await request.post("/api/auth/sign-in/email", {
    headers,
    data: { email: ownerEmail, password: ownerPassword },
  });
  expect(login.ok()).toBe(true);
  expect(await login.json()).toEqual({ success: true });
  expect(login.headers()["cache-control"]?.split(",").map((directive) => directive.trim())).toContain("no-store");
  const cookies = (await request.storageState()).cookies;
  const sessionCookie = cookies.find(({ name }) => name.endsWith(".session_token"));
  expect(sessionCookie).toMatchObject({ httpOnly: true });

  const { db } = await import("../../src/lib/db");
  await db.user.update({ where: { email: ownerEmail }, data: { role: "USER" } });
  try {
    const denied = await request.get("/admin/settings", { maxRedirects: 0 });
    expect(denied.status()).toBe(307);
    expect(denied.headers().location).toMatch(/\/admin\/login$/);
    const newAccount = await request.post("/api/auth/sign-up/email", {
      headers,
      data: { name: "Synthetic disabled signup", email: "signup@example.test", password: ownerPassword },
    });
    expect(newAccount.status()).toBe(404);
  } finally {
    await db.user.update({ where: { email: ownerEmail }, data: { role: "ADMIN" } });
  }
});
