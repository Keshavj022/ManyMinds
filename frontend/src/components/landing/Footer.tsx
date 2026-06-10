import Link from "next/link";
import { COUNCIL_IDS } from "@/components/three/positions";
import { councilColors } from "@/lib/design-tokens";

const COLUMNS: ReadonlyArray<{
  title: string;
  links: ReadonlyArray<{ name: string; href: string }>;
}> = [
  {
    title: "Product",
    links: [
      { name: "The Journey", href: "/#council-journey" },
      { name: "Council", href: "/#about" },
      { name: "Worlds", href: "/#environments" },
      { name: "Memory", href: "/#memory" },
      { name: "How it works", href: "/#how-it-works" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About", href: "#" },
      { name: "Careers", href: "#" },
      { name: "Blog", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { name: "Privacy", href: "/privacy" },
      { name: "Terms", href: "/terms" },
      { name: "Contact", href: "/contact" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-[#06050a]">
      {/* Top hairline aurora */}
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(155,135,216,0.3), rgba(216,163,184,0.3), transparent)",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
        {/* Brand block */}
        <div className="lg:col-span-5">
          <Link
            href="/"
            className="inline-flex items-baseline text-2xl font-bold tracking-tight font-[var(--font-headline)]"
          >
            <span className="text-white">Many</span>
            <span className="aurora-text">Minds</span>
          </Link>
          <p className="mt-4 text-white/60 text-sm leading-relaxed max-w-xs">
            A personalized council of five AI friends who chat, debate, play,
            and remember — and grow with you over time.
          </p>

          {/* Member-dot row */}
          <div className="mt-6 flex items-center gap-2.5">
            {COUNCIL_IDS.map((id) => (
              <span
                key={id}
                aria-hidden
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  background: councilColors[id].hex,
                  boxShadow: `0 0 10px ${councilColors[id].soft}`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Link columns */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-[11px] font-[var(--font-label)] font-semibold uppercase tracking-[0.22em] text-white/55 mb-4">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/65 hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/40">
          <p>© 2026 ManyMinds</p>
          <p className="font-[var(--font-label)] tracking-wide">
            Aria · Rex · Sage · Nova · Echo
          </p>
        </div>
      </div>
    </footer>
  );
}
