"use client";

import { motion } from "framer-motion";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";
import type { CouncilMemberId } from "@/lib/design-tokens";
import type { DebateMotion } from "@/lib/debate-fixtures";
import { SIDE, type SideKey } from "./palette";

interface TeamCardsProps {
  motion: DebateMotion;
  activeSpeakerId: CouncilMemberId | null;
  activeSide: SideKey | null;
}

function nameOf(id: CouncilMemberId): string {
  return COUNCIL_MEMBERS.find((m) => m.id === id)?.name ?? id;
}

/**
 * The stage strip — Pro on the left in cool sky light, Con on the right
 * by the amber lamp, the moderator keeping the peace in between.
 */
export default function TeamCards({
  motion: m,
  activeSpeakerId,
  activeSide,
}: TeamCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
      <TeamCard
        side="pro"
        members={m.proMembers}
        quip="Making the case."
        active={activeSide === "pro" ? activeSpeakerId : null}
      />
      <Moderator id={m.moderatorId} quiet={activeSide === null} />
      <TeamCard
        side="con"
        members={m.conMembers}
        quip="Not having it."
        active={activeSide === "con" ? activeSpeakerId : null}
      />
    </div>
  );
}

function TeamCard({
  side,
  members,
  quip,
  active,
}: {
  side: SideKey;
  members: ReadonlyArray<CouncilMemberId>;
  quip: string;
  active: CouncilMemberId | null;
}) {
  const s = SIDE[side];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-3xl p-6 border border-white/[0.06] backdrop-blur-md flex flex-col gap-4"
      style={{
        background: `linear-gradient(${side === "pro" ? "135deg" : "225deg"}, ${s.soft}, rgba(26,22,32,0.72))`,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: s.hex }}
        />
        <span
          className="text-[11px] tracking-[0.32em] uppercase font-[var(--font-label)] font-semibold"
          style={{ color: s.hex }}
        >
          {s.label}
        </span>
      </div>
      <div className="flex items-center gap-5">
        {members.map((id) => {
          const isActive = active === id;
          return (
            <motion.div
              key={id}
              className="flex flex-col items-center gap-1.5"
              animate={{ scale: isActive ? 1.06 : 1, y: isActive ? -2 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
            >
              <span className={isActive ? "" : "animate-pulse-soft"}>
                <MemberAvatar
                  id={id}
                  size="lg"
                  status={isActive ? "talking" : "online"}
                  glow={isActive}
                />
              </span>
              <span
                className="text-xs font-semibold"
                style={{ color: councilColors[id].hex }}
              >
                {nameOf(id)}
              </span>
            </motion.div>
          );
        })}
      </div>
      <p className="text-xs text-white/45 mt-auto">{quip}</p>
    </motion.div>
  );
}

function Moderator({ id, quiet }: { id: CouncilMemberId; quiet: boolean }) {
  const member = COUNCIL_MEMBERS.find((m) => m.id === id);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center gap-2.5 px-6 py-4 text-center"
    >
      <span className="text-[11px] tracking-[0.32em] uppercase font-[var(--font-label)] text-white/55">
        Keeping it fair
      </span>
      <span className="animate-pulse-soft">
        <MemberAvatar id={id} size="xl" status={quiet ? "talking" : "online"} />
      </span>
      <div className="leading-tight">
        <p
          className="text-sm font-bold"
          style={{ color: councilColors[id].hex }}
        >
          {member?.name}
        </p>
        <p className="text-[11px] text-white/45 mt-0.5">{member?.role}</p>
      </div>
    </motion.div>
  );
}
