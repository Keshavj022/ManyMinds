"use client";

import { motion } from "framer-motion";
import MemberAvatar from "@/components/ui/MemberAvatar";
import RoundIndicator from "./RoundIndicator";
import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";
import type { CouncilMemberId } from "@/lib/design-tokens";
import type { DebateArgument, DebateMotion } from "@/lib/debate-fixtures";

interface StageProps {
  motion: DebateMotion;
  currentRound: number;
  progress: number;
  upcoming: DebateArgument[];
  activeSpeakerId: CouncilMemberId | null;
  activeSide: "pro" | "con" | null;
}

export default function Stage({
  motion: m,
  currentRound,
  progress,
  upcoming,
  activeSpeakerId,
  activeSide,
}: StageProps) {
  const moderator = COUNCIL_MEMBERS.find((c) => c.id === m.moderatorId);
  const proPanel = m.proMembers;
  const conPanel = m.conMembers;

  return (
    <div className="relative h-full flex flex-col items-center text-center px-3">
      {/* Pro panel — top */}
      <SidePanel
        side="pro"
        members={proPanel}
        active={activeSide === "pro" ? activeSpeakerId : null}
      />

      {/* Divider */}
      <Divider />

      {/* Moderator */}
      <div className="flex flex-col items-center gap-3 py-4">
        <p className="text-[10px] uppercase tracking-[0.4em] aurora-text font-bold font-[var(--font-label)]">
          Moderator
        </p>
        <MemberAvatar
          id={m.moderatorId}
          size="xl"
          status={activeSide === null ? "talking" : "online"}
        />
        <div>
          <p
            className="text-sm font-bold"
            style={{ color: councilColors[m.moderatorId].hex }}
          >
            {moderator?.name}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-white/45 font-[var(--font-label)]">
            {moderator?.role}
          </p>
        </div>
        <RoundIndicator
          round={currentRound}
          totalRounds={m.rounds}
          progress={progress}
        />
        <SpeakerQueue queue={upcoming.slice(0, 3)} />
      </div>

      {/* Divider */}
      <Divider />

      {/* Con panel — bottom */}
      <SidePanel
        side="con"
        members={conPanel}
        active={activeSide === "con" ? activeSpeakerId : null}
      />
    </div>
  );
}

function SidePanel({
  side,
  members,
  active,
}: {
  side: "pro" | "con";
  members: ReadonlyArray<CouncilMemberId>;
  active: CouncilMemberId | null;
}) {
  const label = side === "pro" ? "PRO" : "CON";
  const labelColor = side === "pro" ? "#4ade80" : "#f87171";

  return (
    <div className="flex flex-col items-center py-3 gap-2">
      <span
        className="text-[10px] font-bold uppercase tracking-[0.5em]"
        style={{ color: labelColor }}
      >
        {label}
      </span>
      <div className="flex items-center gap-3">
        {members.map((id) => {
          const isActive = active === id;
          return (
            <motion.div
              key={id}
              animate={isActive ? { scale: 1.06 } : { scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <MemberAvatar
                id={id}
                size="lg"
                status={isActive ? "talking" : "online"}
                glow={isActive}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
  );
}

function SpeakerQueue({ queue }: { queue: DebateArgument[] }) {
  if (queue.length === 0) {
    return (
      <p className="text-[10px] text-white/35 uppercase tracking-wider font-[var(--font-label)]">
        floor open
      </p>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-[9px] text-white/35 uppercase tracking-[0.3em] font-[var(--font-label)]">
        next up
      </p>
      <div className="flex -space-x-2">
        {queue.map((q) => (
          <MemberAvatar key={q.id} id={q.speakerId} size="xs" />
        ))}
      </div>
    </div>
  );
}
