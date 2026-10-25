# AdVibe B0 — Frontend to production API migration matrix

Status: B0 mapping only. No data-fetching or authentication code was replaced yet. The currently deployed demo continues to use browser-local records. Routes listed here are the existing frontend URLs; the API paths are relative to /api/v1.

| Portal | Frontend route | Backend API(s) / provider | Target phase | Integration rule |
| --- | --- | --- | --- | --- |
| Public website | / | GET /public/locations; GET /public/formats | B9 | Marketing remains static until reviewed provider data |
| Public website | /for-advertisers | GET /public/formats; GET /public/locations | B9 | No binding inventory promise |
| Public website | /for-drivers | POST /auth/register; GET /public/locations | B3/B9 | No earnings guarantee |
| Public website | /ad-formats | GET /public/formats | B9 | Public format catalog |
| Public website | /locations | GET /public/locations | B9 | Publishable areas only |
| Public website | /pricing | POST /pricing/quotes | B11 | Binding quote requires signed-in advertiser; public calculator stays illustrative |
| Public website | /about | Static content | none | No backend required |
| Public website | /contact | POST /enquiries | B5 | Captcha, spam/rate limits and consent |
| Public website | /help-center | Static content; GET /tickets for authenticated support | B20 | FAQs remain public |
| Public website | /privacy | Approved legal CMS content | legal | No fabricated policy |
| Public website | /terms | Approved legal CMS content | legal | No fabricated terms |
| Authentication | /login | POST /auth/login; GET /auth/session; POST /auth/mfa/challenge; POST /auth/mfa/verify | B3/B4 | Replace hardcoded demo password; session cookies |
| Authentication | /signup | POST /auth/register | B3 | Admin role not self-selectable |
| Authentication | /verify | POST /auth/verify | B3 | One-time challenge server-side |
| Authentication | /forgot-password | POST /auth/forgot-password | B3 | Non-enumerating email response |
| Authentication | /reset-password | POST /auth/reset-password | B3 | Single-use short-lived token |
| Advertiser | /advertiser | GET /campaigns; GET /reports/advertiser; GET /notifications | B12/B17/B20 | Verified data only |
| Advertiser | /advertiser/create-campaign | POST /campaigns; PATCH /campaigns/{campaignId}; POST /creatives/upload-intents; POST /pricing/quotes; POST /reservations/holds; POST /payments/orders | B10–B14 | Six-step wizard; no client-authoritative amounts |
| Advertiser | /advertiser/campaigns | GET /campaigns; POST /campaigns/{campaignId}/submit | B12 | Paginated owner scope |
| Advertiser | /advertiser/campaigns/[id] | GET /campaigns/{campaignId}; GET /campaigns/{campaignId}/bookings; GET /payments | B12–B14 | Authorized campaign detail |
| Advertiser | /advertiser/ad-formats | GET /public/formats; GET /pricing/rules (Admin only) | B9/B11 | Use quote endpoint for live price; never expose Admin pricing route |
| Advertiser | /advertiser/locations | GET /locations; GET /screens | B8/B9 | Masked capacities, not device credential details |
| Advertiser | /advertiser/creatives | GET /creatives; POST /creatives; GET /creatives/{creativeId}; POST /creatives/upload-intents | B10 | Signed upload/private moderation |
| Advertiser | /advertiser/billing | GET /payments; GET /payments/orders/{orderId} | B14/B19 | Provider status only |
| Advertiser | /advertiser/reports | GET /reports/advertiser | B17 | Playback-based reporting |
| Advertiser | /advertiser/notifications | GET /notifications; POST /notifications/{notificationId}/read | B20 | Owner scoped |
| Advertiser | /advertiser/support | GET /tickets; POST /tickets | B20 | Real ticket service |
| Advertiser | /advertiser/settings | GET /me; PATCH /me; GET /businesses/me; PATCH /businesses/me | B5 | Role checked |
| Driver | /driver | GET /driver/assignments; GET /drivers/me/earnings; GET /notifications | B15/B18/B20 | No simulated earnings |
| Driver | /driver/onboarding | POST /drivers/applications; PATCH /drivers/applications/{applicationId}; POST /drivers/applications/{applicationId}/submit; POST /drivers/documents/upload-intents | B6/B7 | Persistent five steps and private documents |
| Driver | /driver/verification | GET /drivers/applications | B6/B7 | Review status distinct from KYC evidence |
| Driver | /driver/vehicle | GET /drivers/me/vehicles; GET /screens | B6/B8 | Read-only real device state |
| Driver | /driver/assigned-ads | GET /driver/assignments | B15 | Verified confirmed bookings |
| Driver | /driver/campaigns | GET /driver/assignments | B15 | Own-screen campaigns |
| Driver | /driver/earnings | GET /drivers/me/earnings | B18 | Earned entries only |
| Driver | /driver/payouts | GET /drivers/me/settlements | B18 | Provider reconciliation |
| Driver | /driver/delivery | GET /driver/assignments; GET /reports/driver | B16/B17 | Signed playback evidence |
| Driver | /driver/trips | GET /reports/driver | B17 | Consent-led GPS only |
| Driver | /driver/maintenance | GET /tickets; POST /tickets; GET /screens | B20 | Owned screen authorization |
| Driver | /driver/notifications | GET /notifications; POST /notifications/{notificationId}/read | B20 | Driver scope |
| Driver | /driver/support | GET /tickets; POST /tickets | B20 | Driver scope |
| Driver | /driver/profile | GET /me; PATCH /me; GET /drivers/me | B5/B6 | No public KYC |
| Admin | /admin | GET /admin/reports; GET /admin/driver-applications; GET /admin/audit-events | B7/B21 | Restricted dashboard |
| Admin | /admin/campaigns | GET /campaigns; POST /admin/campaigns/{campaignId}/decision | B12 | Audit review |
| Admin | /admin/advertisers | GET /admin/accounts; GET /campaigns | B21 | Admin-only list |
| Admin | /admin/drivers | GET /admin/driver-applications; POST /admin/driver-applications/{applicationId}/decision | B7 | Evidence-backed review |
| Admin | /admin/screens | GET /screens; PATCH /admin/screens/{screenId}/desired-state | B8/B16 | Desired state not heartbeat |
| Admin | /admin/locations | GET /admin/locations | B9 | City and zone inventory |
| Admin | /admin/ad-formats | GET /public/formats; GET /pricing/rules | B9/B11 | Moderation policies and approved rates |
| Admin | /admin/pricing | GET /pricing/rules; PUT /admin/pricing/rules/{ruleId} | B11 | Versioned rate edits |
| Admin | /admin/approvals | POST /admin/campaigns/{campaignId}/decision; POST /admin/creatives/{creativeId}/decision | B10/B12 | Review audit |
| Admin | /admin/bookings | GET /campaigns/{campaignId}/bookings; POST /reservations/holds/{holdId}/confirm | B13/B14 | Server atomic capacity |
| Admin | /admin/payments | GET /payments; POST /admin/refunds | B14/B19 | Gateway verified refunds |
| Admin | /admin/settlements | GET /admin/settlements; POST /admin/payouts | B18 | Payout verification and reconciliation |
| Admin | /admin/analytics | GET /admin/reports | B21 | Verified aggregation |
| Admin | /admin/users | GET /admin/accounts; PATCH /admin/accounts/{accountId} | B21 | No frontend-supplied admin role |
| Admin | /admin/audit | GET /admin/audit-events | B21 | Append-only audit |
| Admin | /admin/notifications | GET /notifications; POST /notifications/{notificationId}/read | B20 | Admin scope |
| Admin | /admin/support | GET /tickets; PATCH /admin/tickets/{ticketId} | B20 | Ticket lifecycle |
| Admin | /admin/settings | GET /auth/session; GET /me | B3/B5 | Backend settings/secret management restricted |

