# AdVibe B19: tax invoices, partial refunds and financial reconciliation

**Delivered backend capability:** immutable invoicing based on approved quote snapshots, partial refund workflows with verified Cashfree PG refund evidence, corresponding GST credit-note snapshots, and independent payment/refund reconciliation. Frontend remains demo mode. No real merchant API, GST portal, GST e-invoice IRN or CA signoff was provisioned.

## Production approvals and tax details

Tax estimates from earlier milestones are not automatically lawful GST liabilities. Before enabling production documents finance/legal must approve decisions **D04 (tax), D06 (merchant), D13 (refund policy)**, the correct place-of-supply rules, SAC classification, tax treatment, credit-note practice, e-invoicing eligibility and any applicable issuance deadlines.

`POST /api/v1/admin/invoices` requires a fresh MFA Admin session, CSRF, Idempotency-Key, paid allocated order, matching successful payment and exact frozen B11 quote arithmetic. Supplier details are read exclusively from these server-side variables: `B19_SELLER_NAME`, `B19_SELLER_ADDRESS`, `B19_SELLER_GSTIN`, `B19_SELLER_STATE_CODE`, `B19_SERVICE_SAC`. Recipient legal name, postal address, state code, optional GSTIN, place of supply and service description are explicitly captured and snapshotted at issue time; the request rejects contradicting recipient GSTIN/state/PoS. Registration is **format checked, not independently verified** against the GST portal. B19 uses intrastate CGST/SGST or interstate IGST based on selected state codes; complex reverse-charge, exports, SEZs, exemptions and registration cases require additional policy work before deployment.

`FinanceInvoice` has a consecutive unique fiscal-year number `AV2627-I-000001` (15 characters) allocated transactionally, and immutable quote subtotal, discount, taxable base, CGST/SGST/IGST and total in integer paise. This is an accounting snapshot, not a PDF, digitally signed invoice or official GST e-invoice IRN. B19 does **not** claim the document meets every statutory obligation.

`GET /api/v1/payments/orders/{orderId}/invoice`, `.../credit-notes` and `.../refunds` require active advertiser business membership or MFA Admin. No foreign tenant details are leaked.

Production document issuance is off unless `B19_FINANCE_APPROVED=true`, `PRICING_TAX_POLICY_APPROVED=true`, `B19_TAX_INVOICES_ENABLED=true` plus valid issuer configuration and dedicated legal approvals. Test mode still requires real-looking explicit CI-only issuer settings.

## Approved refund lifecycle

`POST /api/v1/admin/refunds` requires MFA Admin, CSRF, 8–128 character Idempotency-Key, quote-linked paid invoice, reviewed cancellation rationale and documented policy reference. Amount must be at least ₹1 in paise and cannot exceed remaining paid amount including in-flight claims. The transaction locks the payment order and freezes refund identity `adv_b19_...` before any provider call. Uncertain/failed refunds move to `NEEDS_REVIEW`, blocking further refunds until a finance investigation. Do not assume a cancelled campaign is refundable.

A protected worker, `B19_REFUNDS_WORKER_ENABLED=true npm run refunds:reconcile`, submits only queued refunds via Cashfree PG `POST /orders/{id}/refunds`, using a **stable provider refund ID** and `x-idempotency-key`. Subsequent attempts query `GET /orders/{id}/refunds/{refundId}`. A returned `SUCCESS` on creation is independently checked with GET. Only independently confirmed `SUCCESS` persists `SUCCEEDED` and creates an immutable `FinanceCreditNote`; `PENDING/ONHOLD` remain pending; failed/cancelled require review. No provider success is inferred from local status, payment webhook, or frontend. The refund integration uses `CASHFREE_ENV`, `CASHFREE_CLIENT_ID`, and `CASHFREE_CLIENT_SECRET`; sandbox/pilot must be exercised before production enablement.

Credit notes have their own fiscal numbering `AV2627-C-000001` and exact paise allocations; cumulative proportional component calculations ensure successive partial refunds sum to the full invoice tax components and gross amount, without floating-point currency calculations. A credit note is not automatically transmitted to tax authorities or digitally signed. A final charge adjustment must be approved by a tax professional.

Production refund initiation and worker require `B19_FINANCE_APPROVED=true`, `B19_REFUND_POLICY_APPROVED=true`, `B19_REFUNDS_ENABLED=true`; actual worker additionally requires `B19_REFUNDS_WORKER_ENABLED=true`. The worker must be deployed as a trusted separate scheduled process; B19 does not silently run a timer in Express.

## Independent reconciliation

`POST /api/v1/admin/finance/reconcile/{orderId}` independently reads the provider's order status, payment list and each registered refund by stable ID. It compares order amount, collection count and amounts, verified local successful payment records, confirmed local and remote refunds and unresolved states. Each attempt records an immutable `FinanceReconciliationEvent` with status `MATCHED` or `MISMATCH`, source amounts, evidence digest and audited reviewer. Any mismatch marks the payment order `requiresResolution=true`, with no automatic erasure, edits or silent clearing. `GET /api/v1/admin/finance/reconciliation` is Admin-only and bounded to 50 recent records. Independent B18 driver payout reconciliation remains separate; those results must be aligned during production financial accounting.

## Security and tests

B19 adds a versioned PostgreSQL migration with unique invoice numbers, refund IDs, credit-note links, nonnegative balanced tax arithmetic, payment/order relationships, immutable trigger enforcement, and transactional serialization. CI uses a local PostgreSQL 16 service with injected deterministic Cashfree simulators and tests authorization, replay, full and partial allocations, provider failures, duplicate transitions, cross-tenant reads, immutable tax snapshots, and mismatch detection. Prior B0–B18 suites, frontend contract/build and Chromium browser smoke must remain green.

**Remaining for production:** CA/legal-approved invoicing and registration checks, official GST invoice render/signature/e-invoice adapter if legally required, genuine provider sandbox certification and reconciliation of settlements/fees, statutory tax return integration, approved refunds policy, retention policy, merchant KYB and staged bank pilot. No launch approval is implied by passing CI.

References: [CBIC Rule 46](https://taxinformation.cbic.gov.in/content-page/explore-rules/1000136/1000001), [Cashfree PG refund API](https://github.com/cashfree/cashfree-pg/blob/main/docs/Refunds.md).
