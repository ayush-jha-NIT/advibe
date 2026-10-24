# Part 4: AdVibe landing page

## Reference and animation
Approved Public Website homepage screenshot plus master-prompt headline: Your Brand. Their Journey. Everywhere.
The 9.6-second CSS loop stages skyline/parallax, arriving bike and car ad screens, glowing campaign displays and connected-location pins. No heavy 3D, third-party media request, or audio.

## Sections
Hero; capability strip; advertiser and driver goal cards; four distinct vehicle-ad-format previews; four campaign stages; interactive city selector; final CTA. The existing header, dropdowns, mobile drawer and footer remain in place.

## Assets and accuracy
The official client-supplied AdVibe logo remains unchanged. The photographic screenshot did not provide isolated image assets. The artwork uses bespoke CSS/SVG vector visuals rather than putting screenshots into the page. Exact photographic matching requires separately supplied approved media.
Metrics from the screenshots such as claimed commuter counts and deployed screens are not verified; the implemented homepage describes capabilities instead of presenting those counts as operational facts.
Cities in the interactive map are clearly described as conceptual planning examples, not live coverage, bookings or GPS locations.

## Routes and integrations
Start Advertising links to /signup?role=advertiser; Become a Driver Partner links to /signup?role=driver. Part 6 signup remains a placeholder and must implement role preselection. The format cards lead to /ad-formats, which belongs to Part 5. City-specific calls to action lead to /locations?city=...; locations is also a Part 5 placeholder.
No Cashfree payment requests, device controls, or account creation occur from the landing page.

## Responsiveness and accessibility
Mobile-first stacked headline/CTA layout, SVG scene below content, 44px-plus tap targets, accessible map city selection with aria-pressed, semantic landmarks and route links. Entire animated scene is decorative. prefers-reduced-motion switches to a static final representation.

## Verification
GitHub CI runs ESLint, TypeScript, demo-domain tests and a production build. Visual checks at 320, 360, 390, 768, 1024 and 1440px, plus physical-device and screen-reader QA, remain outstanding.
