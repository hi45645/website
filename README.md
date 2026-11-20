# Dr Rangarao Skin and Diabetic Care Center

Clinic information and appointment requests for skin and diabetes care in Chintamani. The public form creates a pending request. Clinic staff use the protected dashboard to manage requests and contact patients to confirm availability.

## Run locally with Docker Compose

Install Docker with the Compose plugin. From the repository root, generate local-only credentials in a new `.env` file. If that file already exists, edit it and preserve its existing values.

```sh
(
  set -C
  umask 077
  {
    printf 'LOCAL_DB_PASSWORD=%s\n' "$(openssl rand -hex 24)"
    printf 'BETTER_AUTH_SECRET=%s\n' "$(openssl rand -hex 32)"
  } > .env
)
docker compose up -d db
docker compose build app
docker compose run --rm app npm run db:migrate
docker compose run --rm app npm run owner:create
docker compose up -d app
```

Open <http://localhost:3000> and use <http://localhost:3000/admin/login> for staff access. The database is internal to Compose. Stop the local services with `docker compose down`. The named database volume persists data across restarts. If your network intercepts TLS, use its approved CA bundle for the image build by replacing `docker compose build app` with `docker build --secret id=registry_ca,src=/path/to/approved-ca.pem -t rangarao-clinic-local:latest .`.

## Run locally with Node.js

Use Node.js 24.x and a local PostgreSQL database. Copy `.env.example` to `.env`, set `DATABASE_URL` and `DIRECT_URL` to the local database connection string for a database such as `clinic_local`, retain `APP_URL=http://localhost:3000`, and generate a local auth secret with `openssl rand -hex 32`. Use a dedicated database for development.

```sh
npm ci
npm run db:generate
npm run db:migrate
npm run owner:create
npm run dev
```

The owner command prompts interactively for credentials. Use `npm run owner:reset` from a trusted terminal to recover an existing owner account. With Compose, use `docker compose run --rm app npm run owner:reset`. Store the owner credentials in a password manager.

Use `npm run db:seed` only on a disposable local database named with a `_local` or `_test` suffix. It creates synthetic data. Use `npm run build` followed by `npm run start` to run a production build locally. The health route is `/api/health`.

## Run checks

Use a separate PostgreSQL database named `clinic_test` or another name ending in `_test`, with credentials restricted to that database. Set `TEST_DATABASE_URL` and `TEST_DIRECT_URL` in your shell. Browser and integration tests write synthetic data. Run the checks from a clean test environment and keep the app's port free for Playwright.

```sh
npm run lint
npm run typecheck
npm run test:unit
DATABASE_URL="$TEST_DATABASE_URL" DIRECT_URL="$TEST_DIRECT_URL" npm run db:migrate
npm run test:integration
npx playwright install chromium
npm run test:e2e
npm run build
TEST_RUN_MODE=production npm run test:e2e
npm audit --audit-level=high
```

## Database operations

- Apply checked-in migrations with `npm run db:migrate`. Use the direct PostgreSQL connection and verify the database before running the command. In production, use the direct operator connection as `DATABASE_URL` for owner creation, password recovery, and retention. During development, use `npx prisma migrate dev --name descriptive_change` on a development database to create new migrations and commit the generated files.
- Run `npm run db:retention` to review the counts in dry-run mode. Confirm the target database and retention settings, then schedule `npm run db:retention -- --apply` from a trusted runtime with production database access. The command removes expired appointments and related appointment history, along with older audit records and expired operational data. Upcoming confirmed appointments are preserved. Record execution date, counts, and outcome without patient data. Backup expiration follows the database provider's separate retention policy.
- Enable managed backups and record the recovery window, restore permissions, and recovery owner. Restore into a separate database and verify migration status, record counts, and clinic workflows with authorized access before directing production traffic to a restored database. Keep restored copies access-restricted and expire them as part of the retention policy. If you manage logical exports, define restricted PostgreSQL service entries for the source and isolated restore target; use `PGSERVICE=clinic_backup pg_dump --format=custom --file=/secure/location/clinic.dump` and `PGSERVICE=clinic_restore pg_restore --no-owner --no-privileges --exit-on-error /secure/location/clinic.dump`. Encrypt the export, verify its recovery, and close the temporary restore database when finished.
- After a failed migration, check the provider's status and inspect `npx prisma migrate status` and the failing migration. Back up before manually repairing partial changes. Use `npx prisma migrate resolve --rolled-back MIGRATION_NAME` only after reversing the failed changes, or `--applied` after completing and verifying them manually. Rerun `npm run db:migrate` and repeat application checks.
- For an application rollback, first confirm that the target release supports the current schema. Prefer expand-and-contract migrations so the previous application stays compatible during rollout. If a release depends on an incompatible schema, choose a corrective migration or a coordinated database restore after accounting for newer writes. Rolling back a Vercel deployment leaves PostgreSQL at its current revision.

## Deployment and ownership

See [Vercel deployment](VERCEL_DEPLOYMENT.md), [security and privacy operations](SECURITY.md), the [owner setup checklist](OWNER_CHECKLIST.md), and [observed test results](TEST_RESULTS.md).
