"use client";

import { motion } from "framer-motion";
import MemberAvatar from "@/components/ui/MemberAvatar";
import type { CouncilStateRow, MemberStatus } from "@/lib/chat-fixtures";
import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";
import type { CouncilMemberId } from "@/lib/design-tokens";

interface CouncilRailProps {
  state: ReadonlyArray<CouncilStateRow>;
  mode: "group" | "one_on_one";
  /** The 1:1 partner when mode is one_on_one. */
  activeId: CouncilMemberId;
  onPick: (id: CouncilMemberId) => void;
  onEveryone: () => void;
  /** "side" = desktop right rail, "strip" = mobile top row. */
  variant: "side" | "strip";
}

function statusLabel(s: MemberStatus): string {
  switch (s) {
    case "talking":
      return "talking";
    case "typing":
      return "typing…";
    case "thinking":
      return "thinking…";
    default:
      return "here with you";
  }
}

function avatarStatus(s: MemberStatus): "online" | "talking" | "thinking" {
  if (s === "talking" || s === "typing") return "talking";
  if (s === "thinking") return "thinking";
  return "online";
}

export default function CouncilRail({
  state,
  mode,
  activeId,
  onPick,
  onEveryone,
  variant,
}: CouncilRailProps) {
  if (variant === "strip") {
    return (
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          type="button"
          onClick={onEveryone}
          className={`shrink-0 flex items-center gap-1.5 rounded-full pl-1.5 pr-3 py-1 border transition-all ${
            mode === "group"
              ? "border-white/20 bg-white/[0.08] text-white"
              : "border-white/[0.06] bg-white/[0.03] text-white/60 hover:text-white"
          }`}
        >
          <span className="flex -space-x-2">
            {COUNCIL_MEMBERS.slice(0, 3).map((m) => (
              <MemberAvatar key={m.id} id={m.id} size="xs" glow={false} />
            ))}
          </span>
          <span className="text-[11px] font-semibold">Everyone</span>
        </button>
        {state.map((row) => {
          const active = mode === "one_on_one" && activeId === row.id;
          const color = councilColors[row.id];
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => onPick(row.id)}
              className="shrink-0 rounded-full p-0.5 transition-transform active:scale-95"
              style={{
                boxShadow: active ? `0 0 0 1.5px ${color.hex}` : undefined,
              }}
              aria-label={`talk to ${row.id}`}
            >
              <MemberAvatar
                id={row.id}
                size="sm"
                status={avatarStatus(row.status)}
                glow={active}
                className={
                  row.status === "listening" ? "animate-pulse-soft" : undefined
                }
              />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="px-2 pb-1 text-[11px] tracking-[0.32em] uppercase font-[var(--font-label)] text-white/55">
        In the room
      </p>

      <motion.button
        type="button"
        onClick={onEveryone}
        whileHover={{ y: -2 }}
        className={`flex items-center gap-3 rounded-3xl px-3.5 py-3 border text-left transition-colors ${
          mode === "group"
            ? "border-white/[0.12] bg-white/[0.06]"
            : "border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05]"
        }`}
      >
        <span className="flex -space-x-2.5">
          {COUNCIL_MEMBERS.map((m) => (
            <MemberAvatar key={m.id} id={m.id} size="xs" glow={false} />
          ))}
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-xs font-bold text-white">Everyone</span>
          <span className="text-[10px] text-white/45">the whole room</span>
        </span>
      </motion.button>

      {state.map((row) => {
        const member = COUNCIL_MEMBERS.find((m) => m.id === row.id);
        const color = councilColors[row.id];
        const active = mode === "one_on_one" && activeId === row.id;
        const busyStatus = row.status !== "listening";

        return (
          <motion.button
            key={row.id}
            type="button"
            onClick={() => onPick(row.id)}
            whileHover={{ y: -2 }}
            className="flex items-center gap-3 rounded-3xl px-3.5 py-2.5 border text-left transition-colors"
            style={{
              background: active ? color.soft : "rgba(255,255,255,0.015)",
              borderColor: active ? `${color.hex}66` : "rgba(255,255,255,0.05)",
            }}
            title={active ? "tap to rejoin everyone" : `just you and ${member?.name}`}
          >
            <MemberAvatar
              id={row.id}
              size="md"
              status={avatarStatus(row.status)}
              glow={active}
              className={
                row.status === "listening" ? "animate-pulse-soft" : undefined
              }
            />
            <span className="flex flex-col leading-tight min-w-0">
              <span className="text-xs font-bold text-white">
                {member?.name ?? row.id}
              </span>
              <span
                className="text-[10px] truncate"
                style={{
                  color: busyStatus ? color.hex : "rgba(255,255,255,0.4)",
                }}
              >
                {active ? "just the two of you" : statusLabel(row.status)}
              </span>
            </span>
          </motion.button>
        );
      })}

      <p className="px-2 pt-2 text-[10px] leading-relaxed text-white/35">
        Tap a friend to slip into a side conversation.
      </p>
    </div>
  );
}
