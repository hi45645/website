import "./load-env";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { db } from "../src/lib/db";
import { DomainError } from "../src/lib/errors";
import { provisionOwner } from "../src/lib/owner";

async function ask(prompt: string, hidden = false) {
  const output = hidden ? new Writable({ write(_chunk, _encoding, callback) { callback(); } }) : stdout;
  const terminal = createInterface({ input: stdin, output, terminal: true });
  const abort = new AbortController();hh
  terminal.once("SIGINT", () => abort.abort());
  if (hidden) stdout.write(prompt);
  try {
    return await terminal.question(hidden ? "" : prompt, { signal: abort.signal });
  } finally {
    terminal.close();
    if (hidden) stdout.write("\n");
  }
}

async function main() {
  const [action, ...unexpected] = process.argv.slice(2);
  if ((action !== "create" && action !== "reset") || unexpected.length > 0 || !stdin.isTTY || !stdout.isTTY) {
    throw new DomainError("Use npm run owner:create or npm run owner:reset in an interactive terminal.");
  }
  const email = await ask("Owner email: ");
  const password = await ask("Password (14 to 128 characters): ", true);
  const confirmation = await ask("Confirm password: ", true);
  if (password !== confirmation) throw new DomainError("The passwords do not match.");
  await provisionOwner(email, password, action === "reset");
  console.log(action === "reset" ? "Owner password reset. Existing sessions revoked." : "Owner account created.");
}

main().catch((error: unknown) => {
  console.error(error instanceof DomainError ? error.message : "Owner account operation failed. Check the database configuration and migrations.");
  process.exitCode = 1;
}).finally(() => db.$disconnect());
