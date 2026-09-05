# LorryCarry Design System

> **Visual Source of Truth**: [`apps/web/tailwind.config.js`](../apps/web/tailwind.config.js),
> [`apps/web/src/app/globals.css`](../apps/web/src/app/globals.css), and the live app
> (`apps/web` on `http://localhost:3010`). If this document disagrees with those files, the code wins.
>
> This document defines the colour tokens, typography, radii, shadows, glass treatment and component
> behaviour used across the LorryCarry web dashboards and admin console.

---

## 1. Executive Summary & Design Philosophy

LorryCarry is a **dual-theme system**. Light is the default (premium logistics SaaS: `canvas = slate-50`,
white panels, slate ink), and the dark **"Kinetic Command"** aesthetic is an opt-in theme applied by
adding the `.dark` class to `<html>` (see `ThemeProvider` / `theme.ts`), preserving the original deep
navy control-tower identity:

- **Every surface/text/border colour resolves through a CSS custom property**, so the same component
  markup renders correctly in both themes. Channel values are stored space-separated (`"15 23 42"`) so
  Tailwind can apply opacity modifiers (`bg-panel/80`).
- **Theme-invariant brand accent**: LorryCarry Orange (`#F97316`).
- **Semantic tokens preferred in new code** — `bg-canvas`, `bg-panel`, `bg-sunken`, `bg-overlay`,
  `text-ink`, `text-body`, `text-muted`, `text-subtle`, `border-hairline` — while the legacy
  `surface-*` scale is remapped onto the same variables by *role* so existing markup inverts correctly.
- **Kinetic telemetry**: monospace numeric/telemetry typography for weights, rates (₹/ton-km),
  timestamps and registration numbers.

Theme application is **class-based** (`darkMode: 'class'`) and applied before first paint to avoid a
flash; `color-scheme: light|dark` is set in each theme block so scrollbars and form controls follow.

---

## 2. Colour Tokens

### 2.1 Primary palette — LorryCarry Orange (theme-invariant)

| Token | Hex Code | Primary Usage |
| :--- | :--- | :--- |
| `primary-50` | `#FFF7ED` | Light tinted highlights |
| `primary-100` | `#FFEDD5` | CTA subtext / banner copy |
| `primary-200` | `#FED7AA` | Highlight selection text |
| `primary-300` | `#FDBA74` | Secondary orange accents |
| `primary-400` | `#FB923C` | Monospace rate labels, icons |
| `primary-500` | `#F97316` | **Brand colour**, primary CTAs, active indicators |
| `primary-600` | `#EA580C` | Gradient endpoints, hover states |
| `primary-700` | `#C2410C` | Active button press states |
| `primary-800` | `#9A3412` | Deep container backgrounds |
| `primary-900` | `#7C2D12` | Deep orange borders |
| `primary-950` | `#431407` | Darkest orange backdrop |

### 2.2 Semantic surface & text tokens (CSS custom properties)

Defined in `globals.css` as RGB channel triples and consumed through Tailwind utilities.

| Token | Tailwind utilities | Light value | Dark value (`.dark`) |
| :--- | :--- | :--- | :--- |
| `--lc-canvas` | `bg-canvas` | `248 250 252` · `#F8FAFC` (slate-50) | `7 10 17` · `#070A11` |
| `--lc-panel` | `bg-panel` | `255 255 255` · `#FFFFFF` | `15 19 29` · `#0F131D` |
| `--lc-sunken` | `bg-sunken` | `241 245 249` · `#F1F5F9` (slate-100) | `2 6 23` · `#020617` (slate-950) |
| `--lc-overlay` | `bg-overlay` | `255 255 255` | `15 23 42` · `#0F172A` (slate-900) |
| `--lc-elevated` | `bg-elevated` | `255 255 255` | `15 19 29` |
| `--lc-ink` | `text-ink` | `15 23 42` · `#0F172A` (headings) | `255 255 255` |
| `--lc-body` | `text-body` | `51 65 85` · `#334155` (slate-700) | `226 232 240` · `#E2E8F0` (slate-200) |
| `--lc-muted` | `text-muted` | `71 85 105` · `#475569` (slate-600) | `148 163 184` · `#94A3B8` (slate-400) |
| `--lc-subtle` | `text-subtle` | `100 116 139` · `#64748B` (slate-500) | `100 116 139` |
| `--lc-hairline` | `border-hairline`, `border-white` (remap) | `15 23 42` @ low alpha | `255 255 255` @ low alpha |
| `--lc-wash` | `bg-wash` / `bg-white` (remap) | `15 23 42` @ low alpha | `255 255 255` @ low alpha |
| `--lc-glass` / alpha | `.glass`, `.glass-strong` | `255 255 255` / 0.72 / 0.85 | `15 23 42` / 0.72 / 0.85 |
| `--lc-brand` | `text-brand` / `bg-brand` | `249 115 22` | `249 115 22` |
| `--lc-ring` | `focus-visible` outline | `249 115 22` | `249 115 22` |

