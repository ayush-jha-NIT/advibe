# AdVibe Backend B0 — PostgreSQL/Prisma schema blueprint

This is a RELATIONAL DESIGN, not a deployed migration or final Prisma schema. B2 will pin a Prisma release, implement migrations, Postgres DDL constraints and real seed data. Do not apply fictional demo records to production.

## Global conventions

All primary keys: opaque UUID (or documented ULID), no browser role-derived IDs.
All rows: createdAt timestamptz NOT NULL, updatedAt where mutable; deletedAt only where justified. Unique normalised email/contact identifiers; unique provider reference/event IDs. UTC timestamps; preserve customer-selected calendar dates and Asia/Kolkata business timezone as explicit configuration.
Amounts: BIGINT integer paise, currency char(3) INR; no floats. Tax: versioned percentage/rate snapshots. Monetary ledgers append-only with adjustments/reversals, not silent updates.
Business ownership: foreign key + explicit tenant/business membership scope, enforce with application authorization and optionally PostgreSQL RLS as defense in depth (not a substitute for application tests). Identity and KYC references must not be exposed by generic list queries.

## Core tables by module

Identity: users(id,email_normalized unique,password_hash,verified_at,account_status), user_roles(user_id,role,business_id nullable), sessions(id,user_id,token_hash,expires_at,revoked_at,device_info), otp_challenges(id,principal,purpose,token_hash,attempts,expires_at,consumed_at), admin_mfa_credentials(user_id,encrypted_secret,enabled_at), password_resets(id,user_id,token_hash,expires_at,consumed_at).
Business: advertiser_businesses(id,legal_name,display_name,city,verification_status), business_memberships(id,business_id,user_id,role); enquiries(id,contact_method,body,consent_at,status).
Driver: driver_profiles(user_id,operating_city,status), driver_applications(id,driver_id,state,completed_step,submitted_at), driver_application_reviews(id,application_id,admin_id,decision,note), driver_documents(id,application_id,kind,private_blob_id,review_status,expiry_date), vehicles(id,driver_id,registration_ciphertext,registration_last4,category,model,year,approval_status), agreements(id,driver_id,template_version,consented_at,accepted_ip_hash), installation_inspections(id,vehicle_id,screen_id,inspector_id,state).
Location/network: cities(id,slug unique,time_zone), zones(id,city_id,name,geometry or center), locations(id,zone_id,name,lat,lng), screens(id,vehicle_id,location_id,placement,capability,status,installed_at), device_credentials(id,screen_id,public_key,revoked_at,paired_at), device_heartbeats(id,screen_id,observed_at,ingested_at,firmware,health), device_pairing_challenges(id,screen_id,nonce_hash,expires_at,consumed_at), player_manifest_versions(id,screen_id,version,published_at,signature).
Creative/ads: media_assets(id,owner_business_id,private_object_key,mime,size_bytes,sha256,scan_status,transcode_status), creatives(id,owner_business_id,media_asset_id,placement,title,moderation_state), creative_reviews(id,creative_id,admin_id,decision,reasons), campaigns(id,owner_business_id,creative_id,title,state,start_date,end_date,weekdays,time_windows), campaign_reviews(id,campaign_id,reviewer_id,state,reason).
Commercial: pricing_rules(id,city_id,placement,valid_from,valid_to,rate_paise_per_unit,active,version), quotes(id,campaign_id,version,expires_at,subtotal_paise,discount_paise,tax_paise,total_paise,tax_policy_version), quote_lines(id,quote_id,screen_id,units,rate_paise,total_paise), reservation_holds(id,campaign_id,expires_at,status,idempotency_key), allocations(id,screen_id,campaign_id,date_from,date_to,slot_id nullable,status), bookings(id,campaign_id,allocation_id,state,confirmed_at).
Payments: payment_orders(id,quote_id,provider,provider_order_id unique,amount_paise,state,idempotency_hash), payment_attempts(id,order_id,provider_payment_id unique,state), payment_webhook_events(id,provider_event_id unique,body_digest,received_at,verified_at,processing_state), refunds(id,order_id,amount_paise,reason,state,provider_ref unique nullable), invoice_documents(id,business_id,order_id,private_blob_id,tax_snapshot).
Delivery: scheduled_playlists(id,screen_id,campaign_id,start_at,end_at,version), playback_events(id,screen_id,playlist_version,creative_id,device_event_id,started_at,ended_at,signature_verified), trips(id,driver_id,vehicle_id,consent_scope,start_at,end_at), gps_points(id,trip_id,location,timestamp,accuracy_m), exposure_aggregates(id,campaign_id,zone_id,period,verified_count,method_version).
Driver finance: earning_rules(id,version,effective_from,conditions), driver_ledger_entries(id,driver_id,campaign_id,source_event_id,amount_paise,kind,created_at), settlements(id,driver_id,period_start,period_end,gross_paise,deduction_paise,net_paise,state), payout_beneficiaries(id,driver_id,provider_token,verification_state), payouts(id,settlement_id,beneficiary_id,provider_ref unique,state), payout_webhook_events(id,provider_event_id unique,verified_at,state).
Operations: tickets(id,requester_user_id,screen_id nullable,subject,description,status,category), ticket_events(id,ticket_id,actor_id,type,created_at), notifications(id,recipient_user_id,kind,body,read_at), notification_deliveries(id,notification_id,channel,state), audit_events(id,actor_id,action,resource_type,resource_id,request_id,occurred_at,payload_hash), idempotency_records(id,principal_id,route,key,request_hash,status,response_ref,expires_at), outbox_events(id,aggregate,aggregate_id,event_type,payload,created_at,processed_at).

