# Part 18: Admin dashboard and campaign approvals

Implemented routes: /admin, /admin/campaigns, /admin/approvals. All use the shared fictional demo database and preset Admin browser-session identity. KPI cards count real seeded demo rows; no real platform operations occur.

The Admin campaign directory filters by status, advertiser and title. A submitted campaign may transition to under_review, then approved/changes_requested/rejected, using the pre-existing lifecycle guard. Approval requires an existing advertiser-owned approved creative metadata record; it never approves uploaded files. New creative metadata review action accepts pending/under_review only, updates the demo approval flag, logs an audit event and notifies the advertiser in the same browser.

Approvals do not process payments, create screen reservations, send messages, or transmit media to hardware. Do not confuse the frontend demo Admin role with actual secure authorization. CI checks ESLint, TypeScript, tests and build.
