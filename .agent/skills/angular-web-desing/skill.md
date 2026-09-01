angular-web-design
Design and develop modern, accessible, and responsive web user interfaces in Angular following industry best practices. Use when building or refactoring Angular UI components, implementing responsive layouts, styling with Tailwind CSS or SCSS, applying modern Angular patterns (standalone components, signals, control flow), and optimizing frontend performance.

Instructions
Angular Web Design
Design and build maintainable, high-performance, and responsive user interfaces in Angular using modern architectural standards.

When to Use
Building new Angular UI components, pages, or layout systems.
Implementing responsive, mobile-first web designs using CSS Grid, Flexbox, or Tailwind CSS.
Refactoring legacy Angular components to modern standalone components and signal-based reactivity.
Enhancing web accessibility (a11y), keyboard navigation, and semantic markup.
Establishing consistent component architecture (Container vs. Presentational / Dumb components).
Optimizing Angular UI rendering performance with OnPush change detection and deferrable views (@defer).
Core Architecture and Component Strategy
1. Modern Angular Paradigms
Use Standalone Components (standalone: true is default in modern Angular) for modularity and tree-shaking.
Utilize Signal-based inputs (input(), input.required()) and outputs (output()) for type-safe, reactive data flow.
Prefer computed signals (computed()) for derived UI state instead of template method calls.
Apply modern control flow syntax (@if, @else, @for, @switch) instead of legacy structural directives (*ngIf, *ngFor).
Use @for with explicit track expressions (e.g., track item.id) to ensure efficient DOM reconciliation.
Set changeDetection: ChangeDetectionStrategy.OnPush across all UI components to minimize unnecessary check cycles.
2. Component Categorization
Presentational (Dumb) Components: Purely UI-focused, receive data via input(), emit events via output(), contain zero direct service injections or API calls.
Container (Smart) Components: Manage state, inject domain services/stores, coordinate presentational components, and pass down data signals.
Layout Components: Define shell structures (sidebars, navbars, headers, responsive grids) and leverage <ng-content> / content projection.
Responsive Design and Layout Patterns
Mobile-First Approach
Start CSS/Tailwind design from the smallest screen viewport and scale upwards using min-width media queries or standard Tailwind breakpoints (sm:, md:, lg:, xl:, 2xl:).
Utilize fluid typography and spacing with CSS clamp(), rem, and custom property design tokens.
Layout Strategies
CSS Grid: Primary choice for 2D macro layouts, dashboards, card grids with grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)).
Flexbox: Primary choice for 1D alignments, navbars, button groups, toolbars, and micro-layouts.
Container Queries: Use @container queries for self-contained components whose appearance adapts to their parent container rather than viewport width.
Styling and Design Systems
Use Tailwind CSS utility classes or scoped SCSS/CSS with CSS variables for dynamic theming (e.g., dark/light mode, brand palettes).
Maintain consistent spacing, typography scales, and elevation/shadow levels defined in the design token system.
Avoid deep component styling leaks; respect Angular style encapsulation (ViewEncapsulation.Emulated).
Provide distinct interactive states for all controls: :hover, :focus-visible, :active, and :disabled.
Accessibility (a11y) and Usability
Use native semantic HTML elements (<button>, <nav>, <header>, <main>, <article>, <section>) before reaching for div with ARIA roles.
Ensure all interactive non-button elements have appropriate role, tabindex="0", and keyboard handlers ((keydown.enter), (keydown.space)).
Ensure explicit aria-label or aria-labelledby attributes for icon-only buttons.
Maintain WCAG AA compliant color contrast ratios (at least 4.5:1 for normal text, 3:1 for large text and UI components).
Ensure visible and distinguishable focus rings with :focus-visible.
Performance Optimization
Employ @defer (on viewport) or @defer (on idle) for below-the-fold components, heavy charts, modals, and rich text editors.
Use NgOptimizedImage (ngSrc) for images to automate responsive image sizing, priority preloading, and layout shift prevention.
Avoid complex expressions or function executions directly in template bindings; pre-compute values using Signals or pure pipes.
Common Gotchas and How to Avoid Them
Direct DOM Manipulation: Avoid using document.getElementById or nativeElement directly. Use Angular template reference variables, directives, or Renderer2 when necessary.
Template Method Calls: Avoid binding methods in templates like [class]="getClass()". Use computed signals or direct signal state bindings.
Missing Track Keys: Always provide a unique tracking key in @for loops to prevent full DOM node recreation on list changes.
Broken Keyboard Navigation: Ensure custom dropdowns, dialogs, and navigation drawers trap or manage focus properly and handle the Escape key.