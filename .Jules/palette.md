# Palette's Journal - Critical UX & Accessibility Learnings

## 2025-02-17 - Designing Accessible Interactive Buttons
**Learning:** Icon-only and interactive control elements like table/list refreshers must have explicit `aria-label` descriptors. In monorepo applications, components like `Button` might already handle some a11y properties, but custom markup around icon-only trigger buttons lacks accessible names, making them difficult or impossible to navigate for screen readers.
**Action:** Always inspect custom button triggers and ensure they have meaningful ARIA labels and focus visibility states.
