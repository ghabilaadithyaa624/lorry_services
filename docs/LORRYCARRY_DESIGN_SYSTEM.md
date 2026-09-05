# LorryCarry Kinetic Command Design System

> **Visual Source of Truth**: LorryCarry Homepage (`apps/web/src/app/page.tsx`) running at `http://localhost:3010`.
>
> This document establishes the exact visual language, UI primitives, color tokens, typography scales, glassmorphism specs, and component behaviors enforced across all user dashboard and administrative routes.

---

## 1. Executive Summary & Design Philosophy

The **LorryCarry Kinetic Command** visual language is a deep navy/black cinematic aesthetic engineered for high-density, real-time national freight operations. It replaces generic light SaaS styling with:

- **Cinematic Dark Surfaces**: Deep navy base (`#070A11` / `bg-surface-950`) with atmospheric radial blur gradients (`from-primary-600/20 via-sky-500/10 to-transparent`).
- **Glassmorphism**: High-contrast dark glass cards (`bg-surface-900/80 backdrop-blur-xl border border-white/10 shadow-modal`).
- **Kinetic Telemetry**: High-legibility sans-serif copy paired with monospace numeric telemetry (`Geist Mono` / `JetBrains Mono`) for weights, rates (`₹/Ton-Km`), timestamps, and registration numbers.
- **Vibrant Accent Hues**: LorryCarry Orange (`#F97316`) for primary CTAs and active state glows, Emerald (`#22C55E`) for empirical success metrics, Amber (`#F59E0B`) for warnings, and Orange-to-Purple gradients (`from-primary-500 to-purple-600`) for AI assistant intelligence.

---

## 2. Color Palette & Hex Code Tokens

### Primary Palette (LorryCarry Orange)
| Token | Hex Code | Tailwind Class | Primary Usage |
| :--- | :--- | :--- | :--- |
| `primary-50` | `#FFF7ED` | `text-primary-50` | Light tinted highlights |
| `primary-100` | `#FFEDD5` | `text-primary-100` | CTA subtext / banner copy |
| `primary-200` | `#FED7AA` | `text-primary-200` | Highlight selection text |
| `primary-300` | `#FDBA74` | `text-primary-300` | Secondary orange accents |
| `primary-400` | `#FB923C` | `text-primary-400` | Monospace rate labels, icons |
| `primary-500` | `#F97316` | `bg-primary-500` | **Primary Brand Color**, CTAs, active indicators |
| `primary-600` | `#EA580C` | `bg-primary-600` | Gradient endpoints, hover states |
| `primary-700` | `#C2410C` | `bg-primary-700` | Active button press states |
| `primary-800` | `#9A3412` | `bg-primary-800` | Deep container backgrounds |
| `primary-900` | `#7C2D12` | `bg-primary-900` | Deep orange borders |
| `primary-950` | `#431407` | `bg-primary-950` | Darkest orange backdrop |

### Surface Palette (Deep Slate / Navy)
| Token | Hex Code | Tailwind Class | Primary Usage |
| :--- | :--- | :--- | :--- |
| Background Base | `#070A11` | `bg-[#070A11]` | **Root Page Surface** |
| `surface-50` | `#F8FAFC` | `bg-surface-50` | Contrast light text / rare light pills |
| `surface-100` | `#F1F5F9` | `text-surface-100` | **Default Body Text** |
| `surface-200` | `#E2E8F0` | `text-surface-200` | Subheader text |
| `surface-300` | `#CBD5E1` | `text-surface-300` | Secondary copy, descriptions |
| `surface-400` | `#94A3B8` | `text-surface-400` | Muted labels, placeholders, timestamps |
| `surface-500` | `#64748B` | `text-surface-500` | De-emphasized metadata |
| `surface-600` | `#475569` | `bg-surface-600` | Dark pill backgrounds |
| `surface-700` | `#334155` | `bg-surface-700` | Scrollbar thumb hover |
| `surface-800` | `#1E293B` | `bg-surface-800` | Scrollbar thumb, sub-card fill |
| `surface-900` | `#0F172A` | `bg-surface-900` | **Glass Card Fill (80-90% opacity)** |
| `surface-950` | `#020617` | `bg-surface-950` | **Input Fields & Deep Card Wells (80% opacity)** |

