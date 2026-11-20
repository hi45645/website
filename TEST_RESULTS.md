# Test results

The checks used Node.js 24.22.1, disposable PostgreSQL 17 databases and synthetic records. Playwright ran in Chromium 156 via the cloud environment's system browser.

| Command | Observed result |
| --- | --- |
| `npm run lint` | Passed without warnings. |
| `npm run typecheck` | Next.js route types generated and TypeScript passed. |
| `npm audit --audit-level=high` | 0 reported vulnerabilities. |
| `npm run db:generate` | Generated the Prisma client using the package's JavaScript engine. |
| `npm run test:unit` | 10 passed. Covered Kolkata midnight, appointment input validation, a generic database-error response and authorization before an admin mutation. |
| `DATABASE_URL="$TEST_DATABASE_URL" DIRECT_URL="$TEST_DIRECT_URL" npm run db:migrate` | Blocked in the cloud by HTTP 403 from the proxy when fetching the native Prisma schema-engine checksum from `binaries.prisma.sh`. |
| `psql -v ON_ERROR_STOP=1 < prisma/migrations/20261120000000_initial/migration.sql` | Applied the checked-in SQL successfully to an empty, disposable PostgreSQL 17 database. This verified the schema SQL. The Prisma CLI deploy path, including migration-ledger operations, still needs a network that can reach `binaries.prisma.sh`. |
| `npm run test:integration` | 6 passed. Covered persistence, concurrent duplicate submissions, concurrent capacity enforcement, status transitions, rescheduling, working hours, blocked dates, notification failures, and separate database-backed booking and login limits. |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e` | 4 passed. Covered public navigation, mobile layout and keyboard access, booking, dashboard search, appointment actions, owner login and logout, protected caching, a token-free sign-in response with an HttpOnly session cookie, request validation and idempotency, and rejection of an authenticated non-admin. |
| `NEXT_TELEMETRY_DISABLED=1 npm run build` | Passed with no database URLs or auth secret configured. |
| `TEST_RUN_MODE=production PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e` | All 4 browser tests passed against the production build through `next start`. |
| `npm run start` and local HTTP smoke with an unreachable loopback database | The health endpoint and public home returned 200. The booking endpoint returned a generic 503 without internal error details. |
| `docker compose config` and Docker BuildKit build | Compose validated and the image built from the lockfile without app secrets. The build used the cloud's approved registry CA. |
| Compose production browser smoke with restricted PostgreSQL grants | Passed health, booking, owner sign-in, appointment confirmation and audit, settings and audit, and logout after applying the SQL in an isolated database. |
| `npm run owner:create`, `npm run owner:reset`, `npm run db:seed`, `npm run db:retention` and `npm run db:retention -- --apply` | Verified interactive hidden password entry, owner recovery, idempotent synthetic seeding, read-only dry run and cleanup of one expired synthetic record in an isolated database. |

The database-failure unit test injects an error from the rate-limit dependency. The email integration tests use a simulated provider response. No real patient data or live notification delivery was used.
