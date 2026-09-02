# Palette's Journal - Critical UX & Accessibility Learnings

## 2025-02-17 - Designing Accessible Interactive Buttons
**Learning:** Icon-only and interactive control elements like table/list refreshers must have explicit `aria-label` descriptors. In monorepo applications, components like `Button` might already handle some a11y properties, but custom markup around icon-only trigger buttons lacks accessible names, making them difficult or impossible to navigate for screen readers.
**Action:** Always inspect custom button triggers and ensure they have meaningful ARIA labels and focus visibility states.

## 2025-02-19 - Accessible Segmented Tabs & Modal Checkout in Mobile Screen Refactoring
**Learning:** When developing high-fidelity interactive tab controls and sandbox simulated portals in React Native, visual cues (colors, indicators) must be paired with clear screen reader semantics to ensure fully inclusive screen experiences. Custom elements lack implicit accessibility states by default.
**Action:** Explicitly define `accessibilityRole="tab"`, `accessibilityRole="radio"`, and `accessibilityState={{ selected: isActive }}` on segment/custom selection items. Always supply distinct, descriptive `accessibilityLabel` content (e.g. "My Pass tab button", "Select UPI as simulated payment method") on interactive `TouchableOpacity` controls.

## 2025-02-20 - Screen Reader Accessibility for Dynamic Mobile Toggle Controls and Icon-Only Actions
**Learning:** Icon-only actions (like logout/signout) and dynamic toggle controls (like mobile menu buttons) must have descriptive `aria-label` and `aria-expanded` attributes to ensure screen reader users can understand both the purpose of the control and its current active state.
**Action:** Always ensure icon-only buttons have explicit accessible labels and toggle controls have accurate state attributes like `aria-expanded`.

## 2025-02-22 - Accessible WAI-ARIA Combobox and Keyboard Navigation for Autocomplete Inputs
**Learning:** Custom address autocomplete inputs built with standard HTML `<input>` and floating `<ul>` dropdowns are invisible or difficult to navigate for keyboard and screen reader users unless configured as WAI-ARIA comboboxes with explicit `role="combobox"`, `role="listbox"`, `role="option"`, `aria-activedescendant`, and Arrow/Enter/Escape keyboard handlers.
**Action:** Always bind input labels using `htmlFor` with `useId()` and provide full keyboard interaction (ArrowDown, ArrowUp, Enter, Escape) on custom autocomplete dropdown controls.

## 2025-02-23 - WAI-ARIA Range Slider Accessibility & Dynamic Form Control Labeling
**Learning:** Native `<input type="range">` sliders and search filter form controls in React applications must be dynamically bound to `<label>` elements using `useId()` and supplied with WAI-ARIA slider value attributes (`aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`) so screen readers accurately communicate the slider's value and purpose.
**Action:** Always generate unique element IDs using `useId()`, connect `<label htmlFor={id}>` to `<input id={id}>`, and pass formatted `aria-valuetext` strings on range inputs.

## 2025-02-24 - Screen Reader Context on Action Triggers and Decorative Icon Hiding in Card Components
**Learning:** Card components with multiple CTA triggers (e.g., WhatsApp chat, unlock contact, book lorry) often contain redundant or non-descriptive visible text. Screen readers benefit significantly when action triggers include explicit context-rich `aria-label` descriptors (e.g., "Chat on WhatsApp with [Name] for truck [RegNumber]") and surrounding decorative icons carry `aria-hidden="true"`.
**Action:** Always pass dynamic context to action `aria-label` attributes on cards and set `aria-hidden="true"` on decorative icons inside card headers and stats.
