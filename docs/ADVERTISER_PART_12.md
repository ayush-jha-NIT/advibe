# Part 12 — Advertiser Billing, Reports, Notifications, Settings and Support

## Routes

- \`/advertiser/billing\`: fictional payment ledger, paid/pending/refunded demo KPIs, campaign/reference search, payment-status filters, sample payment statement preview and a downloadable plainly labeled TXT **demo statement**. Displays Cashfree production checkout readiness, but **does not invoke a gateway**.
- \`/advertiser/reports\`: campaign-level count/status and stored illustrative impression totals, bar chart, downloadable CSV. No fabricated day-by-day analytics.
- \`/advertiser/notifications\`: account-owned demo notices, unread/type/text filters, mark individual and all read.
- \`/advertiser/settings\`: non-sensitive profile editing (display name, business name, city) for preset demo advertiser; local preferences to hide dashboard notification previews and choose default 5/10/20 campaign rows.
- \`/advertiser/support\`: FAQ search and account-owned demo tickets with validation, optional owned campaign link, ticket filtering, Admin demo notification. **No live helpdesk or guaranteed response**.

The official AdVibe brand/logo and existing portal shell are unchanged. All pages use responsive Tailwind layouts and appropriately labeled demo notices.

## State integration

New store actions are \`updateAdvertiserProfile\`, \`markAllNoticesRead\`, \`createAdvertiserTicket\`. They verify a provisioned demo advertiser identity and preserve role/owner checks. Individual notices still use the Part 3 \`markNoticeRead\` action. Ticket \`category\`, \`description\` and \`campaignId\` are optional additions to the shared TypeScript domain schema so old records remain compatible.

Settings preferences live in \`advibe:advertiser-preferences:v1\` browser storage and affect the dashboard and campaign directory; they do not send email/push. Profile changes are fictional browser-local account values, not verified legal/billing identities.

## Cashfree boundary and invoice safety

The existing \`src/services/cashfree-contract.ts\` describes the eventual backend contract but is not invoked to create orders. The checkout review displays whether the **demo record** has Admin approval and a positive stored quote and checks against an existing fictional paid entry. Even when it is eligible, real checkout remains disabled.

Production should use the server to authenticate and authorize the request, recompute/validate the quote, create a Cashfree order, store its ID, fetch and verify server-side final payment status, process verified webhooks idempotently and only then authorize reserved inventory. Never accept browser flags or redirected callback claims as payment proof.

A statement generated here is intentionally **not a tax invoice, payment proof, receipt or GST-credit document**. No dates, invoice numbers, company registration, actual GSTIN, provider confirmation, settled status or split taxes are fabricated. Proper invoices require verified issuer identity, transaction metadata and tax treatment from the production backend.

## Data protection and limitations

These are **fictional demo records stored in the user's browser**, not a security boundary. Newly created frontend signup identities have no provisioned record. Do not enter sensitive information into support requests or settings. No banking instruments, card details, ID documents, or real personal information are collected. Tickets create demo Admin notices but do not send anything outside the page.

## QA

\`tests/advertiser-account.test.mjs\` covers campaign/advertiser payment ownership, totals, invoice record ownership, checkout eligibility, notification scoping, profile validation and support ticket validation/filtering. GitHub CI executes ESLint, TypeScript, all demo tests and production build. Real device/browser QA remains scheduled for Parts 22–23.
