# AdVibe Part 14 — Complete Driver Onboarding

Part 14 completes the UI started in Part 13. It is a **browser-only demonstration**, not KYC, real hardware installation, contract signing or a payout service.

## Paths

- /driver/onboarding is a five-step, validated, mobile-responsive wizard followed by a review and submit summary.
- /driver/verification shows the submitted fictional request separately from the preset driver's existing approved application and vehicle.
- /driver links to the full onboarding flow.

## Step 4: Screen Setup

Choose a sample screen placement compatible with bike (rear), auto (rear or side), or car (rear or interior). A placement checklist and example electrical/road-safety acknowledgment are mandatory to advance. There is no device serial number, pairing token, Bluetooth connection, installer certification, geo-location or actual device control. All pair states remain **unpaired**.

## Step 5: Agreement and Payout Readiness

Choose an example payout cadence (weekly/monthly). Three independent consent/acknowledgment checkboxes cover future bank verification, illustrative agreement information and fictional demo review submission. There is NO form field for a bank account, IFSC, UPI ID, card, GST/PAN/Aadhaar, OTP or signature. No legal contract or payment authorization is created.

## Final submission

- Runs validation across Steps 1–5 and blocks duplicate demo review requests from the same preset driver.
- Creates one driverPreviewApplications entry in the shared browser-local store with only a pseudonym, example city, generic vehicle/model, selected demo placement, payout cadence, reference ID and timestamp.
- Creates an audit event and account-owned demo notifications for the driver and Admin.
- Does NOT mutate driverApplications, vehicles, screens, settlements or bank/payment data. In particular, the existing approved seed for drv-1 / veh-1 stays approved.
- Uses the same preset demo driver's browser session; unprovisioned signup identities cannot submit demo requests. All role gates remain frontend preview controls, not real security.

## Refresh behavior

- Non-sensitive wizard progress lives in sessionStorage and restores upon refresh within the same session.
- Shared submitted preview requests live in the Part 3 browser-local Zustand demo database and are visible in the separate verification route.
- Older saved Part 13 progress safely receives default values for the new optional demo fields, without assuming prior agreement.
- Resetting a wizard draft does not remove submitted requests or existing seeded approvals.

## Tests

tests/driver-onboarding-final.test.mjs adds checks for placement compatibility, consent, stage gating, duplicate-submission model validation, session-draft allowlisting and legacy draft migration. GitHub Actions checks ESLint, TypeScript, Node domain tests and Next.js production build.

## Production requirements

Real driver accounts and age/license validation, secure KYC document upload and verification, vehicle ownership checks, licensed device installation and telemetry, compliant partnership agreements, verified bank/UPI setup, server-side approval policies, role-based data access, auditing, and live payout providers remain unimplemented.
