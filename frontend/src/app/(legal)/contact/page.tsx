"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import GlassCard from "@/components/ui/GlassCard";
import AuroraButton from "@/components/ui/AuroraButton";
import { councilColors } from "@/lib/design-tokens";

const CHANNELS: ReadonlyArray<{
  icon: string;
  label: string;
  value: string;
  href: string;
  member: keyof typeof councilColors;
}> = [
  {
    icon: "alternate_email",
    label: "Email",
    value: "hello@manyminds.ai",
    href: "mailto:hello@manyminds.ai",
    member: "aria",
  },
  {
    icon: "tag",
    label: "Twitter / X",
    value: "@manyminds_ai",
    href: "https://twitter.com",
    member: "nova",
  },
  {
    icon: "chat_bubble",
    label: "Discord",
    value: "Join the council",
    href: "https://discord.com",
    member: "rex",
  },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="mb-12">
        <p className="text-[11px] font-[var(--font-label)] uppercase tracking-[0.32em] text-white/55 mb-4">
          Get in touch
        </p>
        <h1 className="font-[var(--font-headline)] text-4xl md:text-5xl font-bold leading-[1.05] tracking-tight mb-4">
          <span className="text-white">Talk to the</span>{" "}
          <span className="aurora-text">humans</span>
        </h1>
        <p className="text-white/65 text-base leading-relaxed max-w-prose">
          The council is great. But sometimes you need a real person. We
          usually reply within 24 hours.
        </p>
      </header>

      <div className="grid lg:grid-cols-[260px_1fr] gap-10">
        {/* Sidebar — channels */}
        <aside className="space-y-3 order-2 lg:order-1">
          <p className="text-[11px] font-[var(--font-label)] uppercase tracking-[0.22em] text-white/55 mb-3">
            Reach us at
          </p>
          {CHANNELS.map((ch) => {
            const c = councilColors[ch.member];
            return (
              <a
                key={ch.label}
                href={ch.href}
                target={ch.href.startsWith("http") ? "_blank" : undefined}
                rel={ch.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="group flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.18] transition-all"
              >
                <div
                  className="w-10 h-10 rounded-xl grid place-items-center shrink-0 border"
                  style={{
                    background: c.soft,
                    borderColor: c.hex + "55",
                    color: c.hex,
                  }}
                >
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={{ fontVariationSettings: "'FILL' 0" }}
                  >
                    {ch.icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-[var(--font-label)] uppercase tracking-[0.22em] text-white/45">
                    {ch.label}
                  </p>
                  <p className="text-sm text-white/85 group-hover:text-white transition-colors truncate">
                    {ch.value}
                  </p>
                </div>
                <span
                  className="material-symbols-outlined text-[18px] text-white/35 group-hover:text-white group-hover:translate-x-0.5 transition-all"
                  aria-hidden
                >
                  arrow_forward
                </span>
              </a>
            );
          })}
        </aside>

        {/* Form */}
        <div className="order-1 lg:order-2">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label
                    htmlFor="c-name"
                    className="block text-xs font-[var(--font-label)] font-semibold text-white/70 ml-1"
                  >
                    Name
                  </label>
                  <input
                    id="c-name"
                    type="text"
                    required
                    className="w-full rounded-2xl px-4 py-3.5 text-white placeholder:text-white/30"
                    placeholder="Ada Lovelace"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="c-email"
                    className="block text-xs font-[var(--font-label)] font-semibold text-white/70 ml-1"
                  >
                    Email
                  </label>
                  <input
                    id="c-email"
                    type="email"
                    required
                    className="w-full rounded-2xl px-4 py-3.5 text-white placeholder:text-white/30"
                    placeholder="ada@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="c-subject"
                  className="block text-xs font-[var(--font-label)] font-semibold text-white/70 ml-1"
                >
                  Subject
                </label>
                <select
                  id="c-subject"
                  className="w-full rounded-2xl px-4 py-3.5 text-white appearance-none"
                >
                  <option value="general">General inquiry</option>
                  <option value="support">Technical support</option>
                  <option value="billing">Billing &amp; upgrades</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="press">Press / partnerships</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="c-msg"
                  className="block text-xs font-[var(--font-label)] font-semibold text-white/70 ml-1"
                >
                  Message
                </label>
                <textarea
                  id="c-msg"
                  required
                  rows={6}
                  className="w-full rounded-2xl px-4 py-3.5 text-white placeholder:text-white/30 resize-none"
                  placeholder="Tell us a bit about what you're working on or what you need."
                />
              </div>

              <div className="pt-2">
                <AuroraButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="rounded-2xl"
                  iconRight={
                    <span
                      className="material-symbols-outlined text-[18px]"
                      style={{ fontVariationSettings: "'FILL' 0" }}
                    >
                      send
                    </span>
                  }
                >
                  Send Message
                </AuroraButton>
              </div>
            </form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <GlassCard variant="aurora" className="rounded-3xl p-10 text-center">
                <div
                  className="w-16 h-16 rounded-full grid place-items-center mx-auto mb-6"
                  style={{
                    background: "rgba(74,222,128,0.18)",
                    color: "#4ade80",
                    boxShadow: "0 0 30px rgba(74,222,128,0.35)",
                  }}
                >
                  <span
                    className="material-symbols-outlined text-3xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                </div>
                <h3 className="font-[var(--font-headline)] text-2xl font-bold text-white mb-3">
                  Message sent
                </h3>
                <p className="text-sm text-white/65 mb-7 max-w-sm mx-auto">
                  Thanks for reaching out. A real human from the team will get
                  back to you within 24 hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-6 py-2.5 rounded-full text-sm font-[var(--font-label)] font-semibold border border-white/20 hover:bg-white/10 hover:border-white/40 transition-colors"
                >
                  Send another message
                </button>
              </GlassCard>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