### Semantic Dual-Theme Tokens (CSS Variables)
To enable multi-theme flexibility across components, semantic CSS tokens are mapped in `apps/web/src/app/globals.css`:
- **Surfaces**: `bg-canvas`, `bg-panel`, `bg-sunken`, `bg-overlay`, `bg-elevated`
- **Text**: `text-ink` (primary headings), `text-body` (body text), `text-muted` (secondary), `text-subtle` (tertiary)
- **Borders & Washes**: `border-hairline`, `border-hairline-strong`, `bg-wash`

### Semantic Accent Colors
- **Success (Emerald)**: `#22C55E` (`emerald-500`), `#16A34A` (`emerald-600`), `#15803D` (`emerald-700`), `#022C22` (`emerald-950`).
- **Danger (Red)**: `#EF4444` (`danger-500` / `red-500`), `#DC2626` (`danger-600`), `#B91C1C` (`danger-700`), `#450A0A` (`danger-950`).
- **Warning (Amber)**: `#F59E0B` (`amber-500`), `#D97706` (`amber-600`), `#B45309` (`amber-700`), `#451A03` (`amber-950`).
- **Info (Sky / Blue)**: `#3B82F6` (`info-500` / `sky-500`), `#2563EB` (`sky-600`), `#082F49` (`sky-950`).
- **AI Intelligence (Purple / Amber / Orange)**: `#A855F7` (`purple-500`), `#9333EA` (`purple-600`), `#3B0764` (`purple-950`).

---

## 3. Gradients & Lighting Effects

### Background Ambient Blur Overlay
```tsx
<div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-primary-600/20 via-sky-500/10 to-transparent rounded-full blur-[140px] pointer-events-none" />
```

### Grid Background Pattern
```tsx
<div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
```

### Button Primary Gradient
```css
bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700
```

### Active Nav Item Glow Gradient
```css
bg-gradient-to-r from-primary-500 to-amber-500 text-white shadow-glow-primary border border-primary-400/30
```

### Text Headline Gradient
```css
bg-gradient-to-r from-primary-400 via-primary-500 to-amber-400 bg-clip-text text-transparent
```

### AI Assistant Premium Gradient
- **Trigger Pill**: `bg-gradient-to-r from-primary-600 to-purple-600`
- **Avatar Badge**: `bg-gradient-to-tr from-primary-500 via-amber-500 to-purple-600 border border-purple-400/30`
- **User Chat Bubble**: `bg-gradient-to-r from-primary-500 to-amber-500 text-white shadow-glow-primary`

---

## 4. Typography & Monospace Telemetry

### Font Families
- **Sans-serif (Copy & Headings)**: `Inter`, `Plus Jakarta Sans`, `Noto Sans Tamil`, `Noto Sans Devanagari`, `system-ui`, `-apple-system`, `sans-serif`
- **Monospace (Telemetry & Numbers)**: `Geist Mono`, `JetBrains Mono`, `monospace`

### Font Scale & Tracking Rules
- **Display 6XL**: `text-4xl sm:text-6xl font-black tracking-tight leading-[1.08]` (Hero Headlines)
- **Title 3XL/4XL**: `text-3xl sm:text-4xl font-extrabold text-white tracking-tight` (Section Headers)
- **Header XL/2XL**: `text-xl sm:text-2xl font-black tracking-tight text-white` (Page Headers)
- **Card Title SM/Base**: `text-sm sm:text-base font-bold text-white` (Component Headings)
- **Body Copy XS/SM**: `text-xs sm:text-sm text-surface-300 leading-relaxed` (Paragraph Copy)
- **Telemetry 10px Mono**: `text-[10px] font-mono font-bold uppercase tracking-widest text-surface-400` (Labels & Metrics)

