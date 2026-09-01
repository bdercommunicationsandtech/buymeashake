---
name: Action-Performance Athleticism
colors:
  surface: '#111415'
  surface-dim: '#111415'
  surface-bright: '#373a3b'
  surface-container-lowest: '#0c0f10'
  surface-container-low: '#191c1d'
  surface-container: '#1d2021'
  surface-container-high: '#282a2b'
  surface-container-highest: '#323536'
  on-surface: '#e1e3e4'
  on-surface-variant: '#c4c9ac'
  inverse-surface: '#e1e3e4'
  inverse-on-surface: '#2e3132'
  outline: '#8e9379'
  outline-variant: '#444933'
  surface-tint: '#abd600'
  primary: '#ffffff'
  on-primary: '#283500'
  primary-container: '#c3f400'
  on-primary-container: '#556d00'
  inverse-primary: '#506600'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#4a4949'
  on-secondary-container: '#bab8b7'
  tertiary: '#ffffff'
  on-tertiary: '#21323e'
  tertiary-container: '#d2e5f5'
  on-tertiary-container: '#556774'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c3f400'
  primary-fixed-dim: '#abd600'
  on-primary-fixed: '#161e00'
  on-primary-fixed-variant: '#3c4d00'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474646'
  tertiary-fixed: '#d2e5f5'
  tertiary-fixed-dim: '#b6c9d8'
  on-tertiary-fixed: '#0b1d29'
  on-tertiary-fixed-variant: '#374956'
  background: '#111415'
  on-background: '#e1e3e4'
  surface-variant: '#323536'
  action-green: '#CCFF00'
  deep-charcoal: '#121212'
  iron-grey: '#1F1F1F'
  stadium-white: '#FFFFFF'
  recovery-blue: '#00D1FF'
  burn-red: '#FF3B30'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '900'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Montserrat
    fontSize: 36px
    fontWeight: '900'
    lineHeight: 42px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-bold:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.05em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1200px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style
The design system is built on the intersection of **High-Performance Athletics** and **Digital Micro-Patronage**. The brand personality is disciplined, energetic, and elite, yet remains accessible to fans and casual athletes alike.

The visual style is **Modern Kinetic**. It leverages high-contrast color pairings and bold, structured typography to evoke the feeling of a premium gym environment or a professional sports broadcast. The interface uses generous whitespace and crisp edges to maintain a "clean-fuel" aesthetic, avoiding clutter in favor of high-impact action items. 
- **Style:** Modern / High-Contrast
- **Emotional Response:** Motivation, strength, reliability, and momentum.
- **Visual Strategy:** Dark-mode dominance to reflect "gym floor" aesthetics, punctuated by vibrant neon accents to highlight calls-to-action.

## Colors
The palette is engineered for maximum visibility and energy.
- **Action Green (#CCFF00):** The primary driver. Used exclusively for buttons, active states, and critical brand moments. It represents energy and the "go" signal.
- **Deep Charcoal & Iron Grey:** These form the structural foundation of the UI, providing a sophisticated, low-glare environment that allows the content and the "Action Green" to pop.
- **Stadium White:** Reserved for primary body text and high-level headers to ensure readability against dark backgrounds.
- **Functional Accents:** Recovery Blue for informational states and Burn Red for destructive actions or intensity metrics.

## Typography
Typography is used as a structural element to convey strength.
- **Headlines:** Montserrat is utilized for its geometric stability and aggressive weights. "Display" and "Headline" levels should use Heavy (900) or Bold (700) weights to mimic sports apparel branding.
- **Body:** Inter provides a functional, highly legible contrast to the decorative headers. It ensures that bio descriptions and transaction details are effortless to read.
- **Labels:** Small labels and "Kicker" text use uppercase Inter with increased letter spacing to create a technical, data-driven feel.

## Layout & Spacing
The layout follows an **8px linear scale** to maintain a tight, disciplined rhythm.
- **Grid:** A 12-column fluid grid for desktop and a 4-column grid for mobile.
- **Philosophy:** Content is grouped in "Modules" (cards). Spacing between modules should be aggressive (32px+) to allow the design to breathe, while internal card padding remains tight (24px) to feel compact and "dense" like a nutrition label.
- **Responsiveness:** On mobile, horizontal margins shrink to 16px to maximize screen real estate for creator imagery.

## Elevation & Depth
In this dark-mode centric system, depth is achieved through **Tonal Layering** rather than traditional shadows.
- **Surface 0:** Deep Charcoal (#121212) - The main background.
- **Surface 1:** Iron Grey (#1F1F1F) - Card containers and input fields.
- **Surface 2:** Lighter Grey (#2C2C2C) - Hover states and elevated UI elements like floating action buttons.
- **Outlines:** Use subtle 1px borders (#333333) to define card boundaries. Shadows, if used, should be "Action Green" glows (low opacity) limited only to the primary Call-to-Action button to simulate neon illumination.

## Shapes
The shape language is **Rounded but Precise**. 
- A base radius of 8px (Level 2) is used for cards and standard containers. 
- **Buttons:** Use a fully "Pill" shape (999px) for primary actions to suggest the shape of a protein shaker or a pill-supplement, providing a friendly, ergonomic touchpoint amidst the sharp typography.
- **Avatars:** Strictly circular to emphasize the individual athlete.

## Components
- **Buttons:** The "Buy a Shake" button is always Action Green with Black text. It should have a subtle "pulse" animation on hover. Secondary buttons use Iron Grey with White borders.
- **Cards:** High-contrast containers with Iron Grey backgrounds. Use "Action Green" for progress bars (e.g., "Goal: 45/50 Shakes").
- **Inputs:** Dark backgrounds with subtle 1px borders. The cursor and active focus border should be Action Green.
- **Chips:** Small, pill-shaped tags used for fitness categories (e.g., #Powerlifting, #Yoga). Use Iron Grey with White text.
- **Shaker Metric:** A unique component—a vertical "shaker bottle" icon that fills up with Action Green liquid as a creator reaches their monthly patronage goal.
- **Iconography:** Linear, high-stroke icons. Use metaphors related to movement: arrows for growth, lightning bolts for energy, and weights for milestones.