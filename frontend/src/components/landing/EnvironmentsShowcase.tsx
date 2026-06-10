"use client";

import { motion } from "framer-motion";
import SectionHeader from "@/components/ui/SectionHeader";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";
import {
  JOURNEY_WORLD_ORDER,
  WORLD_LABELS,
  type JourneyWorldId,
} from "@/components/three/journey/timeline";

/**
 * "Seven worlds" — the explicit catalog of every environment on the platform.
 *
 * Pure 2D, pure vertical: seven full-width world bands stacked top to bottom
 * in the same order the 3D journey falls through them (timeline.ts is the
 * single source of truth for order + labels — never duplicated here). Each
 * band carries a per-world gradient behind a left-to-right scrim so the name
 * and mood line stay legible.
 *
 * Below the bands, a compact voice strip puts the product's five distinct
 * ElevenLabs voices on screen: one avatar + a tiny CSS-keyframe waveform per
 * member. The waveforms pause under prefers-reduced-motion.
 */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const VIEWPORT = { once: true, margin: "-80px" } as const;

// ---------------------------------------------------------------------------
// Per-world gradients — 3-stop, derived from each world's anchor colours.
// Kept dim on the left (plus the scrim) so white text always reads.
// ---------------------------------------------------------------------------

const WORLD_GRADIENTS: Record<JourneyWorldId, string> = {
  mountain: "linear-gradient(105deg, #0d1a30 0%, #16294a 48%, #5a86b5 100%)",
  zen: "linear-gradient(105deg, #6e4337 0%, #c87a6e 55%, #f0c2a0 100%)",
  forest: "linear-gradient(105deg, #0c201b 0%, #122e27 48%, #3a6a5c 100%)",
  rooftop: "linear-gradient(105deg, #1a1026 0%, #2a1b3a 52%, #d97a5a 100%)",
  beach: "linear-gradient(105deg, #2c5a70 0%, #aee0f2 60%, #f3c98e 100%)",
  library: "linear-gradient(105deg, #1a0f0a 0%, #2a1a14 48%, #6b4630 100%)",
  cafe: "linear-gradient(105deg, #160f0b 0%, #241a14 48%, #54382a 100%)",
};

/** Left-to-right dark scrim — heavy where the world name sits, lighter where
 *  the gradient is allowed to glow. */
const BAND_SCRIM =
  "linear-gradient(90deg, rgba(8,7,13,0.92) 0%, rgba(8,7,13,0.62) 45%, rgba(8,7,13,0.24) 100%)";

const BAND_CHIPS = ["Chat", "Debate", "Game night"] as const;

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export default function EnvironmentsShowcase() {
  return (
    <section id="environments" className="relative py-32 px-6 max-w-7xl mx-auto">
      <SectionHeader
        kicker="06 · Seven worlds"
        title={
          <>
            Pick a room. <span className="aurora-text">Bring everyone.</span>
          </>
        }
        subtitle="The same table travels — café to mountaintop. Each room has its own light, its own sound, its own mood."
      />

      <div className="mt-16 md:mt-20 space-y-4 md:space-y-5">
        {JOURNEY_WORLD_ORDER.map((id, i) => (
          <WorldBand key={id} id={id} index={i} />
        ))}
      </div>

      <VoiceStrip />
    </section>
  );
}

// ---------------------------------------------------------------------------
// One world band
// ---------------------------------------------------------------------------

function WorldBand({ id, index }: { id: JourneyWorldId; index: number }) {
  const { name, line } = WORLD_LABELS[id];

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.6, ease: EASE, delay: index * 0.06 }}
      whileHover={{ y: -2 }}
      className="group relative h-28 md:h-32 rounded-3xl overflow-hidden border border-white/[0.07]"
    >
      {/* World gradient — brightens slightly on hover. */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-80 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: WORLD_GRADIENTS[id] }}
      />
      <div aria-hidden className="absolute inset-0" style={{ background: BAND_SCRIM }} />

      <div className="relative h-full flex items-center justify-between gap-4 px-6 md:px-10">
        <div className="min-w-0">
          <h3 className="font-[var(--font-headline)] font-bold text-2xl md:text-3xl text-white leading-tight">
            {name}
          </h3>
          <p className="text-white/65 text-sm md:text-base truncate">{line}</p>
        </div>

        <div className="flex items-center gap-4 md:gap-6 shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            {BAND_CHIPS.map((chip) => (
              <span
                key={chip}
                className="px-2.5 py-1 rounded-full border border-white/15 bg-white/[0.06] text-[10px] uppercase tracking-wider font-[var(--font-label)] text-white/70 whitespace-nowrap"
              >
                {chip}
              </span>
            ))}
          </div>
          <span className="text-[11px] tracking-[0.32em] uppercase font-[var(--font-label)] font-semibold text-white/45 tabular-nums">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Voice strip — five members, five tiny waveforms, one line.
// ---------------------------------------------------------------------------

/** Resting heights (px, inside an h-4 row) for the five bars of one waveform. */
const WAVE_PEAKS = [8, 13, 16, 11, 7] as const;

function VoiceStrip() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
      className="mt-10 md:mt-12 glass rounded-3xl border border-white/[0.07] px-6 md:px-8 py-6 flex flex-col md:flex-row md:items-center gap-6 md:gap-8"
    >
      {/* Scoped keyframes — paused (not removed) under reduced motion. */}
      <style>{`
        .mm-voicebar {
          animation: mm-voicewave 1.1s ease-in-out infinite;
          transform-origin: center bottom;
        }
        @keyframes mm-voicewave {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .mm-voicebar { animation-play-state: paused; }
        }
      `}</style>

      <span className="inline-flex items-center gap-2 self-start md:self-auto shrink-0 px-3 py-1.5 rounded-full border border-white/[0.12] bg-white/[0.05] text-[10px] tracking-[0.3em] uppercase font-[var(--font-label)] font-semibold text-white/65">
        <span className="material-symbols-outlined text-[14px] text-white/70" aria-hidden>
          graphic_eq
        </span>
        Voice
      </span>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        {COUNCIL_MEMBERS.map((m, i) => (
          <div key={m.id} className="flex items-center gap-2.5">
            <MemberAvatar id={m.id} size="sm" status="talking" />
            <span
              className="flex items-end gap-[3px] h-4"
              role="img"
              aria-label={`${m.name}'s voice`}
            >
              {WAVE_PEAKS.map((peak, j) => (
                <span
                  key={j}
                  className="mm-voicebar w-[3px] rounded-full"
                  style={{
                    height: peak,
                    background: councilColors[m.id].hex,
                    opacity: 0.85,
                    animationDelay: `${i * 0.07 + j * 0.12}s`,
                    animationDuration: `${1 + (j % 3) * 0.15}s`,
                  }}
                />
              ))}
            </span>
          </div>
        ))}
      </div>

      <p className="text-white/65 text-sm leading-relaxed md:ml-auto md:max-w-[16rem] md:text-right">
        Every one of them speaks — five distinct voices, not one flat read.
      </p>
    </motion.div>
  );
}
