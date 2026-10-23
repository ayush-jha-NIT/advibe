# AdVibe design system (Part 1)

## Source of truth

The 59 client-approved UI references and the exact uploaded **AdVibe Megaphone Brand Logo.png**. Do not substitute a generated or redrawn brand mark.

### Reusable foundations

- brand/BrandLogo: single asset and accessible alternative text
- ui/Button: primary (role accent), orange brand, secondary, outline, ghost, destructive, link; sizes and loading state
- ui/Card: header, title, description, body and footer
- ui/Input, Textarea, Select, Field: labeled responsive inputs and error content
- ui/Badge: semantic statuses, not dependent on color alone
- ui/Tabs: arrow-key navigable list
- ui/Switch: keyboard-operable toggle with accessible state
- ui/Dialog: native focus-managed modal with Escape and close control
- ui/Skeleton: reduced-motion-aware loading placeholder

### Theming contract

Set data-portal="public" | "admin" | "advertiser" | "driver" on the nearest layout wrapper.

- Public primary CTA orange, dark navy branding
- Admin accent purple
- Advertiser and Driver accent electric blue
- Base canvas: #F8FBFF; paper surfaces: #FFFFFF
- Primary text navy #0B1B40; soft borders #DCE6F4
- Status: success green, caution amber, critical red
- Typography: consistent system sans stack modeled on the approved screens; production brand font can be tuned after verified license/assets

### Responsiveness and accessibility

Baseline mobile width 320px, working targets 360px/390px/768px/1024px/1440px. Controls have >=44px defaults; icon-small is >=36px when in dense tables. Keep visible focus rings, semantic HTML, accessible tab and switch state, errors with role=alert, honor prefers-reduced-motion.

### Deliberately excluded from Part 1

Portal shells/routes (Part 2), business demo models (Part 3), marketing page reconstruction (Part 4), production Cashfree backend (later). The root page is an interactive component specimen, not the client-approved public landing page.
