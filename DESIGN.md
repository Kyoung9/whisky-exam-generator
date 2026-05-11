---
name: WhiskyQuest Design System
colors:
  surface: '#181309'
  surface-dim: '#181309'
  surface-bright: '#3f382d'
  surface-container-lowest: '#120e05'
  surface-container-low: '#201b11'
  surface-container: '#241f14'
  surface-container-high: '#2f291e'
  surface-container-highest: '#3a3428'
  on-surface: '#ede1d0'
  on-surface-variant: '#d4c5ab'
  inverse-surface: '#ede1d0'
  inverse-on-surface: '#363024'
  outline: '#9c8f78'
  outline-variant: '#504532'
  surface-tint: '#fbbc00'
  primary: '#ffe2ab'
  on-primary: '#402d00'
  primary-container: '#ffbf00'
  on-primary-container: '#6d5000'
  inverse-primary: '#795900'
  secondary: '#dec1af'
  on-secondary: '#3f2c20'
  secondary-container: '#574335'
  on-secondary-container: '#ccb09f'
  tertiary: '#e8e5e4'
  on-tertiary: '#313030'
  tertiary-container: '#cbc9c8'
  on-tertiary-container: '#555454'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdfa0'
  primary-fixed-dim: '#fbbc00'
  on-primary-fixed: '#261a00'
  on-primary-fixed-variant: '#5c4300'
  secondary-fixed: '#fbddca'
  secondary-fixed-dim: '#dec1af'
  on-secondary-fixed: '#28180d'
  on-secondary-fixed-variant: '#574335'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474746'
  background: '#181309'
  on-background: '#ede1d0'
  surface-variant: '#3a3428'
  background-deep: '#0F0F0F'
  surface-charcoal: '#1A1A1A'
  amber-gold: '#FFBF00'
  cask-brown: '#3D2B1F'
  glass-stroke: rgba(255, 255, 255, 0.12)
  glass-fill: rgba(26, 26, 26, 0.6)
typography:
  display-lg:
    fontFamily: Libre Caslon Text
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Libre Caslon Text
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Libre Caslon Text
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-md:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  container-max: 1280px
---

# Whisky Exam Generator (WhiskyQuest) - Project Proposal

## Overview
A high-fidelity, data-driven examination platform for whisky enthusiasts and professionals (WSET, distillation certifications). The design shifts away from "old-world" wooden textures toward a **Refined Minimalism** aesthetic — combining luxury with clinical precision.

## Design Direction: "The Library Aesthetic"
- **Theme:** Dark mode with Glassmorphism.
- **Palette:** Deep Charcoal (#1A1A1A), Amber Gold (#FFBF00), and Cask Brown (#3D2B1F).
- **Typography:** High-contrast serif headings (Modern/Luxury) with clean sans-serif body text.
- **Key Visuals:** Subtle glass textures, "maturation" progress charts, and elegant data visualizations.

## Proposed Screen List

| # | Screen | Theme name | Route | Status |
|---|---|---|---|---|
| 1 | Student Dashboard | The Cellar | `/cellar` | implemented |
| 2 | Exam Configuration | The Distillation | `/generate` | functional, design polish pending |
| 3 | Exam Interface | The Tasting | `/tasting` | implemented (demo data) |
| 4 | Performance Analytics | The Profile | `/profile` | implemented |
| 5 | Study Library | The Archive | `/archive` | implemented (demo data) |
| - | Landing | — | `/` | implemented |

## Implementation Notes

- All design tokens above are mirrored in `src/app/globals.css` via Tailwind v4 `@theme inline`. Class names like `bg-amber-gold`, `text-on-surface-variant`, `rounded-xl`, `font-[family-name:var(--font-headline-lg)]` map directly to the spec.
- Common chrome (top app bar, 5-tab bottom navigation) lives in `src/components/whisky-quest/`.
- Custom utilities in `globals.css`:
  - `.glass-panel` — translucent panel with `backdrop-filter: blur(16px)` and `glass-stroke` border.
  - `.flavor-ring`, `.radar-shape` — sensory radar visuals.
  - `.maturation-gradient` — amber → cask vertical gradient for progress hero.
- Placeholder visual assets live under `public/images/` (`whisky-hero.svg`, `whisky-bottle.svg`). Replace with real photography when available.
