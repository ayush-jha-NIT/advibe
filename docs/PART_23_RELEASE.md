# AdVibe Part 23: Final Release Engineering and QA

## Delivered, and not delivered

The frontend demo roadmap Parts 0–23 has been implemented in source: Public, Authentication, Advertiser, Driver and Admin. Part 23 introduces a real Chromium smoke suite against a production-built Next.js app, static release checks, a frontend-only health route, opt-in robots/sitemap indexing, and a read-only HTTPS deployment verifier.

**GitHub CI passing does NOT mean the site has been deployed, checked on physical devices, certified WCAG compliant, or integrated with a backend, Cashfree, KYC or vehicle hardware.**

## Automated verification

CI runs lint, TypeScript, all Node tests, Next.js production build, then a separate Chromium job. The browser suite:
- Visits public landing and marketing pages at 320, 375, 768, 1024, 1440 pixel widths.
- Exercises mobile public navigation, Escape and focus return.
- Loads auth routes and completes the advertiser demo login form.
- Visits a representative module set in Advertiser, Driver and Admin at 375 and 1280 pixels.
- Exercises mobile portal navigation and keyboard focus return.
- Tests consistency after a fictional Admin screen-status change appears in the driver-owned screen view.
- Detects uncaught browser JS errors and unexpected page-wide horizontal overflow on narrow viewports.

On failure, the GitHub Actions job can upload screenshots from test-results as part23-browser-failures. These checks are real browser navigation but **not** pixel-perfect matching against the 59 user-approved reference screenshots, comprehensive WCAG validation, or real phone testing.

Node 22 recommended. Reproduce:
~~~bash
npm install
npm run check
npx playwright install chromium
npm run start -- --port 3100
# Separate terminal:
BASE_URL=http://localhost:3100 npm run test:browser
~~~

## Vercel deployment

**Status at preparation:** No AdVibe project was found when searching the two currently connected Vercel accounts. No Vercel URL, READY state, build or real domain has been verified.

To deploy a **demo preview**:
1. In the intended Vercel account/team, import GitHub repository ayush-jha-NIT/advibe; choose main branch and repository root.
2. Select Next.js framework, Node 22, install command npm install and build command npm run build.
3. Configure NEXT_PUBLIC_DEMO_MODE=true, SITE_INDEXING_ENABLED=false and NEXT_PUBLIC_APP_URL as the *actual verified* HTTPS deployment origin.
4. Ensure the main branch has green CI checks; set Deployment Checks or branch protection for production releases.
5. Confirm Vercel deployment READY, correct Git SHA, HTTPS and official domain ownership.
6. Run npm run health:deployment -- https://your-deployment.vercel.app against the actual origin, and manually verify account routes and console.
7. Keep privacy/terms marked pending and search indexing disabled until authorized approval.

The app exposes GET /api/health indicating ONLY frontend availability. It deliberately reports productionIntegrationsReady=false. The HTTPS verifier visits public and auth routes and this endpoint; it cannot certify secure authentication or device/payment infrastructure.

## Manual QA checklist (NOT CLAIMED AS COMPLETED)

| Area | Manual acceptance requirement |
| --- | --- |
| Visual references | Compare all 59 approved screens to actual phone/desktop views and approve differences |
| Devices | iPhone Safari, Android Chrome; 320/375/768/1024/1440 breakpoints and landscape |
| Zoom/accessibility | 200/400% zoom, forced contrast, reduced motion, VoiceOver and NVDA navigation |
| Navigation | Mobile drawer, focus return, portal menus, skip links, back/forward history |
| Advertiser | Six-step campaign wizard, invalid inputs, persistence, discounts and media previews |
| Driver | Five-step onboarding, KYC simulation, device status, payout disclaimers and support |
| Admin | Campaign approval, driver review, booking, tickets and demo reset |
| Shared demo state | Screen/booking/notice changes across role switching within one browser |
| Real deployment | READY state, SHA, HTTPS/domain, health probe and account route loading |
| Legal and production | Final approved legal policy, secure APIs, payments, KYC and hardware integration |

A human/product owner must sign off each of these after real-device testing. CI does not substitute for this.

## Indexing

SITE_INDEXING_ENABLED defaults to false; robots.txt blocks crawlers until explicitly enabled. sitemap.xml includes public HTTPS routes only if enabled and NEXT_PUBLIC_APP_URL has a valid HTTPS origin. Do not enable for the unapproved legal/demo site.

## Release decision

- Frontend demo implementation: delivered in GitHub and subject to final green CI.
- Production service: NOT READY, see PRODUCTION_READINESS.md.
- Vercel live release: UNVERIFIED until intended project and URL are provided.
- Physical-device and reference screenshot QA: PENDING human sign-off.
