# AdVibe B0 — Contract governance and API semantics

Canonical contract: contracts/openapi.v1.json (OpenAPI 3.1.2). All operationIds and schema references must be stable and pass tests/backend-contract.test.mjs. This is a design document, not a deployed API.

## Examples

Successful single resource:
  {"data":{"id":"<server-uuid>", "status":"draft"}}
Successful collection:
  {"data":[...], "meta":{"nextCursor":null,"limit":20}}
Safe error:
  {"error":{"code":"INVENTORY_CONFLICT","message":"Capacity is no longer available","requestId":"req_...","details":[{"field":"screenIds","message":"One or more selected screens are no longer available"}]}}
Only server-generated details should be exposed. Never include stack traces, KYC document URLs, authorization tokens or raw payment signatures in error bodies.

## Authorization

Session-authenticated endpoints use server-set HttpOnly Secure session cookies. Unsafe methods require X-CSRF-Token. Public auth/enquiry endpoints use Origin/CSRF strategy, anti-abuse and rate limiting even without an existing cookie.
x-access-roles documents the allowed roles; backend policies additionally check resource ownership and business membership. x-trust-boundary=device means device bearer identity only. x-trust-boundary=webhook means raw payload signature verification and provider-event replay handling (the exact provider header contract is finalized in B14/B18).
Never pass a caller-supplied accountId/driverId as an authorization decision.

## Idempotency, ordering and paginated lists

Mutations marked x-idempotency-required require Idempotency-Key and request hash stored server-side. Identical retry gets the original result; same actor/route/key with a different body yields 409. Webhooks instead deduplicate unique provider event IDs.
Collection endpoints support cursor and limit 1–100, default 20. Stable sort by createdAt/id; cursor opaque. A change to ownership must be revalidated for every page.
Time: UTC instants as date-time, dates as YYYY-MM-DD; contract metadata must not convert a driver's selected India calendar date by applying a browser UTC offset.

## State machines (review with product owner before runtime)

Campaign: draft -> submitted -> under_review -> approved -> scheduled -> live -> completed; changes_requested/rejected/cancelled branches. Admin approval alone cannot make media play and paid alone cannot bypass review.
Creative: pending -> under_review -> approved/rejected. Server scans actual uploaded content before approval.
Driver: draft -> submitted -> under_review -> approved/rejected, conditioned on real evidence. Driver application approval != screen provisioning != bank verification.
Hold: held -> confirmed/released/expired. Holds are not guaranteed when expired during checkout; payment workflow must have explicit recovery/reallocation/refund policy.
Payment: created -> pending -> paid/failed with verified gateway facts, refund flow separate. Driver payout: pending -> processing -> processed/failed, reconciled upon provider confirmation; never mark paid from Admin click.

## Cross-cutting HTTP requirements

Version URI is /api/v1. JSON request and response except explicitly raw provider webhook bodies and signed upload endpoints. Request ID header on every response, no-store on personalized endpoints, bounded payload sizes, credential-safe logs, 400/401/403/404/409/422/429/500 as applicable.
Separate sandbox/staging/production secrets; URL placeholders in the contract are intentionally invalid.
Contract should be updated BEFORE controller code, then pass contract tests, integration tests, schema migration tests and negative authorization tests. Nonbreaking additive changes may stay in v1; breaking schema/semantics require a versioning policy and migration.

Admin booking workbench uses POST /admin/bookings/confirm. An operator may confirm a valid hold only if payment is authoritatively verified, campaign/creative are approved, and the capacity remains available. Admin cannot mark a charge paid or bypass the booking conflict guard.