### 2.3 Legacy `surface-*` scale — role-based remap

`surface-*` fill and text utilities map onto the semantic variables by **role**, not lightness, so
legacy call sites (e.g. `bg-surface-900`, `text-surface-400`) stay legible in both themes:

- **Fills** (`bg-surface-*`): `50–200` → `sunken`; `300–600` → `muted/subtle` washes; `700–800` →
  `sunken`; `900` → `panel`; `950` → `sunken`.
- **Text** (`text-surface-*`): `50–200` → `body`; `300` → `muted`; `400` → `muted`; `500` → `subtle`;
  `600` → `muted`; `700` → `body`; `800–950` → `ink`.
- `border-white/N` and `bg-white/N` in legacy markup are remapped to the theme hairline/wash variables
  so hover states and borders render correctly in light mode.

### 2.4 Semantic accent palettes

Defined in the Tailwind config (`success`, `danger`, `warning`, `info`) plus product tokens:

| Scale | 50 | 100 | 400 | 500 | 600 | 700 | 950 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `success` (emerald) | `#F0FDF4` | `#DCFCE7` | `#4ADE80` | `#22C55E` | `#16A34A` | `#15803D` | `#052E16` |
| `danger` (red) | `#FEF2F2` | `#FEE2E2` | `#F87171` | `#EF4444` | `#DC2626` | `#B91C1C` | `#450A0A` |
| `warning` (amber) | `#FFFBEB` | `#FEF3C7` | `#FBBF24` | `#F59E0B` | `#D97706` | `#B45309` | `#451A03` |
| `info` (blue) | `#EFF6FF` | `#DBEAFE` | `#60A5FA` | `#3B82F6` | `#2563EB` | `#1D4ED8` | `#172554` |

Product tokens: `whatsapp: #25D366`, `verified: #16A34A`, `urgency: #DC2626`,
`background.light: #F8FAFC` / `background.dark: #070A11`, `text.light: #0F172A` / `text.dark: #F1F5F9`.

---

## 3. Gradients & Lighting Effects

- **Primary CTA gradient**: `bg-gradient-to-r from-primary-500 to-primary-600` with
  `hover:from-primary-600 hover:to-primary-700` and `active:from-primary-700 active:to-primary-800`
  (the `.btn-primary` class in `globals.css`).
- **Headline text gradient utility**: `.text-gradient` =
  `bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-primary-600`.
- **Progress/telemetry fills** use accent gradients such as `from-orange-500 to-emerald-500`.
- **AI assistant treatment** (drawer, action-center cards) blends the orange brand with purple accent
  fills, e.g. `bg-gradient-to-r from-primary-950/60 via-purple-950/40 to-surface-950` chip surfaces and
  purple border accents (`border-purple-500/40`).

---

## 4. Typography

### Font families (Tailwind `fontFamily`)

- **Sans / display**: `var(--font-inter)` → `Plus Jakarta Sans` (loaded via `next/font`), then
  `Noto Sans Tamil`, `Noto Sans Devanagari`, `Inter`, `system-ui`, `sans-serif`.
