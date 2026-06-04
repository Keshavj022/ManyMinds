# ManyMinds Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Next.js 16.2.1 frontend and implement the ManyMinds landing page faithful to the Stitch design.

**Architecture:** App Router with server components by default; Navbar and avatar/hero sections are client components for scroll listeners and Framer Motion animations. Design tokens live in `globals.css` (Tailwind v4 `@theme`) and `lib/design-tokens.ts`. Components are split by section — one file per section, each under `components/landing/`.

**Tech Stack:** Next.js 16.2.1, TypeScript, Tailwind CSS v4, Framer Motion, Google Fonts via `next/font/google`, Material Symbols Outlined, `next/image`.

---

## File Map

| File | Responsibility |
|------|---------------|
| `frontend/package.json` | Dependencies |
| `frontend/postcss.config.mjs` | Tailwind v4 PostCSS plugin |
| `frontend/src/app/globals.css` | Tailwind import + `@theme` design tokens + `.glass-card` utility |
| `frontend/src/app/layout.tsx` | Root layout: font loading, metadata, html/body wrapper |
| `frontend/src/app/page.tsx` | Landing page — composes all section components |
| `frontend/src/lib/design-tokens.ts` | Brand colors + font names as TS constants |
| `frontend/src/components/ui/GlassCard.tsx` | Reusable glassmorphic card wrapper |
| `frontend/src/components/landing/Navbar.tsx` | Fixed nav with scroll-aware bg (client) |
| `frontend/src/components/landing/AvatarCard.tsx` | Council member card with Framer Motion (client) |
| `frontend/src/components/landing/HeroSection.tsx` | Headline, CTAs, avatar arc, bg glows (client) |
| `frontend/src/components/landing/FeaturesStrip.tsx` | 4-tile feature grid (server) |
| `frontend/src/components/landing/PreviewSection.tsx` | 2-col copy + video placeholder (server) |
| `frontend/src/components/landing/Footer.tsx` | Links + copyright (server) |
| `frontend/src/__tests__/Navbar.test.tsx` | Navbar render + scroll behaviour |
| `frontend/src/__tests__/AvatarCard.test.tsx` | AvatarCard render test |
| `frontend/src/__tests__/HeroSection.test.tsx` | HeroSection smoke test |

---

## Task 1: Scaffold Next.js project

**Files:**
- Create: `frontend/` (entire scaffold)

- [ ] **Step 1: Run create-next-app**

```bash
cd /Users/keshav/code/projects/ManyMinds
npx create-next-app@16.2.1 frontend \
  --typescript \
  --app \
  --src-dir \
  --no-tailwind \
  --no-eslint \
  --turbopack
```

When prompted "Would you like to customize the import alias?" → No.

Expected output: `✓ Created a new Next.js app in .../frontend`

- [ ] **Step 2: Install runtime dependencies**

```bash
cd /Users/keshav/code/projects/ManyMinds/frontend
npm install framer-motion
npm install tailwindcss @tailwindcss/postcss postcss
```

- [ ] **Step 3: Install dev/test dependencies**

```bash
npm install --save-dev \
  jest jest-environment-jsdom \
  @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event \
  @types/jest ts-jest
```

- [ ] **Step 4: Add jest config to package.json**

Open `frontend/package.json`. Add the following at the root level of the JSON object (alongside `"scripts"`):

```json
"jest": {
  "testEnvironment": "jsdom",
  "transform": {
    "^.+\\.(ts|tsx)$": ["ts-jest", { "tsconfig": { "jsx": "react-jsx" } }]
  },
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  "setupFilesAfterFramework": ["@testing-library/jest-dom"],
  "testPathPattern": "src/__tests__"
}
```

Also add a test script to `"scripts"`:

```json
"test": "jest --passWithNoTests"
```

- [ ] **Step 5: Verify Next.js starts**

```bash
npm run dev
```