### Strict Monospace Telemetry Policy
All operational values **MUST** use `font-mono`:
- Registration Numbers (e.g., `MH 12 QW 9042`)
- Rates & Benchmark Prices (e.g., `₹3.85 / T-KM`, `₹345,000`)
- Weights & Tonnage (e.g., `20T`, `1420 KM`)
- Timestamps & Durations (e.g., `2026-08-12 14:30 IST`, `36–44 hrs`)
- Passcodes & Document IDs (e.g., `RC-MH12-9042`)

---

## 5. Spacing System & Layout Container Rules

### Page Containers
- **Dashboard Max Width**: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- **Form / Detail Max Width**: `max-w-5xl mx-auto` or `max-w-4xl mx-auto`

### Section Padding
- **Hero Padding**: `pt-12 pb-20 sm:pt-20 sm:pb-32`
- **Standard Section**: `py-12 sm:py-16 lg:py-20`
- **Card Content Padding**: `p-5 sm:p-7` or `p-6`

### Grid Gaps
- **KPI Grid**: `grid-cols-2 md:grid-cols-4 gap-4`
- **Feature Cards Grid**: `grid-cols-1 md:grid-cols-2 gap-6`
- **Dense Form Grid**: `grid-cols-1 sm:grid-cols-3 gap-4`

---

## 6. Border Radius Tokens

- **`rounded-card`**: `16px` (`rounded-2xl` for sub-cards, `rounded-3xl` for major section containers)
- **`rounded-button`**: `10px` (`rounded-xl`)
- **`rounded-input`**: `10px` (`rounded-xl`)
- **`rounded-badge`**: `8px` (`rounded-lg`)
- **`rounded-pill`**: `9999px` (`rounded-full` for trigger pills and status badges)

---

## 7. Shadows & Glow Effects

```js
boxShadow: {
  'xs':           '0 1px 2px 0 rgb(0 0 0 / 0.03)',
  'card':         '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
  'card-hover':   '0 4px 12px -2px rgb(0 0 0 / 0.08), 0 2px 6px -2px rgb(0 0 0 / 0.04)',
  'elevated':     '0 8px 24px -4px rgb(0 0 0 / 0.08), 0 4px 8px -4px rgb(0 0 0 / 0.04)',
  'modal':        '0 20px 60px -12px rgb(0 0 0 / 0.25)',
  'glow-primary': '0 0 20px -4px rgb(249 115 22 / 0.3)',
  'inner-light':  'inset 0 1px 0 0 rgb(255 255 255 / 0.05)',
}
```

---

## 8. Dark Glassmorphism Rules

Every surface container adheres to dark glassmorphic layering:

1. **Top-Level Glass Card**:
   `bg-surface-900/80 backdrop-blur-xl border border-white/10 text-white shadow-modal rounded-3xl`
2. **Interactive Glass Card**:
   `bg-surface-900/80 backdrop-blur-xl border border-white/10 text-white hover:border-primary-500/40 transition-all cursor-pointer`
3. **Sub-Card / Deep Well Fill**:
   `bg-surface-950/80 border border-white/5 rounded-2xl`
4. **Input Field Fill**:
   `bg-surface-950/80 border border-white/10 text-white placeholder:text-surface-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30`

---

## 9. Buttons & Interactive Primitives

### Primary Button (`.btn-primary`)
```css
bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700
text-white font-semibold py-2.5 px-6 rounded-xl transition-all duration-200
shadow-glow-primary hover:shadow-elevated border border-primary-400/30
```

### Secondary Button (`.btn-secondary`)
```css
bg-surface-900/80 hover:bg-surface-800 text-white font-semibold py-2.5 px-6 rounded-xl
transition-all duration-200 backdrop-blur-md border border-white/10 hover:border-white/20
```

### Ghost Button (`.btn-ghost`)
```css
bg-transparent hover:bg-white/5 text-surface-300 hover:text-white font-medium py-2.5 px-4 rounded-xl transition-all duration-200
```