- **Mono**: `var(--font-geist-mono)` → `JetBrains Mono` (loaded via `next/font`), then
  `Geist Mono`, `Fira Code`, `ui-monospace`, `monospace`.
- Language packs (`en`, `ta`, `hi`) are applied to `<html lang>` before first paint; Tamil additionally
  triggers a small global font-size/line-height scale (`html.lang-scale-ta` ≈ 106.5%) for glyph legibility.
- Layout chrome is written with logical properties (`ms-*`, `ps-*`, `start-*`, `dir="rtl"`-ready).

### Scale & tracking

- **Display**: `text-4xl sm:text-6xl font-black tracking-tight leading-[1.08]` (hero headlines).
- **Titles**: `text-3xl sm:text-4xl font-extrabold tracking-tight` (section headers).
- **Page headers**: `text-xl sm:text-2xl font-black tracking-tight`.
- **Card titles**: `text-sm sm:text-base font-bold`.
- **Body**: `text-xs sm:text-sm text-body leading-relaxed`; smallest text step is `text-2xs`
  (`0.625rem` / `10px`), used for labels and eyebrow copy.
- **Telemetry labels**: `text-[10px] font-mono font-bold uppercase tracking-widest text-muted`.

### Monospace telemetry policy

Operational values use `font-mono`: registration numbers, rates & benchmark prices (₹/ton-km),
weights & tonnage, timestamps/durations, and passcode/document identifiers.

---

## 5. Spacing System & Layout Containers

Component utilities defined in `globals.css`:

- `.page-container`: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.
- `.section`: `py-12 sm:py-16 lg:py-20`.
- Form/detail pages commonly use `max-w-5xl mx-auto` or `max-w-4xl mx-auto`.
- Extra spacing steps: `4.5` (1.125rem), `18` (4.5rem), `88` (22rem), `128` (32rem); max-width `8xl` (88rem).

---

## 6. Border Radius Tokens

| Token | Value | Notes |
| :--- | :--- | :--- |
| `rounded-card` | `16px` | Default card |
| `rounded-panel` | `20px` | Larger section panels |
| `rounded-modal` | `24px` | Modals & drawers |
| `rounded-button` | `10px` | Buttons & inputs |
| `rounded-input` | `10px` | Form inputs |
| `rounded-badge` | `8px` | Badges |
| `rounded-pill` | `9999px` | Trigger pills & status badges |

---

## 7. Shadows & Glow Effects

Shadows are theme-tuned via `--lc-shadow-color` / `--lc-shadow-strength` (softer on light, deeper on
dark):

| Token | Light default (computed) | Purpose |
| :--- | :--- | :--- |
| `shadow-xs` | subtle hairline shadow | Cards, small elements |
| `shadow-card` | `0 1px 2px` + `0 1px 3px` at low strength | Default card elevation |
| `shadow-card-hover` | `0 4px 12px -2px` + `0 2px 6px -2px` | Hovered cards |
| `shadow-elevated` | `0 8px 24px -4px` + `0 4px 8px -4px` | Popovers, floating controls |
| `shadow-modal` | `0 20px 50px -12px` at `strength * 2.2` | Modals, drawers |
| `shadow-glow-primary` | `0 4px 14px -4px rgb(249 115 22 / 0.4)` | Orange brand glow (primary CTAs) |
| `shadow-inner-light` | `inset 0 1px 0 0 rgb(255 255 255 / 0.06)` | Inner top highlight |

---

## 8. Glassmorphism Rules

Glass is applied **selectively** — navigation, floating controls, summary cards, modals/drawers and the
profile menu — never full-page. Two component classes in `globals.css` provide it:

```css
.glass        { background: rgb(var(--lc-glass) / var(--lc-glass-alpha)); }
.glass-strong { background: rgb(var(--lc-glass) / var(--lc-glass-alpha-strong)); }
/* both add:  border: 1px solid rgb(var(--lc-glass-border) / var(--lc-glass-border-alpha));
              backdrop-blur-xl; and an opaque panel fallback when backdrop-filter is unsupported */
```