Expected: `▲ Next.js 16.2.1` followed by `- Local: http://localhost:3000`. Kill with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
cd /Users/keshav/code/projects/ManyMinds
git init frontend || true
cd frontend
git add .
git commit -m "feat: scaffold Next.js 16.2.1 frontend with TypeScript"
```

---

## Task 2: Configure Tailwind v4 + Design Tokens

**Files:**
- Create: `frontend/postcss.config.mjs`
- Modify: `frontend/src/app/globals.css`
- Create: `frontend/src/lib/design-tokens.ts`

- [ ] **Step 1: Create PostCSS config**

Create `frontend/postcss.config.mjs`:

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

- [ ] **Step 2: Replace globals.css with Tailwind v4 + design tokens**

Replace the entire contents of `frontend/src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-brand-primary: #7c3aed;
  --color-brand-secondary: #06b6d4;
  --color-brand-accent: #f59e0b;
  --color-brand-background: #0a0a0f;
  --color-brand-surface: #0f0f1a;

  --font-headline: "Space Grotesk", sans-serif;
  --font-body: "Inter", sans-serif;
  --font-label: "Manrope", sans-serif;

  --radius-DEFAULT: 0.5rem;
  --radius-lg: 1rem;
  --radius-xl: 1.5rem;
  --radius-full: 9999px;
}

