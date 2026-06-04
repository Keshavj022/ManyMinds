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
        setStatusMsg(
          err instanceof ApiError
            ? `Couldn't load council: ${err.message}`
            : "Couldn't load council.",
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
      setStatusMsg("Saved.");
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
    <div className="space-y-6 pb-6">
      {/* Page header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-[var(--font-headline)] text-white tracking-tight">
            Council configuration
          </h1>
          <p className="mt-2 text-sm md:text-base text-white/55 max-w-2xl">
            Fine-tune how each friend speaks with you. They&apos;ll still be themselves — you&apos;re just adjusting how loud, how warm, how challenging.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Member roster */}
        <aside className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-[0.22em] font-[var(--font-label)] font-semibold text-white/45 pl-2 mb-3">
            Active council
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
            className="w-full mt-4 flex items-center gap-3 p-3 rounded-2xl border border-dashed border-white/8 text-white/35 text-sm cursor-not-allowed"
          >
            <span className="w-8 h-8 rounded-full bg-white/[0.04] grid place-items-center">
              <span className="material-symbols-outlined text-[18px]">add</span>
            </span>
            <span className="flex-1">
              <span className="block font-semibold">Recruit a guest member</span>
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
            transition={{ duration: 0.3 }}
          >
            <GlassCard variant="default" className="rounded-3xl p-6 lg:p-8">
              {/* Member header */}
              <div className="flex flex-col md:flex-row md:items-center gap-5 pb-6 mb-6 border-b border-white/8">
                <div className="flex items-center gap-4">
                  <MemberAvatar id={member.id} size="xl" status="online" />
                  <div>
                    <h2 className="text-2xl font-bold font-[var(--font-headline)] text-white">
                      {member.name}
                    </h2>
                    <p
                      className="text-sm font-semibold mt-0.5"
                      style={{ color: color.hex }}
                    >
                      {member.role}
                    </p>
                    <p className="text-xs text-white/55 mt-1 max-w-md leading-snug">
                      {member.personality}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 md:ml-auto">
                  {member.personality.split(" · ").map((trait) => (
                    <span
                      key={trait}
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-[var(--font-label)]"
                      style={{
                        background: color.soft,
                        color: color.hex,
                        border: `1px solid ${color.soft}`,
                      }}
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>

              {/* Psych matrix */}
              <section className="grid lg:grid-cols-[1fr_220px] gap-8 mb-8">
                <div>
                  <h3 className="text-lg font-bold font-[var(--font-headline)] text-white mb-1">
                    Psychological matrix
                  </h3>
                  <p className="text-xs text-white/45 mb-5">
                    Drag to shape how {member.name} thinks and shows up.
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
                  <h4 className="text-[10px] uppercase tracking-[0.22em] font-[var(--font-label)] font-semibold text-white/45">
                    Voice preview
                  </h4>
                  <VoicePreview memberId={activeId} config={config} />
                  <p className="text-[11px] text-white/45 leading-snug">
                    How {member.name} will likely sound — louder when extraverted, smoother when warm, more textured when curious.
                  </p>
                </div>
              </section>

              {/* Tones */}
              <section className="mb-8">
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="text-lg font-bold font-[var(--font-headline)] text-white">
                    Tone preferences
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
                        className="px-4 py-2 rounded-full text-xs font-semibold inline-flex items-center gap-2 border transition-all"
                        style={
                          active
                            ? {
                                background: color.soft,
                                borderColor: color.hex,
                                color: color.hex,
                              }
                            : {
                                background: "rgba(255,255,255,0.03)",
                                borderColor: "rgba(255,255,255,0.08)",
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

              {/* Boundaries */}
              <section className="mb-8">
                <h3 className="text-lg font-bold font-[var(--font-headline)] text-white mb-3">
                  Boundaries
                </h3>
                <div className="space-y-2">
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
              <footer className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-3 pt-6 border-t border-white/8">
                {statusMsg && (
                  <p
                    role="status"
                    className="text-xs text-white/55 sm:mr-auto"
                  >
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
                  Reset to defaults
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

/* ----------------------------- helper widgets ------------------------------ */

function BoundaryToggle({
  active,
  label,
  hint,
  color,
  onToggle,
}: {
  active: boolean;
  label: string;
  hint: string;
  color: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className="w-full flex items-center gap-4 p-3 pl-4 rounded-2xl bg-white/[0.03] border border-white/8 hover:bg-white/[0.05] text-left transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-white/45 mt-0.5">{hint}</p>
      </div>
      <span
        className="relative inline-flex w-11 h-6 rounded-full shrink-0 transition-colors"
        style={{
          background: active ? color : "rgba(255,255,255,0.08)",
        }}
      >
        <motion.span
          animate={{ x: active ? 22 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-0.5 left-0 w-5 h-5 rounded-full bg-white shadow-md"
        />
      </span>
    </button>
  );
}

function structuredCloneOrFallback<T>(input: T): T {
  if (typeof structuredClone === "function") return structuredClone(input);
  return JSON.parse(JSON.stringify(input));
}
