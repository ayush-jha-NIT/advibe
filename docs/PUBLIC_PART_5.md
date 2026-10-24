# Part 5 — Public Website

## Implemented pages

/for-advertisers, /for-drivers, /ad-formats, /locations, /pricing, /about, /contact, /help-center. The official logo and public shell remain unchanged. Marketing hero, feature grids, format imagery, campaign steps and FAQs use shared components in src/components/public.

## Working UI interactions

- Ad-format catalogue: filter by vehicle, select a format, show specifications and compare all formats. The price estimator retains auto side and car rear selections.
- Location explorer: select city, change City/Area/Route/Landmark search mode, filter text, switch map/list and inspect demo zones. Illustrative map only, not live GPS or inventory.
- Pricing estimator: vary screen quantity, days, creative length and daily plays; display a transparent hypothetical daily rate, subtotal and 18% illustrative GST. Only Prayagraj examples are priced; other cities show no confirmed rate.
- Public support: FAQ accordions and search/category filters, topic resources linking to implemented pages.
- Contact: native form validation, 10-digit phone entry, 500-character message limit, composition using visitor's email client. No enquiry goes to a backend, and the reference support email needs operational verification.
- Driver: bike/auto/car selection and conditional specs. No fabricated reviews or guaranteed driver earnings.

## Explicit limitations

Public-page locations, marketing capability descriptions and costs are demonstrations, not operational claims. Screenshots include headline statistics and phone/address samples that were not externally verified, so these are not represented as actual metrics or offices.

Terms and Privacy now show clearly marked non-final notices. Approved legal policy, terms and verified contact details are still required before production launch. Real signup, account security, Cashfree payments, inventory, device telemetry and backend support remain separate future phases.

## Verification

GitHub CI: ESLint, TypeScript, domain tests, Next.js build. Mobile breakpoint and actual-device visual QA remain pending; no physical handset/browser screenshot comparisons were performed in this phase.
