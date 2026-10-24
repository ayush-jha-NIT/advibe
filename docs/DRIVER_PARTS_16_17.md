# AdVibe Parts 16–17 — Driver finance, maintenance, support and notices

## Delivered routes

**Part 16**
- /driver/earnings: current driver's fictional settlement totals, gross, deductions, net, pending/processed/failed groups; search, date intersection filters, monthly bars and CSV download.
- /driver/payouts: status-filtered ledger rows, period, campaign reference, breakdown and a sample statement dialog.

**Part 17**
- /driver/maintenance: screens from the current driver plus a validated issue report form (offline/damage/power/mount/other) and screen-linked ticket list.
- /driver/support: FAQ and general ticket submission; includes existing seeded support tickets as well as submitted entries.
- /driver/notifications: account-owned alerts, search, status/type filters, mark read, and mark all read.
- /driver/profile: read-only sample driver and document verification states.
- /driver/delivery: sample device status and confirmed booking summary; no actual play events exist.
- /driver/trips: explicit absence of route, GPS and exposure telemetry, with links to existing schedule.

## Financial integrity and safety

All settlement amounts are integer paise from seeded/demo records. The gross/deductions/net breakdown never converts a pending status into a processed one. Processed is merely a fictional ledger status, not a payment provider receipt. There are no transfer timestamps, bank account/IFSC/UPI entries, payroll claims, pay-slip numbers, actual verified device impressions, binding earnings formulas or tax invoices. CSV exports and dialogs say they are fictional.

The Part 16 pages do not mutate settlements. Actual disbursement should be controlled by a trusted backend integrating a payout provider and verified webhook/reconciliation.

## Ticket controls and scope

Maintenance requests are accepted only for the signed-in preset demo driver's screens with a linked owned vehicle. A new ticket must have a validated category, length-limited subject and description; stored fields include screen ID, issue type and ticket details, but no photos or personal identifiers. General driver support tickets validate a separate topic and description. Both generate browser-local Admin and driver demo notices and an audit event; they do not create real work orders or contact staff.

Notifications can only be marked read by their recipient. Mark all read is scoped to the active demo driver. Older seeded tickets remain compatible since the new ticket fields are optional.

## Missing real-world integrations

Real KYC, backend driver accounts and RBAC, consent-based geo telemetry, device heartbeats, playback proofs, technician dispatch, helpdesk, payout provider, bank detail verification, invoices and monitoring remain outside the frontend. UI identity filtering is not a security boundary.

## Verification

Regression tests cover settlement ownership, exact net arithmetic, filters, date buckets, CSV safeguards, cross-driver screen ownership, input validation, ticket and notification selection. GitHub CI runs lint, type check, tests and Next.js build. Real phone visual QA is planned in Parts 22–23.