## Invariants and constraints

1. FK ownership: campaign creative must be owned by the same business; booking allocation references an approved/authorized campaign. Driver screens must belong to the corresponding driver-owned vehicle and approved installation.
2. Review decisions are append-only. Final driver/creative approvals depend on independently verified evidence; no client boolean means KYC success.
3. Media and KYC objects remain private; object keys are server-only. Document upload-intent may produce time-limited signed URL; never distribute object keys directly.
4. Price: exact amount snapshot locked to a quote version at checkout; pricing rule edits cannot change an already authorized order. Reject unsafe monetary ranges; notional tax percentage remains provisional pending professional sign-off.
5. Date arithmetic: reserve exclusive screen-time capacity atomically. For initial exclusive full-screen strategy use PostgreSQL daterange and GiST exclusion (btree_gist) on screen_id and overlapping ranges for committed allocations. Prisma may require hand-written SQL migrations for exclusion constraints and additional constraints. If screen slots/rotations are chosen, replace screen_id-only exclusion with an approved capacity slot model.
6. Pending holds have TTL but a partial exclusion index cannot depend on a moving now() predicate. Under a transaction lock screen/capacity rows in consistent order, delete/expire stale holds and reject overlaps with live holds/confirmed allocations. Use DB isolation strategy + retry with bounded jitter, and a unique idempotency key per actor/route. Redis locks alone do NOT ensure correctness.
7. Payment webhook IDs, device event IDs and payout webhook IDs must have UNIQUE constraints. Record raw event digest/metadata safely, verify authenticity, enqueue processing transactionally; acknowledged/retried events are idempotent.
8. Device status derives from recent authenticated heartbeats; never trust arbitrary caller-supplied online=true.
9. Financial state: each earning has unique attributable evidence; settlement financial rows cannot mutate after reconciliation except via compensating entries. Only verified transfer webhooks or provider reconciliation may mark actually paid.
10. Retention: separate KYC document TTL/erasure, trip/GPS retention, payment financial retention and audit log requirements; legal/product owners must sign off before B7, B17 and B19. No indiscriminate indefinite retention.

## Example migration / concurrency design (NOT executable B0 DDL)

Use PostgreSQL btree_gist and a check on start <= end; exclusion idea:
  EXCLUDE USING gist (screen_id WITH =, daterange(date_from, date_to, '[]') WITH &&)
  WHERE (status = 'confirmed')
This applies ONLY if the operator chooses exclusive whole-screen capacity, and does not resolve temporary holds automatically. It is guidance for B13's reviewed SQL migration, NOT a replacement for transaction tests.

## Migration and operations order

B2: users/businesses plus session/OTP and audit outbox; Neon pooled runtime URL and direct migration URL separate; migrations and least-privilege role, backup/restore test.
B6–B9: driver/screen/location tables, private document references.
B10–B14: creative/quote/campaign/reservation/booking/orders/webhooks with transaction tests.
B15–B19: manifests/playback/telemetry/earning ledger and payout reconciliations.
B20–B21: tickets/notifications/admin reporting + audit hardening.
All schema changes reviewed with forward/backward migration plans. Apply staging first. Zero real financial/PPI fields in demo seeds. Do not destructively reset production data.