### Danger Button (`.btn-danger`)
```css
bg-gradient-to-r from-danger-600 to-danger-700 hover:from-danger-700 hover:to-danger-800 text-white font-semibold py-2.5 px-6 rounded-xl transition-all duration-200
```

---

## 10. Navigation Bar & Sidebar Architecture

### Header Navbar (`Navbar.tsx`)
- Background: `bg-[#070A11]/80 backdrop-blur-xl border-b border-white/10`
- Logo: `Lorry` in white, `Carry` in `text-primary-500` with orange truck icon badge (`bg-primary-500/20 text-primary-400 border border-primary-500/30`).
- Navigation Links: `text-xs font-mono font-bold text-surface-300 hover:text-white hover:bg-white/5 px-3 py-2 rounded-xl transition-all`.

### Dashboard & Admin Sidebar (`DashboardLayout.tsx` & `AdminLayout.tsx`)
- Sidebar Shell: `w-64 bg-surface-900/90 backdrop-blur-xl border-r border-white/10 shadow-modal`
- Active Sidebar Item:
  `bg-gradient-to-r from-primary-500 to-amber-500 text-white shadow-glow-primary border border-primary-400/30 rounded-xl px-3.5 py-2.5 font-mono text-xs font-bold`
- Inactive Sidebar Item:
  `text-surface-300 hover:bg-white/5 hover:text-white rounded-xl px-3.5 py-2.5 font-mono text-xs font-bold`

---

## 11. Cards & Component Structure

### Card Primitive (`Card.tsx`)
- `CardRoot`: `bg-surface-900/80 backdrop-blur-xl rounded-3xl border border-white/10 text-white shadow-modal`
- `CardHeader`: `p-6 pb-4 border-b border-white/10 flex items-center justify-between`
- `CardFooter`: `p-4 border-t border-white/10 bg-surface-950/60 flex items-center justify-between`

---

## 12. Badges & Status Indicators

### Badge Component (`Badge.tsx`)
- **Default**: `bg-surface-800/80 text-surface-300 border-white/10`
- **Primary**: `bg-primary-500/15 text-primary-400 border-primary-500/30`
- **Success**: `bg-emerald-500/15 text-emerald-400 border-emerald-500/30`
- **Danger**: `bg-danger-500/15 text-danger-400 border-danger-500/30`
- **Warning**: `bg-amber-500/15 text-amber-400 border-amber-500/30`
- **Info**: `bg-sky-500/15 text-sky-400 border-sky-500/30`

### Status Dots
- **Active**: `w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]`
- **Warning**: `w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]`
- **Danger**: `w-2 h-2 rounded-full bg-danger-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]`
- **Info**: `w-2 h-2 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.6)]`

---

## 13. Data Tables & Operations Streams

- **Table Shell**: `bg-surface-900/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-modal overflow-hidden font-mono`
- **Header Row**: `bg-surface-950/60 border-b border-white/10 text-surface-400 uppercase text-[10px] font-mono tracking-widest p-4`
- **Table Row**: `border-b border-white/5 hover:bg-white/5 transition-colors p-4 text-xs font-mono text-white`

---

## 14. Modals & Drawers

- **Backdrop**: `fixed inset-0 z-50 bg-black/80 backdrop-blur-md`
- **Modal Dialog (`Modal.tsx`)**:
  `bg-surface-900/95 backdrop-blur-xl rounded-3xl border border-white/10 text-white shadow-modal p-6 sm:p-8 max-w-lg w-full`
- **Close Button**: `p-1.5 rounded-xl text-surface-400 hover:text-white hover:bg-white/10 transition-colors`

---

## 15. Operational Empty States

- **Empty State Component (`OperationalEmptyState.tsx`)**:
  - Main Panel: `p-8 sm:p-12 text-center bg-surface-900/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-modal`
  - Icon Badge: `w-14 h-14 rounded-2xl bg-surface-950 text-surface-400 border border-white/10 flex items-center justify-center mx-auto`
  - Step Cards: `bg-surface-950/70 border border-white/5 rounded-2xl p-4 text-left font-mono`

### 15.1 Public Marketplace Empty State (`/search`)

