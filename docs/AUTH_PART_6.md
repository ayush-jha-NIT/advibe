# Part 6: Demo Authentication

## Scope

The five auth routes are responsive and functional in one browser: /login, /signup, /verify, /forgot-password, /reset-password. Mobile forms use keyboard-friendly input types, visible errors, 44px controls and password visibility toggles. The single official AdVibe logo is reused in the dedicated two-column authentication layout.

## Important: no security claim

These flows are simulations only. They DO NOT send email/SMS, create backend accounts, verify an identity, enforce authorization, or change passwords. Never submit real personal, government, banking or password data to this demonstration. The UI accepts name, email, phone, business/vehicle and demo passwords, but only role/name/email are retained in **sessionStorage**, with a time-limited pending verification marker. Password values and phone numbers are not persisted. Closing the browser session clears this identity.

Part 3 fictional demo records are separate from the Part 6 session identity and remain browser-local. Signup profiles do not become actual advertiser/driver database records; full account provisioning belongs to the backend.

## Preset demo identities

- Admin: admin@demo.advibe.test
- Advertiser: advertiser@demo.advibe.test
- Driver Partner: driver@demo.advibe.test

Each has a **publicly shown** demo password, \`AdVibe@123\`. Press "Fill demo credentials" on the login page. There is no admin public signup.

## Registration

1. Open /signup?role=advertiser or /signup?role=driver.
2. Complete local validations for name, email, mobile, role-specific field, password strength, password confirmation and acknowledgement.
3. The password/phone are discarded on moving to the next screen; /verify shows **123456**, with 5-minute expiry, five attempts and a 30-second resend cooldown.
4. A successful demo code creates a temporary UI session and redirects to the matching portal.

New signup emails are not added to the preset login accounts, and no real credential exists; subsequent demo login uses the presets.

## Login and role boundaries

/login?role=advertiser, /login?role=driver and /login?role=admin load role-specific demo login. An optional local \`next\` URL is validated against the selected portal prefix to prevent off-site redirects. The three portals are wrapped in client guards: mismatched sessions see a prompt and can explicitly switch to another fictional role. The existing sidebar/account menu now has a functional sign-out control.

**These client guards are not security boundaries.** Anyone can access the supplied fictional demo data; the app has no trusted user identity.

## Password recovery

/forgot-password initiates an openly simulated verification. /verify sets a temporary recovery state; /reset-password checks strong password and confirmation then reports that the demo completed. It deliberately does NOT claim to change real credentials.

## Production integration handoff

Backend engineer must implement real registration, rate-limited OTP, a transactional account database, Argon2 password hashing, expiring one-time reset tokens, session expiry and HttpOnly secure cookies, CSRF protections where appropriate, role-based and object-level API checks, secure audit logging and a trusted Cashfree payment verification boundary. No API keys belong in the frontend.

## Tests

\`tests/demo-auth.test.mjs\` verifies email normalization, role parsing, strong-password checks, OTP expiry, resend cooldown, attempt limits, fixed demo credentials, and local-only safe redirect paths. GitHub CI runs these alongside the existing domain tests.