/* Glassmorphism utility — used across all card surfaces */
.glass-card {
  background: rgba(15, 15, 26, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* Glow ring — coloured box-shadow that uses currentColor */
.glow-ring {
  box-shadow: 0 0 14px currentColor;
}

/* Hero radial gradient background */
.hero-gradient {
  background: radial-gradient(
    circle at 50% 40%,
    rgba(124, 58, 237, 0.18) 0%,
    rgba(6, 182, 212, 0.06) 50%,
    rgba(10, 10, 15, 1) 100%
  );
}

html {
  scroll-behavior: smooth;
}

body {
  background-color: #0a0a0f;
  color: rgb(226 232 240); /* slate-200 */
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}

::selection {
  background-color: rgba(124, 58, 237, 0.35);
}
```

- [ ] **Step 3: Create design-tokens.ts**

Create `frontend/src/lib/design-tokens.ts`:

```ts
export const colors = {
  primary: "#7C3AED",
  secondary: "#06B6D4",
  accent: "#F59E0B",
  background: "#0A0A0F",
  surface: "#0F0F1A",
  pink: "#EC4899",
} as const;

export const fonts = {
  headline: "Space Grotesk",
  body: "Inter",
  label: "Manrope",
} as const;
```

- [ ] **Step 4: Commit**

```bash
cd /Users/keshav/code/projects/ManyMinds/frontend
git add .
git commit -m "feat: configure Tailwind v4 with ManyMinds design tokens"
```

---

## Task 3: Root Layout (Fonts + Metadata)

**Files:**
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Replace layout.tsx**

Replace the entire contents of `frontend/src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Space_Grotesk, Inter, Manrope } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-headline",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-label",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ManyMinds — AI Social Intelligence Platform",
  description:
    "A group of AI personalities who think, debate, and remember — together.",
  openGraph: {
    title: "ManyMinds",
    description: "Meet your Council. AI personalities that evolve with you.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${manrope.variable}`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/keshav/code/projects/ManyMinds/frontend
git add .
git commit -m "feat: add root layout with Google Fonts and metadata"
```

---

## Task 4: GlassCard UI Primitive

**Files:**
- Create: `frontend/src/components/ui/GlassCard.tsx`
- Create: `frontend/src/__tests__/GlassCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/GlassCard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import GlassCard from "@/components/ui/GlassCard";

describe("GlassCard", () => {
  it("renders children", () => {
    render(<GlassCard>Hello</GlassCard>);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("applies glass-card class", () => {
    const { container } = render(<GlassCard>content</GlassCard>);
    expect(container.firstChild).toHaveClass("glass-card");
  });

  it("merges extra className", () => {
    const { container } = render(
      <GlassCard className="rounded-xl">content</GlassCard>
    );
    expect(container.firstChild).toHaveClass("rounded-xl");
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd /Users/keshav/code/projects/ManyMinds/frontend
npx jest GlassCard --no-coverage
```

Expected: FAIL — `Cannot find module '@/components/ui/GlassCard'`

- [ ] **Step 3: Implement GlassCard**

Create `frontend/src/components/ui/GlassCard.tsx`:

```tsx
import { HTMLAttributes } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export default function GlassCard({
  children,
  className = "",
  ...props
}: GlassCardProps) {
  return (
    <div className={`glass-card ${className}`} {...props}>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx jest GlassCard --no-coverage
```

Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add GlassCard UI primitive"
```

---

## Task 5: Navbar Component

**Files:**
- Create: `frontend/src/components/landing/Navbar.tsx`
- Create: `frontend/src/__tests__/Navbar.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/Navbar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import Navbar from "@/components/landing/Navbar";

describe("Navbar", () => {
  it("renders ManyMinds logo", () => {
    render(<Navbar />);
    expect(screen.getByText("ManyMinds")).toBeInTheDocument();
  });

  it("renders nav links", () => {
    render(<Navbar />);
    expect(screen.getByText("Features")).toBeInTheDocument();
    expect(screen.getByText("How It Works")).toBeInTheDocument();
    expect(screen.getByText("Pricing")).toBeInTheDocument();
  });

  it("renders Sign In and Get Started buttons", () => {
    render(<Navbar />);
    expect(screen.getByText("Sign In")).toBeInTheDocument();
    expect(screen.getByText("Get Started")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx jest Navbar --no-coverage
```

Expected: FAIL — `Cannot find module '@/components/landing/Navbar'`

- [ ] **Step 3: Implement Navbar**

Create `frontend/src/components/landing/Navbar.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#050508]/90 backdrop-blur-md border-b border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
          : "bg-transparent"
      }`}
    >
      <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
        {/* Logo */}
        <div className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-cyan-400 font-[var(--font-headline)]">
          ManyMinds
        </div>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-8 font-[var(--font-headline)] font-medium text-sm tracking-tight">
          {["Features", "How It Works", "Pricing"].map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase().replace(/\s+/g, "-")}`}
              className="text-slate-300 hover:text-white px-3 py-1 rounded-full hover:bg-white/5 transition-all duration-300"
            >
              {link}
            </a>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
            Sign In
          </button>
          <button className="bg-gradient-to-r from-violet-600 to-cyan-500 text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 active:scale-95 transition-all duration-150">
            Get Started
          </button>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx jest Navbar --no-coverage
```

Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add Navbar with scroll-aware frosted glass"
```

---

## Task 6: AvatarCard Component

**Files:**
- Create: `frontend/src/components/landing/AvatarCard.tsx`
- Create: `frontend/src/__tests__/AvatarCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/AvatarCard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import AvatarCard from "@/components/landing/AvatarCard";

const mockMember = {
  name: "Aria",
  personality: "Analytical",
  color: "violet" as const,
  imageSrc: "/aria.jpg",
  rotateClass: "-rotate-6",
  translateClass: "translate-y-8",
  isFeatured: false,
};

describe("AvatarCard", () => {
  it("renders member name", () => {
    render(<AvatarCard member={mockMember} index={0} />);
    expect(screen.getByText("Aria")).toBeInTheDocument();
  });

  it("renders personality chip", () => {
    render(<AvatarCard member={mockMember} index={0} />);
    expect(screen.getByText("Analytical")).toBeInTheDocument();
  });

  it("renders avatar image with alt text", () => {
    render(<AvatarCard member={mockMember} index={0} />);
    expect(screen.getByAltText("Aria avatar")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx jest AvatarCard --no-coverage
```

Expected: FAIL — `Cannot find module '@/components/landing/AvatarCard'`

- [ ] **Step 3: Implement AvatarCard**

Create `frontend/src/components/landing/AvatarCard.tsx`:

```tsx
"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export type MemberColor = "violet" | "cyan" | "amber" | "pink";

export interface CouncilMember {
  name: string;
  personality: string;
  color: MemberColor;
  imageSrc: string;
  rotateClass: string;
  translateClass: string;
  isFeatured?: boolean;
}

const colorMap: Record<
  MemberColor,
  { ring: string; chip: string; border: string }
> = {
  violet: {
    ring: "text-violet-400 border-violet-400",
    chip: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    border: "border-violet-500/20",
  },
  cyan: {
    ring: "text-cyan-400 border-cyan-400",
    chip: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    border: "border-cyan-500/20",
  },
  amber: {
    ring: "text-amber-400 border-amber-400",
    chip: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    border: "border-amber-500/20",
  },
  pink: {
    ring: "text-pink-400 border-pink-400",
    chip: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    border: "border-pink-500/20",
  },
};

interface AvatarCardProps {
  member: CouncilMember;
  index: number;
}

export default function AvatarCard({ member, index }: AvatarCardProps) {
  const c = colorMap[member.color];
  const avatarSize = member.isFeatured ? "w-24 h-24" : "w-20 h-20";
  const cardSize = member.isFeatured
    ? "w-44 md:w-56 scale-110 z-20"
    : "w-40 md:w-48";
  const padding = member.isFeatured ? "p-6" : "p-4";
  const rounded = member.isFeatured ? "rounded-2xl" : "rounded-xl";
  const borderWidth = member.isFeatured ? "border-4" : "border-2";
  const extraGlow = member.isFeatured
    ? "shadow-[0_0_50px_rgba(124,58,237,0.3)]"
    : "shadow-xl";

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
      whileHover={{ y: -12 }}
      className={`glass-card ${padding} ${rounded} ${cardSize} ${member.rotateClass} ${member.translateClass} ${extraGlow} ${c.border} cursor-pointer`}
    >
      {/* Avatar ring */}
      <div
        className={`relative mb-4 mx-auto ${avatarSize} rounded-full glow-ring ${c.ring} ${borderWidth} border-current p-1`}
      >
        <Image
          src={member.imageSrc}
          alt={`${member.name} avatar`}
          fill
          className="object-cover rounded-full"
          sizes="96px"
        />
      </div>

      {/* Name */}
      <h3
        className={`font-[var(--font-headline)] font-bold text-white ${member.isFeatured ? "text-xl" : "text-lg"}`}
      >
        {member.name}
      </h3>

      {/* Personality chip */}
      <span
        className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mt-2 border ${c.chip}`}
      >
        {member.personality}
      </span>
    </motion.div>
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx jest AvatarCard --no-coverage
```

Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add AvatarCard with Framer Motion entrance and hover"
```

---

## Task 7: HeroSection Component

**Files:**
- Create: `frontend/src/components/landing/HeroSection.tsx`
- Create: `frontend/src/__tests__/HeroSection.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/HeroSection.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import HeroSection from "@/components/landing/HeroSection";

describe("HeroSection", () => {
  it("renders the headline", () => {
    render(<HeroSection />);
    expect(screen.getByText(/Meet Your/i)).toBeInTheDocument();
    expect(screen.getByText(/Council/i)).toBeInTheDocument();
  });

  it("renders Build Your Council CTA", () => {
    render(<HeroSection />);
    expect(screen.getByText("Build Your Council")).toBeInTheDocument();
  });

  it("renders See It in Action CTA", () => {
    render(<HeroSection />);
    expect(screen.getByText("See It in Action")).toBeInTheDocument();
  });

  it("renders all 5 council member cards", () => {
    render(<HeroSection />);
    expect(screen.getByText("Aria")).toBeInTheDocument();
    expect(screen.getByText("Rex")).toBeInTheDocument();
    expect(screen.getByText("Sage")).toBeInTheDocument();
    expect(screen.getByText("Nova")).toBeInTheDocument();
    expect(screen.getByText("Echo")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx jest HeroSection --no-coverage
```

Expected: FAIL — `Cannot find module '@/components/landing/HeroSection'`

- [ ] **Step 3: Implement HeroSection**

Create `frontend/src/components/landing/HeroSection.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import AvatarCard, { CouncilMember } from "./AvatarCard";

const COUNCIL_MEMBERS: CouncilMember[] = [
  {
    name: "Aria",
    personality: "Analytical",
    color: "violet",
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC_O5Vzghq1uFRZCQ00YPhwyxnlKn6T8KVDBc9nBcXhSwLw62xgH29eeRi8n2u26Fdknaur6Bo9QdYYDaLEyaofYLj4_NswPwaFWxNkq0T4vkr-eAw8OKhxeUvJ0cOXUXWR1ZmfdBQbOGcQ6lmsEnxGEkMc0VCepnWHBwr2nEaLvfsuOeXBgWHlyZbaX1Vy4fWIDIl4_22a6bo5DqUnD92r-iOl1yPP9sSd8SQlW2fphY4QI9kqi3adQk_gZWUbZ_6MMvkr-dZD2EqS",
    rotateClass: "-rotate-6",
    translateClass: "translate-y-8",
  },
  {
    name: "Rex",
    personality: "Playful",
    color: "cyan",
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBaZQVVy_KShswa3pojHMn40u-50cOb8w0RT57BWajDjTJY3R-rWImrpvDgIT_oCwbWSYVNSxdYa23kSERJKNnvDLCd2nYmfUE9-59jPen4ojkWtvIDaly9Cavg6BEjynj8-9DQGI5U0PLWTgOXf3nAlpXPViIdj6WarP2lNL7uFYosDFBB0d5rsWV2i9SH8UXSwRw0janBqKcsSsf-YM11na_L8DYmFEDxoPFX0NcSuq7nbHSAvs0vBZ09R8NpzGPywnDHu2U0K_-L",
    rotateClass: "-rotate-3",
    translateClass: "translate-y-4",
  },
  {
    name: "Sage",
    personality: "Architect",
    color: "violet",
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB1qDmlx51vPpx3q1DrrcJ7FMUJz6vcrgrId0cQMNGn7UmPSFAFt2TFAtKi-S5f3Qsa2whYq1xUOCv5_UruVV4Q6edh6ifIxmmES3-6rTpsoeFjCbTjzfo4ChBCQ43NzSGfSbG1yQZCDTXqVSVEcx5uQiGZOlyx1ZNJv8riJeEBReMT6RJ33vSOv4p3y6uw37ncInEMOvdQtXS8XyU-KkFyjw-M0ZZnEJHkgVvifT8Tw51LOXW7mrXyF4GwYAZ4im1pQlDzvhqrPY6z",
    rotateClass: "rotate-0",
    translateClass: "translate-y-0",
    isFeatured: true,
  },
  {
    name: "Nova",
    personality: "Creative",
    color: "amber",
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAuoppHnbuxMKDiWsUb8MEdGSt4xAd1HziX3WAtkBs1CM4mQg0M0aSjZH1s9VkOiC1amIG5tHO17YqOVGJZ38Nz2kDgj-wCFSq7OY34rLZeYce5M6JvTwOY5cAXg159-GpMEjsSgBjCHFmDHt0l9AjgLI57XrJ4ZpLiCFaiPqFz91iSEQpxzw2-kw9vmvs-AJwH7a-FPWduoz0DkjJM0CZdFdBeIAVYC8k1gw_wRaDJQiJZUdnJJF1UrkDeWJtq5lVK_xCYlGh1V4D2",
    rotateClass: "rotate-3",
    translateClass: "translate-y-4",
  },
  {
    name: "Echo",
    personality: "Empathic",
    color: "pink",
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDxlaEQb_hBRpjLNGrQ-UjMy7mGk3gnUpMo3xzeVWjB1S_U-9iZwnHREDnF7MVDlirLf1Pf5RJ89dKHy1p4_mQdmnRBZAtsmrHS9M8ZERf5rsgbtfhYkRNqi-te_68iaV4O-sohHTWAW5mjcbiZRm301_cN-LMja_my-tDqqi9mUnmjaF-8CZVXxBprq33XVB6SiAB9vMJXwzQgne4azXrk4T2rVbV-w9uVATJ285W-mwZfp-odkV0tJtc4GeyUfv46x1TunHFKTdHP",
    rotateClass: "rotate-6",
    translateClass: "translate-y-8",
  },
];

export default function HeroSection() {
  return (
    <section className="relative min-h-screen pt-32 pb-20 overflow-hidden hero-gradient">
      <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="font-[var(--font-headline)] font-bold text-5xl md:text-7xl lg:text-8xl tracking-tight mb-6 text-white"
        >
          Meet Your{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
            Council
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 font-light mb-12"
        >
          A group of AI personalities who think, debate, and remember —
          together. Experience social intelligence in a whole new dimension.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-24"
        >
          <button className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full font-bold text-white shadow-[0_0_30px_rgba(124,58,237,0.4)] hover:shadow-[0_0_45px_rgba(124,58,237,0.6)] transition-all active:scale-95">
            Build Your Council
          </button>
          <button className="w-full sm:w-auto px-8 py-4 border border-white/20 hover:border-white/40 bg-white/5 rounded-full font-bold text-white backdrop-blur-sm transition-all active:scale-95">
            See It in Action
          </button>
        </motion.div>

        {/* Avatar Arc */}
        <div className="relative h-[400px] flex items-end justify-center">
          <div className="flex gap-4 md:gap-6 items-end">
            {COUNCIL_MEMBERS.map((member, i) => (
              <AvatarCard key={member.name} member={member} index={i} />
            ))}
          </div>
        </div>
      </div>

      {/* Decorative blur blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
    </section>
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx jest HeroSection --no-coverage
```

Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add HeroSection with avatar arc and animated headline"
```

---

## Task 8: FeaturesStrip Component

**Files:**
- Create: `frontend/src/components/landing/FeaturesStrip.tsx`

- [ ] **Step 1: Implement FeaturesStrip**

Create `frontend/src/components/landing/FeaturesStrip.tsx`:

```tsx
const FEATURES = [
  {
    icon: "groups",
    label: "Multi-Agent Council",
    color: "text-violet-400",
    bg: "bg-violet-500/10 hover:bg-violet-500/20",
  },
  {
    icon: "hub",
    label: "Graph Memory",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 hover:bg-cyan-500/20",
  },
  {
    icon: "view_in_ar",
    label: "3D Environments",
    color: "text-amber-400",
    bg: "bg-amber-500/10 hover:bg-amber-500/20",
  },
  {
    icon: "settings_voice",
    label: "Voice Interaction",
    color: "text-pink-400",
    bg: "bg-pink-500/10 hover:bg-pink-500/20",
  },
];

export default function FeaturesStrip() {
  return (
    <section
      id="features"
      className="relative z-20 -mt-10 px-6 max-w-7xl mx-auto"
    >
      <div className="glass-card rounded-3xl p-8 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 items-center shadow-2xl">
        {FEATURES.map(({ icon, label, color, bg }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-3 text-center group"
          >
            <div
              className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center ${color} transition-all duration-300`}
            >
              <span
                className="material-symbols-outlined text-3xl"
                style={{ fontVariationSettings: "'FILL' 0" }}
              >
                {icon}
              </span>
            </div>
            <span className="font-[var(--font-label)] font-semibold text-sm tracking-wide text-slate-300">
              {label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/keshav/code/projects/ManyMinds/frontend
git add .
git commit -m "feat: add FeaturesStrip with 4 glassmorphic tiles"
```

---

## Task 9: PreviewSection Component

**Files:**
- Create: `frontend/src/components/landing/PreviewSection.tsx`

- [ ] **Step 1: Implement PreviewSection**

Create `frontend/src/components/landing/PreviewSection.tsx`:

```tsx
const BULLETS = [
  {
    icon: "check_circle",
    color: "text-violet-500",
    title: "Dynamic Debate",
    body: "Agents challenge each other's assumptions in real-time.",
  },
  {
    icon: "check_circle",
    color: "text-cyan-500",
    title: "Persistent Recall",
    body: "The council remembers your history across every interaction.",
  },
];

export default function PreviewSection() {
  return (
    <section
      id="how-it-works"
      className="py-24 px-6 max-w-7xl mx-auto"
    >
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        {/* Copy */}
        <div className="space-y-6">
          <h2 className="font-[var(--font-headline)] text-4xl md:text-5xl font-bold text-white leading-tight">
            A collective mind for your{" "}
            <span className="text-violet-400">complex problems.</span>
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            Why talk to one AI when you can consult a specialized team?
            ManyMinds orchestrates multiple distinct personalities who
            collaborate, verify facts, and challenge each other to give you
            the most comprehensive insights possible.
          </p>
          <div className="pt-4 space-y-4">
            {BULLETS.map(({ icon, color, title, body }) => (
              <div key={title} className="flex items-start gap-4">
                <span
                  className={`material-symbols-outlined ${color} mt-1 shrink-0`}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {icon}
                </span>
                <div>
                  <h4 className="font-bold text-white">{title}</h4>
                  <p className="text-sm text-slate-500">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Video placeholder */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-tr from-violet-600/20 to-cyan-500/20 rounded-[2rem] blur-2xl group-hover:scale-105 transition-transform duration-700" />
          <div className="relative glass-card rounded-[2rem] overflow-hidden aspect-video shadow-2xl">
            <div className="absolute inset-0 bg-[#0F0F1A]/40 flex items-center justify-center">
              <button
                aria-label="Play preview video"
                className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:scale-110 hover:bg-white/20 transition-all duration-300 cursor-pointer"
              >
                <span
                  className="material-symbols-outlined text-4xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  play_arrow
                </span>
              </button>
            </div>
            {/* Decorative inner gradient stand-in for video thumbnail */}
            <div className="w-full h-full bg-gradient-to-tr from-violet-900/40 via-slate-900/60 to-cyan-900/30" />
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: add PreviewSection with copy and video placeholder"
```

---

## Task 10: Footer Component

**Files:**
- Create: `frontend/src/components/landing/Footer.tsx`

- [ ] **Step 1: Implement Footer**

Create `frontend/src/components/landing/Footer.tsx`:

```tsx
const LINKS = [
  "Privacy Policy",
  "Terms of Service",
  "Contact",
  "Twitter",
  "Discord",
];

export default function Footer() {
  return (
    <footer className="bg-[#050508] border-t border-white/5 py-12 px-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 max-w-7xl mx-auto">
        <div className="text-lg font-bold text-slate-200 font-[var(--font-headline)]">
          ManyMinds
        </div>
        <div className="flex flex-wrap justify-center gap-8 text-xs text-slate-500">
          {LINKS.map((link) => (
            <a
              key={link}
              href="#"
              className="hover:text-slate-300 transition-colors"
            >
              {link}
            </a>
          ))}
        </div>
        <div className="text-xs text-slate-500">
          © 2026 ManyMinds AI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: add Footer component"
```

---

## Task 11: Wire Up page.tsx

**Files:**
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Replace page.tsx**

Replace the entire contents of `frontend/src/app/page.tsx`:

```tsx
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesStrip from "@/components/landing/FeaturesStrip";
import PreviewSection from "@/components/landing/PreviewSection";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesStrip />
        <PreviewSection />
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Add `images.remotePatterns` to next.config.ts**

Open `frontend/next.config.ts` and replace its contents:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/aida-public/**",
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 3: Run all tests**

```bash
cd /Users/keshav/code/projects/ManyMinds/frontend
npx jest --no-coverage
```

Expected: all tests pass (GlassCard × 3, Navbar × 3, AvatarCard × 3, HeroSection × 4)

- [ ] **Step 4: Start dev server and verify visually**

```bash
npm run dev
```

Open `http://localhost:3000`. Verify:
- Navbar appears fixed at top, transparent initially
- Scrolling makes navbar frosted glass
- Hero section shows "Meet Your Council" heading
- 5 avatar cards appear in arc formation with animations
- Features strip overlaps bottom of hero
- Preview section shows two-column layout
- Footer at bottom

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: wire up landing page — all sections complete"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Next.js 16.2.1 App Router + TypeScript + Tailwind v4 + Framer Motion
- ✅ Navbar (scroll-aware, gradient logo, Sign In / Get Started)
- ✅ HeroSection (headline, sub, CTAs, avatar arc)
- ✅ AvatarCard (5 members, Framer Motion entrance + hover, personality chips)
- ✅ FeaturesStrip (4 tiles, glassmorphic)
- ✅ PreviewSection (2-col, video placeholder, bullets)
- ✅ Footer
- ✅ GlassCard primitive
- ✅ Design tokens in globals.css + lib/design-tokens.ts
- ✅ next/font/google instead of CDN link
- ✅ next/image with remote pattern for AIDA URLs
- ✅ Server vs client component boundaries respected

**Placeholder scan:** None found — all steps contain actual code.

**Type consistency:**
- `CouncilMember` defined in `AvatarCard.tsx`, imported in `HeroSection.tsx` ✅
- `MemberColor` defined alongside `CouncilMember` ✅
- `colorMap` keys match `MemberColor` union ✅