`SearchEmptyState.tsx` extends the pattern for the public marketplace, where an
empty grid usually means *no query has run yet*, not *no supply exists*.

- **State must be stated honestly.** Four variants — `needs-location`,
  `ready-to-search`, `no-results`, `error`. A result count is only printed once
  a query has completed; a failed query renders `role="alert"` + Retry and never
  reports `0`.
- **Every step carries a working control.** Detect GPS · enter an industrial
  hub · expand radius · change vehicle type. The step that applies to the
  current variant is flagged with `aria-current="step"`.
- **Publish CTAs close the loop**: `Post a load` → `/login?redirect=/need-load`,
  `Register your truck` → `/login?redirect=/need-vehicle` (direct routes once a
  session exists).

### 15.2 Sample Preview Cards (demo proof)

`DemoPreviewCards.tsx` shows the *shape* of a live match when a public search
returns nothing. Hard rules:

- Labelled `Sample preview` on the section **and** on every card, with a line
  stating they are not live listings.
- **Never interleaved with real results** — the component returns `null` when
  `realResultCount > 0`.
- **No contact data of any kind.** The preview types carry no phone field, cards
  render the sealed-contact state, and no WhatsApp/unlock affordance is offered.
- Anonymous visitors get `Login to search live marketplace`
  (`/login?redirect=/search?type=truck|load`, encoded).
- Cards use `border-dashed border-hairline-strong` so they read as secondary to
  live inventory.

---

## 16. Loading & Skeleton States

- **Loading Spinner (`Spinner.tsx`)**: Animated SVG spinner using `text-primary-500`
- **Skeleton Shimmer (`.skeleton`)**:
  `bg-gradient-to-r from-surface-900 via-surface-800 to-surface-900 bg-[length:200%_100%] animate-shimmer rounded-xl border border-white/5`

---

## 17. Error States & Banners

- **Error Alert Banner**:
  `p-4 rounded-2xl bg-danger-950/40 border border-danger-900/60 text-danger-300 text-xs font-mono flex items-center gap-3`

---

## 18. Responsive Breakpoints

- **`sm`**: `640px` (Mobile landscape & small tablets)
- **`md`**: `768px` (Tablets & split view)
- **`lg`**: `1024px` (Desktop & sidebar expansion)
- **`xl`**: `1280px` (Large desktop screens)
- **`2xl`**: `1536px` (Ultra-wide displays)

Mobile view collapses desktop sidebars into a sliding backdrop drawer (`animate-slide-in-left`) and displays a bottom navigation bar (`bg-surface-900/95 backdrop-blur-xl border-t border-white/10`).

---

## 19. 3D Hero & Telematics Canvas Treatment

- **Component**: `HeroTruckCanvas.tsx` (using Three.js / `@react-three/fiber`)
- **Container**: `h-48 sm:h-52 lg:h-[540px] rounded-3xl overflow-hidden border border-white/10 bg-surface-950 relative shadow-card`
- **Fallback Loading State**: `animate-pulse bg-surface-950/80 border border-white/10 text-surface-400 font-mono text-xs`

---

## 20. Premium AI Assistant & Gradient Treatment

- **Floating Trigger Pill**: `fixed bottom-6 right-6 z-50 px-4 py-3 rounded-full bg-gradient-to-r from-primary-600 to-purple-600 text-white font-bold text-xs shadow-elevated hover:scale-105 transition-all`
- **Drawer Panel**: `bg-surface-900/95 backdrop-blur-xl border-l border-white/10 text-white`
- **AI Avatar Badge**: `w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-500 via-amber-500 to-purple-600 flex items-center justify-center text-white border border-purple-400/30 shadow-glow-primary`
- **User Chat Bubble**: `bg-gradient-to-r from-primary-500 to-amber-500 text-white font-sans text-xs shadow-glow-primary rounded-2xl rounded-tr-xs`
- **Assistant Chat Bubble**: `bg-surface-950/80 border border-white/10 text-surface-200 font-sans text-xs rounded-2xl rounded-tl-xs`
