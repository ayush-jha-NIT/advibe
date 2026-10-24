# AdVibe Part 13 — Driver Onboarding, first three steps

## Entry and routes

- /driver: existing shared demo dashboard with new onboarding CTA banner.
- /driver/onboarding: responsive wizard with 5-step navigation, active Steps 1–3 and a Part 14 handoff screen after step 3.

## Functional steps

1. **Driver Profile**: fictional display alias, sample operating city, experience and availability, adult self-attestation. Validated before continuing.
2. **Vehicle Details**: bike/auto/car, generic make and model, plausible model year, self/family/leased ownership. No registration plate numbers collected.
3. **KYC readiness preview**: three simulated readiness checkboxes for Driving Licence, Registration Certificate and Insurance. Readiness checks are explicitly **not uploaded documents, official validity assessments or verification**. All three must be marked ready to finish this preview.

On completion the wizard shows a summary and a plan for Step 4 (device screen setup/pairing) and Step 5 (bank/agreement and final submission) to be implemented in Part 14. The user can revisit unlocked steps and reset their demo progress.

## Session privacy and seed integrity

- Data is persisted only to sessionStorage under advibe:driver-onboarding-preview:v1 for the preset demo driver account. All persisted keys are allowlisted; no personal documents, identifiers, license/registration numbers, contact details or financial data are accepted.
- Real files cannot be uploaded. UI labels and safe example placeholders make this explicit.
- The preset fictional driver drv-1 already has an approved vehicle and application in Part 3 sample data. The Part 13 onboarding preview is independent; it **does not downgrade or modify existing driver applications, vehicles, screens, payments or other portal records**.
- A newly signed-up unprovisioned browser identity cannot access the seeded demo driver's record. It receives a prompt to open the preset demo identity.
- Browser-only role checks are for navigation UX, not production access control. Server-side identity and ownership must be implemented before real onboarding.

## Next steps

Part 14 will use the same draft model to add screen install/pairing, simulated bank/agreement review, and a guarded demo application submission. Real KYC, hardware pairing, bank verification, contracts and real payouts are backend-only requirements.

## CI tests

tests/driver-onboarding.test.mjs covers step validation, category/year constraints, mandatory demo readiness, guarded sequential unlocks, reset compatibility and allowlist sanitization. GitHub CI runs ESLint, TypeScript, native Node tests and the Next.js production build. Physical-device visual QA remains in Parts 22–23.