- Light theme glass = white frosting over white panels; dark theme glass = `#0F131D`/slate frost over
  the `#070A11` canvas.
- The UI `Card` component exposes `surface="solid"` (default, opaque `bg-panel`) and
  `surface="glass"` (`glass shadow-modal`) — see §11.

---

## 9. Buttons & Interactive Primitives

Component classes in `globals.css` (also mirrored by the React `Button` variants
`primary | secondary | ghost | danger | success | outline` and sizes `sm | md | lg | icon`):

- **`.btn-primary`**: orange gradient `from-primary-500 to-primary-600` (hover/active deepen to 700/800),
  white text, `rounded-button`, `shadow-glow-primary` → `hover:shadow-elevated`,
  `border border-primary-400/30`, focus ring.
- **`.btn-secondary`**: `bg-panel hover:bg-sunken text-ink`, `border-hairline` (theme-aware).
- **`.btn-ghost`**: transparent, `hover:bg-wash-soft text-muted hover:text-ink`.
- **`.btn-danger`**: `bg-danger-600 hover:bg-danger-700 active:bg-danger-800 text-white`.
- Shared text size/weight: `py-2.5 px-6 font-semibold text-white` (primary/danger) with
  `focus-visible:ring-2` + offset for keyboard navigation.

---

## 10. Navigation Bar & Layout Shells

- **Navbar** (`layout/Navbar.tsx`): B2B SaaS-style public header (LocoNav-style structure,
  LorryCarry identity) built as a glass shell over the canvas.
  - **Logo left**, then the தமிழ் | हिन्दी | English `LanguageToggle`.
  - **Products mega menu** — a 2-column card grid of the six LorryCarry modules (Freight
    Marketplace, Fleet Listings, Trip Control Tower, Compliance, Payments & Subscription,
    Admin Operations). Each card shows an icon, title, one-line description and link.
    Rendered by `ProductsMegaMenu` inside `Navbar.tsx`.
  - **Solutions / Resources / Company dropdowns** — labelled link lists rendered by
    `SimpleDropdownMenu`. Solutions links to role-specific surfaces (shippers, carriers,
    corridors, procurement, analytics); Resources links to Help, Tracking, Security;
    Company links to Request Demo, Contact, Privacy, Terms.
  - **Right side**: Sign in (anonymous) or bell + profile menu (signed in), with the
    bright orange "Post Freight" CTA pinned at every breakpoint.
  - **Pricing & Plans** is a direct link to `/subscribe` (not a dropdown).
  - **Accessibility**: every menu is a disclosure pattern with `aria-expanded` /
    `aria-controls`, closes on Escape or focus-out (returning focus to its trigger),
    and every interactive element has a visible focus ring.
  - **CTA routing**: Post Freight → `/post-load` (middleware sends anonymous visitors
    through `/login?redirect=/post-load`), Pricing → `/subscribe`, Sign in → `/login`.
  - **Single source of truth**: nav sections and module cards are defined in
    `layout/navigation.ts` (`NAV_SECTIONS`, `PRODUCT_MODULES`, `CTA_ROUTES`), consumed
    by the navbar, hero and homepage; every href points at a page that exists in
    `src/app/**`.
- **Sidebars** (`DashboardLayout.tsx`, admin console): fixed width (`w-64`), theme panel fill with
  hairline border. Active item: orange gradient text/border treatment with `shadow-glow-primary`;
  inactive: muted text, `hover:bg-wash` rows.
- **Mobile**: sidebars collapse into a backdrop drawer (`animate-slide-in-left`) with the bottom nav bar
  (glass + hairline) shown instead. The public navbar collapses into a full-screen mobile drawer
  below `lg` with the same section hierarchy. Use logical-property utilities in all chrome components.

---

## 11. Cards & Component Structure

`components/ui/Card.tsx`:

