# Deploy to Vercel

Deploy the source from [hi45645/website](https://github.com/hi45645/website) to Vercel. The app runs as a Next.js project and uses a separate PostgreSQL database. Keep the database, domain, and notification provider accounts under clinic control.

## 1. Provision PostgreSQL

1. Create a PostgreSQL project with a provider such as Neon. Select a region consistent with the clinic's data handling requirements and choose a nearby supported Vercel region for the application.
2. Create a production database and separate database roles. Use an owner or migration role for schema changes and a non-owner application role for ordinary service reads and writes. Use separate projects or databases and credentials for preview and tests. On Neon you can use the project owner connection to open a `psql` session and create a restricted role through SQL. Set its password interactively:

   ```sql
   CREATE ROLE clinic_app LOGIN;
   \password clinic_app
   ```
3. In the provider's **Connect** dialog, select the production database and application role. Enable pooling and copy that connection string for `DATABASE_URL`. In Neon the pooled hostname contains `-pooler`. Preserve the provider's TLS parameters, such as `sslmode=require`.
4. Select the migration role and turn pooling off. Copy the direct connection string for `DIRECT_URL`. Keep this connection in a controlled migration environment. If preview uses its own migrations, use that environment's separate direct connection.
5. After the migration, connect as the migration role and grant application access. Substitute your database name and role for `clinic_production` and `clinic_app`. If a migration introduces new tables or sequences, update the grants before deploying code that uses them.

   ```sql
   GRANT CONNECT ON DATABASE clinic_production TO clinic_app;
   GRANT USAGE ON SCHEMA public TO clinic_app;
   GRANT SELECT ON TABLE public."user", public."account" TO clinic_app;
   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."session" TO clinic_app;
   GRANT SELECT, INSERT, UPDATE ON TABLE
     public."Appointment", public."ClinicSettings", public."RateLimitBucket" TO clinic_app;
   GRANT SELECT, INSERT ON TABLE public."AuditLog" TO clinic_app;
   ```

## 2. Configure the Vercel project

In Vercel, choose **Add New → Project** and import `hi45645/website`. Restrict GitHub integration access to this repository as appropriate. Use these project settings.

| Setting | Value |
| --- | --- |
| Framework preset | Next.js |
| Root directory | Repository root (`.`) |
| Node.js version | 24.x |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | Framework default |
| Production branch | `main` |

Set each variable by environment under **Settings → Environment Variables**. Generate distinct auth secrets through a trusted terminal using `openssl rand -hex 32`. Store the output in the Vercel environment editor and the clinic's secret manager.

| Required value | You supply |
| --- | --- |
| `DATABASE_URL` | Pooled PostgreSQL URL for the application role, scoped to its own environment |
| `APP_URL` | Exact canonical deployment origin, with scheme and hostname and no path, for example `https://YOUR-PROJECT.vercel.app` |
| `BETTER_AUTH_SECRET` | Independent cryptographically random secret for each deployed environment |

For controlled migrations, also set `DIRECT_URL` to the direct migration role URL in the operator environment. Keep these credentials there and omit `DIRECT_URL` from Vercel. Keep all credentials server-side.

Use the public hostname staff and patients will actually visit for `APP_URL`. Better Auth uses this origin for authentication origin checks. For preview, use a stable preview hostname configured in the preview environment or enable Vercel system environment variables and leave preview `APP_URL` unset to use the deployment-specific `https://VERCEL_URL`. Verify admin login from the chosen origin. Use synthetic data, independent auth secrets and an independently migrated database for preview. Keep provider notifications disabled in previews or use a sandbox destination.

Optional Resend variables, set together to enable email:

| Optional variable | You supply |
| --- | --- |
| `RESEND_API_KEY` | A Resend key scoped to sending for the intended account |
| `NOTIFICATION_FROM` | Sender using a domain verified with Resend |
| `NOTIFICATION_TO` | Clinic staff mailbox with approved access |

Email messages direct staff to the dashboard. Requests remain recorded if email is unavailable. Provider acceptance means the provider queued a message. Delivery to the recipient's inbox is outside the application's visibility. Review the dashboard for requests and provider status, including any failed or indeterminate sends. The app has no automated email retry process.

## 3. Migrate and create the owner account

From a trusted terminal and the exact source revision you intend to deploy, run `npm ci`. Permit HTTPS access to `binaries.prisma.sh` from this migration environment so Prisma can obtain and verify its pinned native migration engine. Load the production variables through your secret manager or an owner-only temporary environment file excluded by Git. Set both `DATABASE_URL` and `DIRECT_URL` privately to the direct operator connection for this terminal session. Check the provider database and branch first.

```sh
npm run db:generate
npm run db:migrate
npx prisma migrate status
```

Grant the application-role privileges from step 1, then run `npm run owner:create` with the operator connection still set as `DATABASE_URL`. Use the same operator connection for password recovery and retention maintenance. The bootstrap command reads credentials interactively. Remove temporary local credential files when finished. Keep migrations as a controlled release step outside Vercel preview and production build commands.

## 4. Deploy and verify

After the database is migrated and the owner created, deploy the intended `main` revision from Vercel. If the import wizard created an early deployment, wait to give out its URL until verification is complete.

1. Open the configured origin on desktop and mobile. Verify the public pages, call link, directions, and privacy notice. Confirm `/api/health` responds successfully.
2. Ask an authorized owner to load `/admin` while signed out and verify redirection to login. Sign in and review settings and counts.
3. Exercise booking and staff actions against the preview site using synthetic contacts. For production smoke verification, use an owner-controlled synthetic name and phone, keep notifications in mind, and remove synthetic records per clinic policy. Verify that a request appears as pending, confirm or reschedule within configured capacity, cancel it, and sign out.
4. Confirm the intended retention and backup schedules are active and review how to escalate a failure.

## 5. Add the production domain

If the clinic already controls a domain, add it under **Settings → Domains** and follow Vercel's displayed DNS instructions at the registrar or DNS provider. Wait for DNS verification and provisioned HTTPS. Make the selected hostname canonical, update production `APP_URL` to its HTTPS origin, redeploy, and repeat login, booking, and metadata checks from that hostname.

## Recurring requirements

Maintain the Vercel project, PostgreSQL plan with suitable backups, and domain registration if a domain is used. Schedule retention from an owner-controlled runner. Keep staff access current, monitor failed notifications if enabled, and test restore procedures. See [database operations](README.md#database-operations).
