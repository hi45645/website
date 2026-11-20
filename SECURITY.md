# Security and privacy operations

## Report and respond

Send suspected vulnerabilities privately to the repository owner through GitHub private vulnerability reporting if enabled, or through a private clinic-approved channel. Include the affected version, what you observed, and synthetic reproduction data. Keep patient information out of issue reports and messages.

For suspected exposure, restrict access immediately, preserve security evidence in an access-controlled location, rotate affected keys and credentials, and invalidate staff sessions as needed. Coordinate patient and regulatory notifications with the clinic's privacy decision-maker.

## Patient information

The appointment form stores the patient's name, mobile number, preferred date and time window, and care category. The dashboard records scheduling details, request status, and permitted administrative notes. Enter scheduling information only in administrative notes. Keep symptoms, diagnoses, prescriptions, and other clinical records in the clinic's separately approved system.

Use individual authorized staff accounts. Restrict the database dashboard, backups, migration credentials, and secret manager to their authorized operators. Clinic staff use the protected dashboard to follow up on requests. Avoid copying details into logs, spreadsheets, analytics, email messages, or support tickets.

The appointment reference identifies a request to clinic staff. Treat it as a reference for communication. The public site provides no lookup for patient details. Optional email indicates a new request and directs staff to the dashboard.

## Retention and deletion

1. Have the owner set and document the appointment retention period, publish the approved privacy contact, and identify authorized staff for data requests.
2. Review the dry-run `npm run db:retention`, then schedule `npm run db:retention -- --apply` on a trusted runner using the intended production database. Confirm that the schedule, retention settings, and backup expiry meet the owner's policy.
3. Verify the identity and authority of anyone requesting a deletion offline with the clinic. The owner or authorized database operator should locate the record through the protected dashboard and arrange case-specific deletion using a parameterized database operation. Avoid pasting patient details into terminal arguments or generating permanent patient-data exports.
4. In an interactive `psql` session on the verified database, the operator can prompt for the internal appointment ID using `\prompt 'Verified appointment ID: ' appointment_id`. Run `BEGIN;` and then `DELETE FROM public."Appointment" WHERE id = :'appointment_id';`. Only `COMMIT;` after confirming `DELETE 1`, otherwise `ROLLBACK;`. Related appointment audit rows are deleted by the database relationship.
5. Document the action with the minimum operational details required. Track deletion separately from database backup expiry and ensure restored backups do not reintroduce previously deleted records.

## Deployment safeguards

The application sets production HSTS, denies framing, suppresses referrer information, and limits browser permissions. Admin responses use a per-request script nonce and private, no-store caching. Public pages allow inline framework hydration within their content security policy. On Vercel, login and appointment submission limits use the platform's forwarded client IP in a hashed, short-lived database bucket. Non-Vercel installations group traffic into a shared bucket for each operation.

- Use HTTPS for the public site and provider TLS for database connections. Set the app origin to its exact canonical hostname and verify login from that hostname. Rotate the authentication secret according to clinic policy and expect existing sessions to be affected.
- Supply separate production, preview, development, and test databases and secrets. Preview and automated checks should contain synthetic data only. Use a scoped application database role, with a separate migration role held by authorized operators.
- Keep framework and dependency versions supported. Run dependency auditing and CI after updates. Review the production configuration, traffic limits, backup/restore workflow, and privacy notice before publication. The Prisma 6 migration CLI uses its JavaScript engine and adapter configuration. Validate new migrations on isolated PostgreSQL before production.
- Configure a clinic-approved mailbox if optional alerts are needed. Verify provider acceptance and mailbox delivery separately. Treat the dashboard as the operational source for appointment requests.
