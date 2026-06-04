import { ReactNode } from "react";
import Link from "next/link";
import AmbientBackground from "@/components/ui/AmbientBackground";
import Footer from "@/components/landing/Footer";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen text-white flex flex-col">
      <AmbientBackground variant="minimal" />

      {/* Light header */}
      <header className="relative z-10 px-6 py-6 border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-baseline text-xl font-black tracking-tighter font-[var(--font-headline)] transition-transform duration-300 hover:scale-[1.03]"
          >
            <span className="text-white">Many</span>
            <span className="aurora-text">Minds</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white transition-colors group"
          >
            <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform">
              arrow_back
            </span>
            Back to site
          </Link>
        </div>
      </header>

      <main className="relative flex-1 pt-12 pb-24 px-6">
        <div className="max-w-3xl mx-auto">{children}</div>
      </main>

      <Footer />
    </div>
  );
}
