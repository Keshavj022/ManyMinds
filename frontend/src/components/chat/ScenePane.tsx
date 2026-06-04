"use client";

import EnvironmentChip from "@/components/ui/EnvironmentChip";
import SceneStageEmbed from "./SceneStageEmbed";
import { ENVIRONMENTS, type EnvironmentId } from "@/lib/environments";
import type { CouncilMemberId } from "@/lib/design-tokens";

interface ScenePaneProps {
  currentEnv: EnvironmentId;
  onChangeEnv: (id: EnvironmentId) => void;
  activeMemberId: CouncilMemberId | null;
  /** No longer used — SceneStage now has its own working pop-out button. */
  onPopOut?: () => void;
}

export default function ScenePane({
  currentEnv,
  onChangeEnv,
  activeMemberId,
}: ScenePaneProps) {
  const env = ENVIRONMENTS.find((e) => e.id === currentEnv) ?? ENVIRONMENTS[0];

  return (
    <div className="flex flex-col h-full">
      <div className="relative flex-1 overflow-hidden rounded-3xl border border-white/5 bg-white/[0.01]">
        <SceneStageEmbed
          initialEnv={
            currentEnv as
              | "cafe"
              | "beach"
              | "library"
              | "rooftop"
              | "forest"
              | "mountain"
              | "zen"
          }
          activeMemberId={activeMemberId}
          embedded
          height="100%"
          mood={env.mood}
          showEnvSwitcher={false}
        />

        {/* mood badge */}
        <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/45 backdrop-blur-md border border-white/10 text-white/80">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "#7fb5d4" }}
          />
          {env.name} · {env.mood}
        </div>
      </div>

      {/* environment switcher */}
      <div className="mt-3 flex flex-wrap items-center gap-2 justify-center">
        {ENVIRONMENTS.map((e) => (
          <EnvironmentChip
            key={e.id}
            id={e.id}
            name={e.name}
            icon={e.icon}
            mood={e.mood}
            active={e.id === currentEnv}
            onClick={() => onChangeEnv(e.id as EnvironmentId)}
          />
        ))}
      </div>
    </div>
  );
}
