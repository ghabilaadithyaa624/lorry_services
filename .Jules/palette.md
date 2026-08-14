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
