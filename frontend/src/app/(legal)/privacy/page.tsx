"use client";

import { motion } from "framer-motion";

type Section = {
  id: string;
  title: string;
  body: ReadonlyArray<string | { type: "list"; items: ReadonlyArray<string> }>;
};

const SECTIONS: ReadonlyArray<Section> = [
  {
    id: "information-we-collect",
    title: "1. Information we collect",
    body: [
      "When you use ManyMinds, we collect information that you proactively give us — your account details, the personality settings you assign to each Council member, and the content of your interactions across chats, debates, games, and uploaded media.",
      "We also collect telemetry data — load times, error rates, model-usage metrics — to keep the platform fast and reliable. This data is anonymised at ingestion.",
      { type: "list", items: [
        "Account info: name, email, hashed password, locale.",
        "Onboarding profile: demographics + your Big-Five quiz results.",
        "Interaction content: messages, voice transcripts, uploaded images.",
        "Memory graph: relationships derived from your interactions, stored in Neo4j.",
      ]},
    ],
  },
  {
    id: "how-we-use",
    title: "2. How we use your data",
    body: [
      "Your data primarily powers your council. It builds the persistent memory graph that lets Aria, Rex, Sage, Nova, and Echo remember past conversations and grow alongside you.",
      "We never sell your personal data or conversation history to third-party advertisers. Anonymised, aggregated metrics may be used to improve product features.",
    ],
  },
  {
    id: "training",
    title: "3. AI training and privacy",
    body: [
      "By default, your interactions are used to fine-tune the base models securely across our infrastructure. Pioneer and Visionary tier users can opt out of training data sharing in account settings.",
      "Your private memory graph is walled within your council session — even when interactions are used for training, they are de-identified and never linked back to your profile.",
    ],
  },
  {
    id: "security",
    title: "4. Data security",
    body: [
      "We implement industry-standard encryption — AES-256 at rest and TLS 1.3 in transit — for your council architecture and memory graphs. Access to production data is role-restricted and audited.",
    ],
  },
  {
    id: "your-rights",
    title: "5. Your rights",
    body: [
      "You have the right to request an export of your memory graph, or the complete deletion of your account and all associated council interactions, at any time. Email privacy@manyminds.ai or use the in-app data tools.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative grid lg:grid-cols-[1fr_220px] gap-12"
    >
      <article>
        <header className="mb-12">
          <p className="text-[11px] font-[var(--font-label)] uppercase tracking-[0.32em] text-white/55 mb-4">
            Last updated · March 2026
          </p>
          <h1 className="font-[var(--font-headline)] text-4xl md:text-5xl font-bold leading-[1.05] tracking-tight mb-4">
            <span className="text-white">Privacy</span>{" "}
            <span className="aurora-text">Policy</span>
          </h1>
          <p className="text-white/65 text-base leading-relaxed max-w-prose">
            Your council&apos;s memory is meant to feel personal — which means we
            owe you radical clarity about how it&apos;s built, stored, and
            protected.
          </p>
          <div
            aria-hidden
            className="mt-8 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(155,135,216,0.4), rgba(216,163,184,0.4), transparent)",
            }}
          />
        </header>

        <div className="space-y-12 text-white/75 leading-relaxed">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-28">
              <h2 className="font-[var(--font-headline)] text-2xl font-bold text-white mb-4">
                {s.title}
              </h2>
              <div className="space-y-4">
                {s.body.map((b, i) =>
                  typeof b === "string" ? (
                    <p key={i}>{b}</p>
                  ) : (
                    <ul
                      key={i}
                      className="list-disc list-outside pl-5 space-y-2 text-white/65"
                    >
                      {b.items.map((it) => (
                        <li key={it}>{it}</li>
                      ))}
                    </ul>
                  )
                )}
              </div>
            </section>
          ))}
        </div>
      </article>

      {/* Sticky TOC */}
      <aside className="hidden lg:block">
        <div className="sticky top-28">
          <p className="text-[11px] font-[var(--font-label)] uppercase tracking-[0.22em] text-white/55 mb-3">
            On this page
          </p>
          <ul className="space-y-2 text-sm border-l border-white/10 pl-4">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-white/55 hover:text-white transition-colors block py-0.5 hover:underline hover:underline-offset-4 decoration-[color:var(--color-sage)] hover:decoration-2"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </motion.div>
  );
}
