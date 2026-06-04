"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import EnvironmentScene, {
  type EnvironmentId,
  type MoodId,
  type CameraPreset,
  type EnvironmentMemberSpec,
} from "./EnvironmentScene";
import EnvironmentChip from "../ui/EnvironmentChip";
import type { CouncilMemberId } from "./positions";

export interface SceneStageProps {
  /** Which env to start in. Defaults to cafe. */
  initialEnv?: EnvironmentId;
  /** Show env-switching chips. Defaults to true. */
  showEnvSwitcher?: boolean;
  /** Active speaker — passed through to the scene. */
  activeMemberId?: CouncilMemberId | null;
  /** Currently thinking members — passed through to the scene. */
  thinkingIds?: CouncilMemberId[];
  /** When embedded inside chat / debate / games, set true for tighter framing. */
  embedded?: boolean;
  /** Stage height. Defaults to "70vh" if not embedded, "100%" if embedded. */
  height?: string;
  /** Camera preset (forwarded). */
  cameraPreset?: CameraPreset;
  /** Member positions (forwarded). */
  members?: EnvironmentMemberSpec[];
  /** Class applied to the wrapping div. */
  className?: string;
  /** Render a "pop out to fullscreen" button. Defaults to true. */
  showPopOut?: boolean;
}

interface EnvOption {
  id: EnvironmentId;
  name: string;
  icon: string;
  mood: MoodId;
}

const ENV_OPTIONS: EnvOption[] = [
  { id: "cafe",     name: "Cafe",     icon: "local_cafe",   mood: "cozy"      },
  { id: "library",  name: "Library",  icon: "menu_book",    mood: "focused"   },
  { id: "beach",    name: "Beach",    icon: "beach_access", mood: "calm"      },
  { id: "rooftop",  name: "Rooftop",  icon: "nightlife",    mood: "energetic" },
  { id: "forest",   name: "Forest",   icon: "park",         mood: "peaceful"  },
  { id: "mountain", name: "Mountain", icon: "filter_hdr",   mood: "crisp"     },
  { id: "zen",      name: "Zen",      icon: "spa",          mood: "serene"    },
];

/**
 * SceneStage is the canonical wrapper around `EnvironmentScene` for embedding
 * the 3D council into chat, debate, and game pages.
 *
 *   <SceneStage initialEnv="cafe" embedded />
 *
 * Features:
 *   • Glass-bordered, rounded container.
 *   • Env-switcher chips along the bottom (optional).
 *   • Pop-out button → fullscreen modal with the same scene at viewport size.
 *   • Visual-only audio toggle (ambient sound TBD).
 *   • Polished Suspense loading state ("Walking in…").
 */