- `Card` (root): `rounded-card text-body shadow-card relative overflow-hidden` + surface treatment.
  Paddings `none | sm (p-4) | md (p-5 sm:p-6) | lg (p-6 sm:p-8)`; `hover` and `interactive` raise
  `shadow-card-hover` (interactive also lifts `-translate-y-0.5` and tints the border primary on hover).
- `CardHeader`: `px-5 sm:px-6 py-4 border-b border-hairline`, optional trailing `action` slot.
- `CardTitle` / `CardBody` / `CardFooter` sub-components mirror the same hairline/padding language.
- Component class equivalents: `.card`, `.card-hover`, `.card-interactive`.

---

## 12. Badges & Status Indicators

- `.badge`: `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-badge text-xs font-semibold border`.
- React `Badge` variants map to the accent scales: `default | primary | success | danger | warning | info`.
- Status dots: `.status-dot-active` = `bg-emerald-500`, `.status-dot-warning` = `bg-amber-500`,
  `.status-dot-danger` = `bg-danger-500`, `.status-dot-info` = `bg-sky-500` (2×2 rounded-full).

---

## 13. Data Tables & Operations Streams

- Table shell: panel surface, `rounded-card`/`rounded-3xl`, hairline border, `shadow-card`,
  `overflow-hidden`.
- Header rows: `text-[10px] font-mono uppercase tracking-widest text-muted` on a `bg-sunken`/panel
  strip; body rows use `text-xs font-mono` with `hover:bg-wash` and hairline dividers (see
  `components/ui/DataTable.tsx`).

---

## 14. Modals & Drawers

- Backdrop: `fixed inset-0 z-50 bg-black/80 backdrop-blur-md` (overlay token in light theme).
- Dialog (`components/ui/Modal.tsx`): `glass-strong rounded-modal shadow-modal p-6 sm:p-8`, sizes
  `sm → 2xl` via Tailwind `max-w-*`; Headless UI focus-trap; optional hidden close button for
  must-resolve flows; keyboard focus ring on the close control.

---

## 15. Operational Empty States

- `OperationalEmptyState.tsx`: centered panel (`bg-panel`/`glass`, `rounded-3xl`, hairline border),
  icon badge (`rounded-2xl bg-sunken text-muted`), step cards (`rounded-2xl p-4 border-hairline`).

### 15.1 Public marketplace empty state (`/search`)

`SearchEmptyState.tsx` (see also `lib/searchEmptyState.ts`):

- Four honest variants — `needs-location`, `ready-to-search`, `no-results`, `error`; a count is only
  printed after a successful query; failed queries render `role="alert"` + Retry, never `0`.
- Every step carries a working control (Detect GPS · enter hub · widen radius · change vehicle type),
  flagged with `aria-current="step"`.
- Publish CTAs close the loop: `Post a load` → `/login?redirect=/need-load`,
  `Register your truck` → `/login?redirect=/need-vehicle`.

### 15.2 Sample preview cards (demo proof)

`DemoPreviewCards.tsx` shows the *shape* of a live match when a public search returns nothing:

- Labelled `Sample preview` on the section **and** every card, with a line stating they are not live
  listings; never interleaved with real results (`null` when `realResultCount > 0`).
- No contact data of any kind; anonymous visitors get `Login to search live marketplace`
  (`/login?redirect=/search?type=truck|load`).
- Cards use `border-dashed border-hairline-strong` to read as secondary to live inventory.

---

## 16. Loading & Skeleton States

- **Spinner** (`ui/Spinner.tsx`): animated SVG in `text-primary-500`.
- **Skeleton shimmer** (`.skeleton`): gradient between `rgb(var(--lc-sunken))` and a hairline wash,
  `bg-[length:200%_100%] animate-shimmer rounded-lg`.
- Shared animations (Tailwind `animation`/`keyframes`): `fade-in`, `fade-in-up/down`,
  `slide-in-left/right`, `scale-in`, `shimmer`, `pulse-soft`, `bounce-in`, `spin-slow`,
  `toast-in/out`, plus stagger utilities and `transition-timing-spring`.

---

## 17. Error States & Banners

