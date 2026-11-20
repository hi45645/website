import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { applicationOrigin } from "./origin";
import { authSecret } from "./security";

function createAuth() {
  const baseURL = applicationOrigin();
  return betterAuth({
    appName: "Dr Rangarao Skin and Diabetic Care Center",
    baseURL,
    secret: authSecret(),
    trustedOrigins: [baseURL],
    database: prismaAdapter(db, { provider: "postgresql" }),
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 14, maxPasswordLength: 128 },
    user: {
      additionalFields: { role: { type: "string", required: true, defaultValue: "USER", input: false } },
    },
    session: { expiresIn: 60 * 60 * 8, updateAge: 60 * 60 },
    advanced: {
      useSecureCookies: baseURL.startsWith("https://"),
      ipAddress: { disableIpTracking: true },
    },
    rateLimit: { enabled: false },
    logger: { disabled: true },
  });
}

let auth: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  auth ??= createAuth();
  return auth;
}

export async function getAdmin() {
  const session = await getAuth().api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
  return session?.user.role === "ADMIN" ? session.user : null;
}

export async function requireAdmin() {
  const user = await getAdmin();
  if (!user) redirect("/admin/login");
  return user;
}
