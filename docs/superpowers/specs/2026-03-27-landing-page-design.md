# ManyMinds Landing Page — Frontend Spec

**Date:** 2026-03-27
**Scope:** Frontend scaffolding (Next.js) + Landing Page implementation
**Design source:** `stitch_manyminds_ai_social_intelligence_platform/manyminds_landing_page/`

---

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16.2.1 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion |
| Fonts | Google Fonts — Space Grotesk, Inter, Manrope |
| Icons | Material Symbols Outlined |

---

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout: fonts, metadata, globals
│   │   ├── page.tsx              # Landing page (server component)
│   │   └── globals.css           # Base styles, CSS custom properties
│   ├── components/
│   │   ├── landing/
│   │   │   ├── Navbar.tsx        # Fixed nav, scroll-aware bg opacity
│   │   │   ├── HeroSection.tsx   # Headline, CTAs, avatar arc
│   │   │   ├── AvatarCard.tsx    # Single council member card (animated)
│   │   │   ├── FeaturesStrip.tsx # 4-tile glassmorphic strip
│   │   │   ├── PreviewSection.tsx# 2-col: copy + video placeholder
│   │   │   └── Footer.tsx        # Links, copyright
│   │   └── ui/
│   │       └── GlassCard.tsx     # Reusable glassmorphic card primitive
│   └── lib/
│       └── design-tokens.ts      # Brand colors, font names as TS constants
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

---

## Design System Tokens

From `manyminds_design_system/DESIGN.md`:

```
Background:  #0A0A0F
Surface:     #0F0F1A
Primary:     #7C3AED  (violet)
Secondary:   #06B6D4  (cyan)
Accent:      #F59E0B  (amber)
```

Fonts: `Space Grotesk` (headline), `Inter` (body), `Manrope` (label)
Roundness: `0.75rem` default, `1rem` lg, `1.5rem` xl, `9999px` full

---

## Landing Page Sections

### 1. Navbar
- Fixed, full-width, `z-50`
- Background: `slate-950/80` with `backdrop-blur-md`, `border-b border-white/10`
- Scroll effect: transitions from transparent to frosted glass on scroll (client component)
- Left: "ManyMinds" gradient logo text (violet → cyan)
- Center: nav links — Features, How It Works, Pricing
- Right: Sign In (ghost) + Get Started (gradient pill)

### 2. Hero Section
- Radial gradient background: violet bloom center, fading to `#0A0A0F`
- Two decorative blur blobs (violet top-left, cyan bottom-right)
- Headline: `"Meet Your Council"` — Space Grotesk, bold, 8xl on desktop
- Subheadline: one-liner about the council concept, slate-400
- CTAs: "Build Your Council" (gradient, glow shadow) + "See It in Action" (ghost outline)
- Avatar arc: 5 `AvatarCard` components arranged in a fan arc with CSS rotation/translation

### 3. AvatarCard (client component — Framer Motion)
Each card represents one council member:

| Member | Color | Personality |
|--------|-------|-------------|
| Aria | violet | Analytical |
| Rex | cyan | Playful |
| Sage | violet (center, larger) | Architect |
| Nova | amber | Creative |
| Echo | pink | Empathic |

- Glassmorphic card, rounded-xl, member color border glow
- Circular avatar image with colored ring (`box-shadow` glow)
- Name + personality chip
- Framer Motion: `whileHover={{ y: -12 }}`, staggered entrance animation on mount

### 4. Features Strip
- Overlaps hero section (`-mt-10`, `z-20`)
- Single glassmorphic card, 4-column grid
- Tiles: Multi-Agent Council (violet), Graph Memory (cyan), 3D Environments (amber), Voice Interaction (pink)
- Each: icon + label, hover brightens icon bg

### 5. Preview Section
- 2-column layout (copy left, video placeholder right)
- Copy: "A collective mind for your complex problems" headline + body + 2 bullet points with check icons
- Right: glassmorphic aspect-video card with play button overlay + gradient blur halo

### 6. Footer
- Dark `slate-950` bg, border-top
- 3-column: logo | nav links | copyright

---

## Component Boundaries

- **Server components**: `page.tsx`, `FeaturesStrip`, `PreviewSection`, `Footer`
- **Client components** (`'use client'`): `Navbar` (scroll listener), `HeroSection` (Framer Motion entrance), `AvatarCard` (hover animation)

---

## Animations (Framer Motion)

- **Avatar cards**: staggered `fadeInUp` on page load (each card delays by `index * 0.1s`)
- **Avatar hover**: `y: -12` translate, smooth spring
- **Navbar**: opacity + blur transitions on scroll
- **Hero text**: `fadeInUp` entrance on mount
- **Feature tiles**: `whileHover` scale + background brighten

---

## Key Implementation Notes

- Use `next/font/google` for font loading (not CDN `<link>`) — avoids FOUT and is idiomatic Next.js
- Avatar images: use `next/image` with the Google AIDA public URLs from the Stitch design
- Tailwind config extends brand colors and font families to match design tokens exactly
- `GlassCard` primitive encapsulates the `backdrop-blur`, `border`, `bg-opacity` pattern used everywhere
