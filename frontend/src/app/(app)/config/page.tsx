"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ApiError, CouncilMember as ApiMember, api } from "@/lib/api";
import {
  COUNCIL_MEMBERS,
  CouncilMemberId,
  councilColors,
} from "@/lib/design-tokens";
import type { BigFiveDimension } from "@/lib/onboarding";
import MemberAvatar from "@/components/ui/MemberAvatar";
import MemberChip from "@/components/ui/MemberChip";
import GlassCard from "@/components/ui/GlassCard";
import AuroraButton from "@/components/ui/AuroraButton";
import TraitSlider from "@/components/config/TraitSlider";
import VoicePreview from "@/components/config/VoicePreview";
import {
  BOUNDARY_LABELS,
  Boundary,
  DEFAULT_CONFIGS,
  MemberConfig,
  TONE_OPTIONS,
  ToneOption,
} from "@/components/config/types";
import {
  BoundaryToggle,
  ConnectionPill,
  type LoadState,
} from "@/components/config/widgets";

const TRAIT_ORDER: BigFiveDimension[] = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
];

const MAX_TONES = 2;

export default function ConfigPage() {
  const [activeId, setActiveId] = useState<CouncilMemberId>("aria");
  const [configs, setConfigs] = useState<Record<CouncilMemberId, MemberConfig>>(
    () => structuredCloneOrFallback(DEFAULT_CONFIGS),
  );
  const [memberMap, setMemberMap] = useState<Record<string, ApiMember>>({});
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Pull live council from backend on mount. Pre-fill tone/boundaries from any
  // already-saved server-side state so the user sees their previous edits.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const members = await api<ApiMember[]>("/api/v1/council/members");
        if (cancelled) return;
        const map: Record<string, ApiMember> = {};
        for (const m of members) map[m.slug] = m;
        setMemberMap(map);
        setLoadState("ready");

        // Hydrate configs from server when available (tone + constraints).
        setConfigs((prev) => {
          const next = { ...prev };
          for (const m of members) {
            const slug = m.slug as CouncilMemberId;
            if (!next[slug]) continue;
            const updated = { ...next[slug] };
            if (m.tone) {
              const known = TONE_OPTIONS.find((t) => t.id === m.tone);
              if (known) updated.tones = [known.id];
            }
            const bc = m.behavioral_constraints || {};
            const boundaries = (bc as Record<string, unknown>).boundaries;
            if (boundaries && typeof boundaries === "object") {
              updated.boundaries = {
                ...updated.boundaries,
                ...(boundaries as MemberConfig["boundaries"]),
              };
            }
            const traits = (bc as Record<string, unknown>).traits;
            if (traits && typeof traits === "object") {
              updated.traits = {
                ...updated.traits,
                ...(traits as MemberConfig["traits"]),
              };
            }
            next[slug] = updated;
          }
          return next;
        });
      } catch (err) {
        if (cancelled) return;
        setLoadState("error");
        setStatusMsg(
          err instanceof ApiError
            ? `Couldn't reach the council: ${err.message}`
            : "Couldn't reach the council.",
        );
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const member = COUNCIL_MEMBERS.find((m) => m.id === activeId)!;
  const config = configs[activeId];
  const color = councilColors[activeId];
  const apiActive = memberMap[activeId];
  const expertise = apiActive?.expertise_areas ?? [];

  function updateTrait(dim: BigFiveDimension, value: number) {
    setConfigs((prev) => ({
      ...prev,
      [activeId]: {
        ...prev[activeId],
        traits: { ...prev[activeId].traits, [dim]: value },
      },
    }));
  }

  function toggleTone(tone: ToneOption) {
    setConfigs((prev) => {
      const current = prev[activeId].tones;
      let next: ToneOption[];
      if (current.includes(tone)) {
        next = current.filter((t) => t !== tone);
      } else if (current.length >= MAX_TONES) {
        // bump the oldest tone
        next = [...current.slice(1), tone];
      } else {
        next = [...current, tone];
      }
      return { ...prev, [activeId]: { ...prev[activeId], tones: next } };
    });
  }

  function toggleBoundary(b: Boundary) {
    setConfigs((prev) => ({
      ...prev,
      [activeId]: {
        ...prev[activeId],
        boundaries: {
          ...prev[activeId].boundaries,
          [b]: !prev[activeId].boundaries[b],
        },
      },
    }));
  }

  function resetMember() {
    setConfigs((prev) => ({
      ...prev,
      [activeId]: structuredCloneOrFallback(DEFAULT_CONFIGS[activeId]),
    }));
  }

  async function saveMember() {
    const apiMember = memberMap[activeId];
    if (!apiMember || saving) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const tone = config.tones[0] ?? null;
      const updated = await api<ApiMember>(
        `/api/v1/council/members/${apiMember.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            tone,
            behavioral_constraints: {
              boundaries: config.boundaries,
              traits: config.traits,
            },
          }),
        },
      );
      setMemberMap((prev) => ({ ...prev, [updated.slug]: updated }));
      setStatusMsg(`Saved — ${member.name} took notes.`);
    } catch (err) {
      setStatusMsg(
        err instanceof ApiError
          ? `Couldn't save: ${err.message}`
          : "Couldn't save changes.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-7 pb-6 max-w-6xl mx-auto">
      {/* Page header */}
      <header>
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="inline-flex items-center gap-2">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-white/40" />
            <p className="text-[11px] tracking-[0.32em] uppercase font-[var(--font-label)] font-semibold text-white/55">
              Your council
            </p>
          </div>
          <ConnectionPill state={loadState} />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold font-[var(--font-headline)] text-white tracking-tight">
          Tune your friends.
        </h1>
        <p className="mt-3 text-sm md:text-base text-white/55 max-w-2xl leading-relaxed">
          They&rsquo;ll still be themselves — you&rsquo;re just choosing how
          loud, how warm, how challenging they get to be with you. Every change
          is kept with the council, so they remember it next time you talk.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Member roster */}
        <aside className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.32em] font-[var(--font-label)] font-semibold text-white/45 pl-2 mb-3">
            The five
          </p>
          {COUNCIL_MEMBERS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveId(m.id)}
              className="w-full text-left"
              aria-pressed={activeId === m.id}
            >
              <MemberChip
                id={m.id}
                name={m.name}
                role={m.role}
                active={activeId === m.id}
                className="w-full"
              />
            </button>
          ))}
          <button
            type="button"
            disabled
            className="w-full mt-4 flex items-center gap-3 p-3 rounded-2xl border border-dashed border-white/[0.06] text-white/35 text-sm cursor-not-allowed"
          >
            <span className="w-8 h-8 rounded-full bg-white/[0.04] grid place-items-center">
              <span className="material-symbols-outlined text-[18px]">add</span>
            </span>
            <span className="flex-1">
              <span className="block font-semibold">Make room for one more</span>
              <span className="block text-[10px] uppercase tracking-wider text-white/30">
                Coming soon
              </span>
            </span>
          </button>
        </aside>

        {/* Main panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeId}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <GlassCard variant="default" className="rounded-3xl p-7 lg:p-8">
              {/* Member header */}
              <div className="flex flex-col gap-5 pb-7 mb-7 border-b border-white/[0.06]">
                <div className="flex items-center gap-5">
                  <span className="animate-pulse-soft">
                    <MemberAvatar id={member.id} size="xl" status="online" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-2xl font-bold font-[var(--font-headline)] text-white">
                      {member.name}
                    </h2>
                    <p
                      className="text-sm font-semibold mt-0.5"
                      style={{ color: color.hex }}
                    >
                      {member.role}
                    </p>
                    <p className="text-xs text-white/55 mt-1.5 max-w-md leading-relaxed">
                      {apiActive?.one_liner ?? member.shortBio}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-white/45 italic">
                  &ldquo;{member.signatureGreeting}&rdquo;
                </p>

                {expertise.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.32em] font-[var(--font-label)] font-semibold text-white/45 mb-2">
                      Knows their stuff
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {expertise.map((area) => (
                        <span
                          key={area}
                          className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-[var(--font-label)]"
                          style={{
                            background: color.soft,
                            color: color.hex,
                            border: `1px solid ${color.soft}`,
                          }}
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* How they're wired */}
              <section className="grid lg:grid-cols-[1fr_220px] gap-8 mb-9">
                <div>
                  <h3 className="text-lg font-bold font-[var(--font-headline)] text-white mb-1">
                    How they&rsquo;re wired
                  </h3>
                  <p className="text-xs text-white/45 mb-5">
                    Drag to shape how {member.name} thinks and shows up for you.
                  </p>
                  <div className="space-y-5">
                    {TRAIT_ORDER.map((dim) => (
                      <TraitSlider
                        key={dim}
                        memberId={activeId}
                        dimension={dim}
                        value={config.traits[dim]}
                        onChange={(v) => updateTrait(dim, v)}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[11px] uppercase tracking-[0.32em] font-[var(--font-label)] font-semibold text-white/45">
                    Voice preview
                  </h4>
                  <VoicePreview memberId={activeId} config={config} />
                  <p className="text-[11px] text-white/45 leading-relaxed">
                    How {member.name} will likely sound — louder when outgoing,
                    smoother when warm, more textured when curious.
                  </p>
                </div>
              </section>

              {/* How they talk to you */}
              <section className="mb-9">
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="text-lg font-bold font-[var(--font-headline)] text-white">
                    How they talk to you
                  </h3>
                  <span className="text-[11px] text-white/45 font-[var(--font-label)]">
                    Pick up to {MAX_TONES}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {TONE_OPTIONS.map((tone) => {
                    const active = config.tones.includes(tone.id);
                    return (
                      <button
                        key={tone.id}
                        type="button"
                        onClick={() => toggleTone(tone.id)}
                        aria-pressed={active}
                        className="px-4 py-2 rounded-full text-xs font-semibold inline-flex items-center gap-2 border transition-all hover:scale-[1.02]"
                        style={
                          active
                            ? {
                                background: color.soft,
                                borderColor: color.hex,
                                color: color.hex,
                              }
                            : {
                                background: "rgba(255,255,255,0.03)",
                                borderColor: "rgba(255,255,255,0.06)",
                                color: "rgba(255,255,255,0.65)",
                              }
                        }
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {tone.icon}
                        </span>
                        {tone.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* House rules */}
              <section className="mb-8">
                <h3 className="text-lg font-bold font-[var(--font-headline)] text-white mb-1">
                  House rules
                </h3>
                <p className="text-xs text-white/45 mb-4">
                  Things {member.name} will always honour with you.
                </p>
                <div className="space-y-2.5">
                  {(
                    Object.entries(BOUNDARY_LABELS) as Array<[
                      Boundary,
                      (typeof BOUNDARY_LABELS)[Boundary],
                    ]>
                  ).map(([key, info]) => (
                    <BoundaryToggle
                      key={key}
                      active={config.boundaries[key]}
                      label={info.label}
                      hint={info.hint}
                      color={color.hex}
                      onToggle={() => toggleBoundary(key)}
                    />
                  ))}
                </div>
              </section>

              {/* Footer */}
              <footer className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-3 pt-6 border-t border-white/[0.06]">
                {statusMsg && (
                  <p role="status" className="text-xs text-white/55 sm:mr-auto">
                    {statusMsg}
                  </p>
                )}
                <AuroraButton
                  variant="ghost"
                  size="md"
                  onClick={resetMember}
                  icon={
                    <span className="material-symbols-outlined text-[18px]">
                      refresh
                    </span>
                  }
                >
                  Back to how they were
                </AuroraButton>
                <AuroraButton
                  variant="primary"
                  size="md"
                  onClick={() => void saveMember()}
                  disabled={saving || !memberMap[activeId]}
                  icon={
                    <span className="material-symbols-outlined text-[18px]">
                      check
                    </span>
                  }
                >
                  {saving ? "Saving…" : "Save changes"}
                </AuroraButton>
              </footer>
            </GlassCard>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ------------------------------- helpers ----------------------------------- */

function structuredCloneOrFallback<T>(input: T): T {
  if (typeof structuredClone === "function") return structuredClone(input);
  return JSON.parse(JSON.stringify(input));
}