export default function SceneStage({
  initialEnv = "cafe",
  showEnvSwitcher = true,
  activeMemberId = null,
  thinkingIds = [],
  embedded = false,
  height,
  cameraPreset = "overview",
  members,
  className = "",
  showPopOut = true,
}: SceneStageProps) {
  const [env, setEnv] = useState<EnvironmentId>(initialEnv);
  const [audioOn, setAudioOn] = useState(false);
  const [popOut, setPopOut] = useState(false);

  // Keep the internal env in sync when a parent drives it via `initialEnv`.
  // The chat ScenePane hides our own switcher (showEnvSwitcher={false}) and
  // controls the environment through the global EnvironmentProvider — without
  // this, prop changes were dropped and only the first env ever rendered.
  useEffect(() => {
    setEnv(initialEnv);
  }, [initialEnv]);

  const resolvedHeight = height ?? (embedded ? "100%" : "70vh");

  // Close on Escape; lock body scroll while open.
  useEffect(() => {
    if (!popOut) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPopOut(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [popOut]);

  const handleClosePopOut = useCallback(() => setPopOut(false), []);

  // The inner stage — used both in-place and inside the fullscreen modal.
  // Each mount creates its own <Canvas>; r3f doesn't support re-parenting
  // a canvas across React trees, so we accept two canvases (preloaded GLBs
  // are cached at the drei layer so the second mount is fast).
  const renderStage = (insideModal: boolean) => (
    <div
      className={`relative w-full overflow-hidden ${
        insideModal ? "rounded-none" : "rounded-3xl glass border-aurora"
      } ${insideModal ? "" : className}`}
      style={{ height: insideModal ? "100%" : resolvedHeight }}
    >
      <Suspense fallback={<WalkingInOverlay />}>
        <EnvironmentScene
          env={env}
          members={members}
          activeMemberId={activeMemberId}
          thinkingIds={thinkingIds}
          cameraPreset={cameraPreset}
          className="!absolute inset-0"
        />
      </Suspense>

      {/* Top-right controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setAudioOn((a) => !a)}
          aria-label={audioOn ? "Mute ambient" : "Unmute ambient"}
          className="w-9 h-9 rounded-full glass-strong flex items-center justify-center text-white/80 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">
            {audioOn ? "volume_up" : "volume_off"}
          </span>
        </button>
        {showPopOut && !insideModal && (
          <button
            type="button"
            onClick={() => setPopOut(true)}
            aria-label="Pop out to fullscreen"
            title="Pop out (Esc to close)"
            className="w-9 h-9 rounded-full glass-strong flex items-center justify-center text-white/80 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">open_in_full</span>
          </button>
        )}
        {insideModal && (
          <button
            type="button"
            onClick={handleClosePopOut}
            aria-label="Close fullscreen"
            title="Close (Esc)"
            className="w-9 h-9 rounded-full glass-strong flex items-center justify-center text-white/80 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close_fullscreen</span>
          </button>
        )}
      </div>

      {/* Top-left — current env label inside the modal so it's clear what's on */}
      {insideModal && (
        <div className="absolute top-4 left-4 z-10">
          <div className="glass-strong rounded-full px-4 py-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-white/75">
              {ENV_OPTIONS.find((o) => o.id === env)?.icon ?? "scene"}
            </span>
            <span className="text-xs font-semibold text-white">
              {ENV_OPTIONS.find((o) => o.id === env)?.name ?? env}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-white/45 font-[var(--font-label)]">
              {ENV_OPTIONS.find((o) => o.id === env)?.mood}
            </span>
          </div>
        </div>
      )}

      {/* Bottom: env switcher */}
      {showEnvSwitcher && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <div className="glass-strong rounded-full px-3 py-2 flex items-center gap-2 flex-wrap justify-center max-w-[min(92vw,640px)]">
            {ENV_OPTIONS.map((opt) => (
              <EnvironmentChip
                key={opt.id}
                id={opt.id}
                name={opt.name}
                icon={opt.icon}
                mood={opt.mood}
                active={opt.id === env}
                onClick={() => setEnv(opt.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {renderStage(false)}

      {/* Fullscreen pop-out — rendered as a sibling so it can take the whole viewport. */}
      {popOut && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Council scene — fullscreen view"
          className="fixed inset-0 z-[100] bg-[#08070d]/95 backdrop-blur-xl flex items-center justify-center p-0 sm:p-4 animate-[fadein_220ms_ease-out_forwards]"
          style={{
            animation: "popout-fade 220ms ease-out forwards",
          }}
          onClick={(e) => {
            // Clicking the backdrop closes, but clicks inside the stage don't.
            if (e.target === e.currentTarget) handleClosePopOut();
          }}
        >
          <div className="relative w-full h-full max-w-[1600px] max-h-[100vh] sm:rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.6)]">
            {renderStage(true)}
          </div>

          {/* Subtle Esc hint at the bottom */}
          <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] font-[var(--font-label)] text-white/35">
            Press Esc to close
          </div>

          <style jsx>{`
            @keyframes popout-fade {
              from {
                opacity: 0;
                transform: scale(0.985);
              }
              to {
                opacity: 1;
                transform: scale(1);
              }
            }
          `}</style>
        </div>
      )}
    </>
  );
}

function WalkingInOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center glass-strong">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <div className="absolute inset-0 rounded-full border-2 border-t-white animate-spin" />
          <div className="absolute inset-2 rounded-full aurora-gradient opacity-50 animate-pulse-soft" />
        </div>
        <p className="text-white/70 font-[var(--font-label)] text-xs tracking-[0.25em] uppercase">
          Walking in…
        </p>
      </div>
    </div>
  );
}
