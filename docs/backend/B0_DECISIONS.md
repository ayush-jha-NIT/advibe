# AdVibe B0 — Architecture decisions and unresolved product questions

This register documents assumptions, NOT approvals. B0 does not authorize real KYC, collection, payout or device operation. Assign final decision owners before the listed phase begins.

| ID | Decision | B0 safe assumption / proposal | Owner and deadline |
| --- | --- | --- | --- |
| D01 | Physical screen player hardware and protocol | Signed HTTPS manifests + events, with MQTT optional for device control; no actual device firmware chosen | CTO + device vendor, before B8 |
| D02 | Booking capacity | Exclusive entire screen per date/time as safe conservative starting model; playback rotation slots are a different model | Product/operations, before B11/B13 |
| D03 | Vehicle and placement specs | Keep current bike/auto/car and supported placements as provisional, require engineering/certification | Hardware operations, before B8/B10 |
| D04 | Commercial pricing and tax | Use exact paise with quote version; frontend demo 18% GST is NOT automatically legally valid | Finance/tax advisor, before B11/B14 |
| D05 | Driver earning formula | No guaranteed income; derive from agreed verified participation and eligible delivery only | Product/finance/legal, before B18 |
| D06 | Cashfree merchant account and policies | Provider sandbox only until KYB, webhook tests, refund and reconciliation checks | Finance + engineering, before B14 |
| D07 | Driver payout provider and bank handling | Tokenized beneficiary via approved provider; never store full bank details in browser | Finance + compliance, before B18 |
| D08 | KYC provider and document retention | Private encrypted storage, consent-led collection, minimal retention; no direct Aadhaar assumptions | Legal/compliance, before B7 |
| D09 | GPS consent and retention | Opt-in purpose-specific tracking and aggregation, retention TBD; no silent background surveillance | Legal + operations, before B17 |
| D10 | Admin privileges and MFA | Admin MFA mandatory, production staff roles still to be scoped | Security + operations, before B4 |
| D11 | Domains and cookie auth | Use controlled same-site domain/proxy, no Vercel/Render cross-site cookie guesswork | CTO + DevOps, before B3 |
| D12 | Video upload provider and codec limits | Signed private object storage, server-side media scan/transcode and content moderation | CTO + creative ops, before B10 |
| D13 | Cancellation/refund policy | No auto refunds on campaign cancel, policy and operational transition to be approved | Finance + legal, before B14/B19 |
| D14 | Notifications and support provider | Email/SMS + in-app; opt-in and provider limits required | Operations, before B20 |
| D15 | Customer legal documents | Privacy, advertiser agreement, driver contract and dispute rules reviewed and published | Counsel + business, before pilot |
| D16 | Production readiness / actual launch | Staging data privacy and payment webhooks signed off; hardware pilot and accessibility testing pass | CTO + ops, before B23 |

## Accepted B0 engineering conventions (provisional until code review)

- Single backend Node/Express TypeScript in same repository, initially hosted separately from Vercel frontend.
- Neon/PostgreSQL, Prisma migrations and transactional constraints; Redis/BullMQ for asynchronous work.
- /api/v1 OpenAPI contract, status/error envelopes, strict server RBAC and owner scope.
- Payment/payout/device/webhook operations MUST be independently verified by trusted backend integrations.
- Separate sandbox, staging and production; never copy seeded driver identity or sample bank data into production.

## Dependency gates

B1 may start with no vendor credentials. B2 requires Neon provisioning. B3/B4 cannot go live without account-domain/session-policy decision D11. B7 requires compliance approval D08. B8/B16 depend on D01/D03. B13 depends on D02. B14/B19 depend on D04/D06/D13. B17 requires D09. B18 requires D05/D07. B23 requires every approved policy and verified staging pilot.
