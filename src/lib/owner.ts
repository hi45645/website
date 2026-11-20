import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { withScheduleLock } from "./db";
import { DomainError } from "./errors";

const ownerCredentials = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(14).max(128),
});

export async function provisionOwner(email: string, password: string, reset = false) {
  const parsed = ownerCredentials.safeParse({ email, password });
  if (!parsed.success) throw new DomainError("Use a valid email and a password of 14 to 128 characters.");

  const credentials = parsed.data;
  const passwordHash = await hashPassword(credentials.password);
  if (reset) {
    await withScheduleLock(async (tx) => {
      const user = await tx.user.findUnique({ where: { email: credentials.email } });
      if (!user || user.role !== "ADMIN") throw new DomainError("No owner account exists for that email.");
      await tx.account.update({
        where: { providerId_accountId: { providerId: "credential", accountId: user.id } },
        data: { password: passwordHash },
      });
      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.auditLog.create({ data: { actorId: user.id, action: "OWNER_PASSWORD_RESET" } });
    });
    return;
  }

  const id = randomUUID();
  await withScheduleLock(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email: credentials.email }, select: { id: true } });
    if (existing) throw new DomainError("That email is already registered. Use password recovery for your existing owner account.");
    await tx.user.create({
      data: {
        id,
        name: "Clinic owner",
        email: credentials.email,
        emailVerified: true,
        role: "ADMIN",
        accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: passwordHash } },
      },
    });
    await tx.auditLog.create({ data: { actorId: id, action: "OWNER_CREATED" } });
  });
}