## Rollout contracts

1. The frontend route URL does not change. Introduce a typed API adapter per module. Demo mode remains explicitly isolated from API mode; do not silently fall back to fictional data in production.
2. Each request sends/receives the versioned contract shape and accepts server-owned IDs. Use a controlled same-site API origin/proxy for secure cookies; CSRF, 401/403 handling and error states are mandatory.
3. Auth goes first (B3/B4), then accounts; never migrate KYC, payments, uploads or driver ledger onto unauthenticated client requests.
4. Every portal list must support loading, no results, validation error, forbidden, expired session, retry and pagination states. B22 E2E covers cross-account isolation and role switches.
5. For media upload, a signed intent permits an isolated object transfer. Database metadata is only marked ready after server-side MIME/decode/scan/transcode verification, never browser preview alone.
6. Targeting a screen does not reserve it. A server quote, capacity hold, verified payment and Admin-approved campaign are separate states. Display statuses come from authenticated heartbeat evidence, not manual green indicators.
7. Financial UI displays only provider-verified statuses, and trips/exposure require consent and signed device events. If live data is unavailable show explicit unavailable/empty state rather than seeded numbers.
8. Public marketing/legal pages require approved content ownership. Public /pricing estimator is illustrative until the authenticated quote engine is available.

## Intentional API gaps to resolve in later phases

B6 driver update uses the preliminary DriverStepInput and must be refined into discriminated per-step schemas, including real evidence requirements. B7 Admin review enforces licensed provider and manual attestations. B9 location CRUD and B16 playback controls require hardware/operation policy sign-off. B17 GPS transport validation and retention need the approved privacy policy. B19 tax/invoice/refund implementation requires legal sign-off. B20 notification preferences and B21 staff roles require their own versioned expansions. Every expansion must update contracts/openapi.v1.json before implementation.