- Inline alert banner pattern: `p-4 rounded-2xl` with danger wash fill
  (`bg-danger-950/40 border border-danger-900/60 text-danger-300` in dark; equivalent danger tints in
  light) — see `ui/AlertBanner.tsx`.
- Form errors use `.input-error` (`border-danger-500` + danger focus ring); page-level failures use
  Next `error.tsx` with a Retry action.

---

## 18. Responsive Breakpoints

Tailwind defaults: `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 · `2xl` 1536. Chrome is written with
logical properties and RTL-ready utilities, mobile bottom nav is shown below `lg`, and drawers replace
sidebars below `lg`.

---

## 19. Hero & Visual Media Treatment

- The homepage hero (`HeroSection.tsx`) is a **photographic control-tower band**: `bg-slate-950` with a
  `next/image` LCP photograph (`/images/highway-trucks-hero.jpg`), dark vignette + orange ambient-glow
  overlays, white headline with an orange→amber gradient accent, and `bg-primary-500` primary /
  frosted-glass secondary CTAs. Below the hero the marketing sections (search console, corridors,
  telemetry preview) sit on light surfaces (`bg-slate-50`, white cards, gray-900 headings, orange
  accents).
- Optional WebGL canvases exist under `components/3d/` (`HeroTruckCanvas`, `DynamicHeroTruckCanvas`)
  but are **not mounted on any current route**; the photo hero is the implemented treatment.

---

## 20. AI Assistant & Intelligence Treatments

- Floating trigger (`AIFreightAssistantDrawer.tsx`): `fixed bottom-20 md:bottom-6 right-4 sm:right-6
  z-50`, `rounded-button bg-surface-900/90` panel chip (remaps to the panel token: dark-theme frost in
  `.dark`, light panel otherwise) with `border-white/10`, white text, `shadow-elevated`, focus ring.
- Drawer header/footer use glass-strong surface (`bg-surface-950/80` fills under the dark theme,
  remapped to `sunken` in light) with hairline borders.
- Intelligence chips and opportunity cards use accent-tinted surfaces, e.g.
  `bg-gradient-to-r from-primary-950/60 via-purple-950/40 to-surface-950 border border-purple-500/40`
  (dark theme) with `shadow-card`, and neutral tone tokens (`success | primary | warning | danger`)
  from `@lorrycarry/shared` mapped to Tailwind classes in the app layer only.

---

## 21. Public Website & SaaS-Style Marketing Surfaces

The public-facing routes (`/`, `/search`, `/subscribe`, `/request-demo`, `/corridors`,
`/procurement`, `/help`, `/privacy`, `/terms`, `/security`) use the same LorryCarry design
system but lean toward a **SaaS marketing** treatment rather than the dark command-center
aesthetic of the authenticated dashboards:

- **Light-first surfaces**: public pages use `bg-canvas` (slate-50) with white panels,
  gray-900 headings and LorryCarry Orange accents. The dark "Kinetic Command" theme is
  available for authenticated dashboards but the public site stays light by default.
- **Hero + marketing modules** (homepage): photographic hero band, search console,
  reference corridor directory, telemetry preview cards, FAQ accordion, footer.
- **B2B Request Demo page** (`/request-demo`): lead-capture form with role-aware
  copy (shipper vs carrier vs transporter), a 3-step process explainer and WhatsApp
  hand-off to the published support desk. Uses the same `Card`, `Button`, `Input`,
  `Select`, `Textarea` primitives with the SaaS-style light surface treatment.
- **Pricing page** (`/subscribe`): plan comparison grid with the 90-day free trial
  terms, subscription tiers and the Cashfree/Razorpay/Stripe checkout flow.

> **Design philosophy**: the public site borrows the structural patterns common to B2B
> logistics SaaS products (mega menu, role-based Solutions links, demo request CTA)
> while staying within LorryCarry's own design tokens — no imported design systems or
> third-party component libraries. The homepage uses a photographic hero (not 3D/WebGL),
> the same LorryCarry Orange brand colour, and the semantic surface/text tokens defined
> in §2.

