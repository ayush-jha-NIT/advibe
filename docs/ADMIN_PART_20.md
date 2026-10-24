# Part 20 — Admin pricing, bookings and finance

Implemented /admin/pricing, /admin/ad-formats, /admin/bookings, /admin/payments, and /admin/settlements. All financial entries are **fictional browser-local data**.

Rate-card editing checks safe integer rupees, valid date ranges and conflicting active rates for the same city/placement; changing a rate does not retroactively reprice a recorded quote or a paid invoice. Ad format cards list seeded screen counts and sample prices, not certified installation specifications.

Admin booking confirmation validates campaign approved + demo-paid states, advertiser-owned approved creative, eligible non-conflicting verified screen inventory and dates via the shared booking guard. Only then are a confirmed sample booking, fictional schedule status, local audit record and owner notices created. No real inventory reservation or advertiser charge occurs. 

Payments and refunds are view-only; no Cashfree transaction or refund can be generated here. Settlement statuses can move only from pending to processed/failed as explicit **fictional statuses**, with audit and driver notice. This never initiates an actual transfer. See tests/admin-part20.test.mjs.
