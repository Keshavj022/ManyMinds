"use client";

/**
 * SceneStageEmbed — dynamically imports the 3D team's <SceneStage /> with
 * ssr disabled and a graceful placeholder while it loads.
 *
 * Props are kept narrow to what the chat & debate pages need: env, the
 * speaker, embedded flag, and height. The 3D team's SceneStage supports
 * a wider surface — we don't propagate everything to keep this stable.
 */

import dynamic from "next/dynamic";
import type { CouncilMemberId } from "@/lib/design-tokens";
import { councilColors } from "@/lib/design-tokens";

type EnvId = "cafe" | "beach" | "library" | "rooftop" | "forest" | "mountain" | "zen";

interface Props {
  initialEnv?: EnvId;
  activeMemberId?: CouncilMemberId | null;
  embedded?: boolean;
  height?: string;
  /** Optional — purely decorative for the fallback placeholder. */
  mood?: string;
  /** Hide SceneStage's built-in env-switcher (we render our own). */
  showEnvSwitcher?: boolean;
}

/**
 * Lazy import so r3f never runs during SSR.
 *
 * NOTE: SceneStage from `@/components/three/SceneStage` does NOT take a
 * `mood` prop — we strip it before forwarding.
 */
const RemoteSceneStage = dynamic<Props>(
  async () => {
    const mod = await import("@/components/three/SceneStage");
    const Real = mod.default;
    const Wrapped = (props: Props) => {
      // SceneStage doesn't accept `mood` — drop it before forwarding.
      const { mood, ...rest } = props;
      void mood;
      return <Real {...rest} />;
    };
    Wrapped.displayName = "RemoteSceneStage";
    return Wrapped;
  },
  { ssr: false, loading: () => <SceneStageFallback /> },
);

function SceneStageFallback(props: Props = {}) {
  const { activeMemberId, height } = props;
  const accent = activeMemberId ? councilColors[activeMemberId].hex : "#9b87d8";
  const accentSoft = activeMemberId
    ? councilColors[activeMemberId].soft
    : "rgba(155,135,216,0.2)";

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{ height: height ?? "100%", minHeight: 240 }}
    >
      {/* background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 50% 30%, ${accentSoft}, transparent 70%),
            radial-gradient(ellipse 60% 60% at 30% 80%, rgba(216,163,184,0.18), transparent 70%),
            radial-gradient(ellipse 60% 60% at 80% 80%, rgba(127,181,212,0.12), transparent 70%),
            #08070d
          `,
        }}
      />
      <div className="absolute inset-0 dot-grid opacity-50" />
      <div className="absolute inset-0 noise opacity-30" />

      {/* faint horizon line */}
      <div
        className="absolute left-0 right-0 top-2/3 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}66, transparent)`,
        }}
      />

      {/* council orbiting "dots" — decorative until the canvas lands */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-44 h-44 rounded-full border border-white/10">
          <div
            className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full animate-pulse-soft"
            style={{ background: councilColors.aria.hex, boxShadow: `0 0 12px ${councilColors.aria.hex}` }}
          />
          <div
            className="absolute top-1/4 -right-1.5 w-3 h-3 rounded-full animate-pulse-soft"
            style={{ background: councilColors.rex.hex, boxShadow: `0 0 12px ${councilColors.rex.hex}` }}
          />
          <div
            className="absolute -bottom-1.5 right-1/4 w-3 h-3 rounded-full animate-pulse-soft"
            style={{ background: councilColors.sage.hex, boxShadow: `0 0 12px ${councilColors.sage.hex}` }}
          />
          <div
            className="absolute -bottom-1.5 left-1/4 w-3 h-3 rounded-full animate-pulse-soft"
            style={{ background: councilColors.nova.hex, boxShadow: `0 0 12px ${councilColors.nova.hex}` }}
          />
          <div
            className="absolute top-1/4 -left-1.5 w-3 h-3 rounded-full animate-pulse-soft"
            style={{ background: councilColors.echo.hex, boxShadow: `0 0 12px ${councilColors.echo.hex}` }}
          />
          <div
            className="absolute inset-4 rounded-full animate-pulse-soft"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${accentSoft}, transparent 70%)`,
            }}
          />
        </div>
      </div>

      {/* copy */}
      <div className="absolute inset-x-0 bottom-6 flex flex-col items-center text-center px-6">
        <p className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-[var(--font-label)]">
          walking into the room
        </p>
        <p className="text-sm text-white/70 mt-2 max-w-xs">
          The council is taking their seats. The room loads with them.
        </p>
      </div>
    </div>
  );
}

export default function SceneStageEmbed(props: Props) {
  return <RemoteSceneStage {...props} />;
}
