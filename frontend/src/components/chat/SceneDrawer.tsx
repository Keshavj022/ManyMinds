"use client";

import { AnimatePresence, motion } from "framer-motion";
import ScenePane from "./ScenePane";
import type { EnvironmentId } from "@/lib/environments";
import type { CouncilMemberId } from "@/lib/design-tokens";

interface SceneDrawerProps {
  open: boolean;
  onClose: () => void;
  currentEnv: EnvironmentId;
  onChangeEnv: (id: EnvironmentId) => void;
  activeMemberId: CouncilMemberId | null;
}

/**
 * "Step inside" — the 3D room slides in as a generous overlay instead of
 * squeezing the conversation. The chat stays the main character.
 */
export default function SceneDrawer({
  open,
  onClose,
  currentEnv,
  onChangeEnv,
  activeMemberId,
}: SceneDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="scene-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            key="scene-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-0 bottom-0 w-full max-w-xl p-5 sm:p-6 bg-[#131017] border-l border-white/[0.06] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white font-[var(--font-headline)]">
                  The room
                </h3>
                <p className="text-[11px] tracking-[0.32em] uppercase font-[var(--font-label)] text-white/55 mt-0.5">
                  pick where you all hang out
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="back to the conversation"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <ScenePane
                currentEnv={currentEnv}
                onChangeEnv={onChangeEnv}
                activeMemberId={activeMemberId}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
