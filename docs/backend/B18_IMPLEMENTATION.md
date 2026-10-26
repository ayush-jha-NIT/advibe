# AdVibe B18: reviewed driver earnings, immutable ledgers and verified payouts

B18 implements backend-only payout ledgers and payout-state management. The frontend remains a demo. This is CI + PostgreSQL integration implementation, **not a live Cashfree Payouts bank integration**. D05 (driver earning formula/agreements) and D07 (approved provider and beneficiary onboarding) require product, finance and compliance sign-off before production. No real account numbers, IFSC, UPI IDs, card details or driver KYC are accepted by the B18 routes.

## Boundary between B17 telemetry and driver remuneration

B17 `qualifiedPlaybackCount` measures corroborated *device-reported* evidence only. It is **not proof that a person watched an ad**, nor an earnings trigger. All earning credit must come from a human reviewed driver-service event in B18. A fresh MFA-verified Admin creates a versioned immutable earning policy using POST `/api/v1/admin/earnings/policies` with `{version,paisePerReviewedEvent}`, matching the server configured `B18_EARNING_POLICY_VERSION`. A separate explicit POST `/api/v1/admin/earnings/accrue` with `{sourceProofId,policyId,evidenceReference}` validates the B17 source proof, driver/vehicle ownership, B15 matching scheduled window and B14 paid booking. The Admin attests to having independently reviewed the driver's service record using a named external evidence reference. Only this creates a positive credit in paise. Source proofs cannot be paid twice: PostgreSQL enforces unique source proof ID and immutable ledger entries.

These proof IDs and refs are not independently attested by a physical bank or playback sensor within B18. Production evidence-review SOPs, anti-collusion controls, and audited service-rate policy remain mandatory. Never market the metric as verified human impressions.

## Frozen driver settlements

An MFA Admin uses POST `/api/v1/admin/settlements` `{driverUserId,periodStart,periodEnd}` with a valid Idempotency-Key. Server-side Serializable transaction freezes only previously reviewed, unassigned ledger accruals and a positive exact BIGINT-paisee settlement amount. Each earning can be assigned only once. PostgreSQL rejects editing the amount, driver, period and original evidence; all data retains a review trail. Driver GET `/api/v1/drivers/me/earnings` and `/api/v1/drivers/me/settlements` give their own ledger balance, reserved unsettled gross, payout totals and safely serialized INR paise, without other drivers' information.

## Beneficiaries and payouts

Driver POST `/api/v1/drivers/me/beneficiaries` accepts only an approved payout provider's opaque beneficiary reference. The provider independently returns verified true for the authenticated driver; the backend never accepts an arbitrary user-submitted verification claim. Driver GET `/api/v1/drivers/me/beneficiaries` returns only the final 4 reference characters. The token is server-side only. No full bank details are stored or returned.

An MFA Admin uses POST `/api/v1/admin/payouts` with `{settlementId,beneficiaryId}`, CSRF and Idempotency-Key. The settlement must be READY and the provider-verified beneficiary must belong to that same driver. A unique payout and unique stable `providerReference` are created atomically; the settlement becomes PAYOUT_PENDING. A repeat key returns the same payout. No transfer is automatically considered PAID.

A controlled worker `B18_PAYOUT_WORKER_ENABLED=true npm run payouts:reconcile` rechecks beneficiary verification, calls a provider adapter with the **stable idempotency reference**, then independently GETs the remote transfer. Remote PENDING becomes SUBMITTED. A matching SUCCESS transfer creates a single, immutable payout debit and changes both settlement and payout to PAID atomically. FAILED becomes NEEDS_REVIEW, preserving the financial snapshot for operator investigation. Unavailable or ambiguous provider responses never credit a paid transfer. Re-run after transient failure using the same provider reference; provider-side idempotency support is mandatory.

The POST `/api/v1/webhooks/cashfree/payouts` sandbox-adapter endpoint requires an authenticated raw JSON body, bounded timestamp, MAC signature and **independent provider GET confirmation**. Duplicate events are unique and idempotent. The included MAC is only a test-adapter contract; real provider-specific webhook format and verification must be certified before enabling it with `B18_WEBHOOK_COMPAT_VERIFIED=true` in production.

## Production rollout requirements

Production changes require `B18_EARNING_POLICY_VERSION`, `B18_D05_APPROVED=true`, `B18_D07_APPROVED=true`, and `B18_PAYOUTS_ENABLED=true`. A REAL payout provider integration must be implemented and security-reviewed before removing the fail-closed `configuredPayoutGateway()` default. A deterministic injected test double in PostgreSQL CI is not equivalent to a live Cashfree sandbox transaction. The default payout worker deliberately refuses to connect without an approved gateway. Do not configure `B18_PAYOUTS_ENABLED=true` unless this work is complete.

Validation: PostgreSQL migration, unique proof credit, exact-paise immutable policy/ledger/settlement, cross-role denials, CSRF and MFA, idempotent accrual and payout, provider outage/duplicate transfer handling, simulated pending/success reconciliation, signed webhook replay and B0–B17 regressions. B19 tax, refund and financial provider reconciliation remain separate, as does real-world device/display certification.
