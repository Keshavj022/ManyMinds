"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import GatedCanvas from "@/components/three/canvas/GatedCanvas";
import JourneyScene from "@/components/three/journey/JourneyScene";
import {
  ACT_BOUNDS,
  actAt,
  actLocal,
  BOOT_DURATION,
  BOOT_LINES,
  BOOT_LINE_INTERVAL,
  type JourneyActState,
} from "@/components/three/journey/timeline";
import JourneyBootFrame from "./JourneyBootFrame";
import {
  ActTitleChip,
  CouncilChatterBubble,
  DebateBubbles,
  FallCaption,
  FinaleCTA,
  GamesChatPanel,
  ProgressRail,
  ramp,
  type GroundAct,
} from "./JourneyOverlays";

/**
 * JourneyHero — the React shell for "The Journey", the one persistent
 * cinematic that replaced CouncilHero, DebateScene and GamesScene.
 *
 * ONE sticky 100vh canvas pinned across a 1600vh section. The scene does all
 * the travelling (cyber platform → fall through 7 stacked worlds → café
 * council → debate stage → games lounge → finale pull-back); this shell owns
 *   • the master scroll progress (rect-based, coalesced into one rAF),
 *   • the boot terminal timer (BOOT_LINES revealed every BOOT_LINE_INTERVAL),
 *   • every HTML overlay, with fade bands computed from timeline.ts so the
 *     copy and the 3D camera can never drift apart.
 *
 * The scene reports discrete beats (act, world index, debate round, chat
 * count, council speaker) through onActState — cheap React state, since it
 * only changes on transitions.
 *
 * prefers-reduced-motion: no scrub, no timers — the canvas renders its static
 * seated council and the finale CTA card is shown immediately.
 */

const INITIAL_ACT_STATE: JourneyActState = {
  act: "boot",
  worldIndex: 0,
  debateRound: -1,
  gameChatCount: 0,
  councilSpeaker: null,
};

/** Acts that get an introductory title chip, for the first ~35% of the act. */
function titleChipFor(p: number): GroundAct | null {
  const act = actAt(p);
  if (
    act === "council" ||
    act === "debate" ||
    act === "games" ||
    act === "finale"
  ) {
    return actLocal(p, act) < 0.35 ? act : null;
  }
  return null;
}

export default function JourneyHero() {
  const containerRef = useRef<HTMLElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [actState, setActState] = useState<JourneyActState>(INITIAL_ACT_STATE);
  const [bootPhase, setBootPhase] = useState<"boot" | "wave">("boot");
  const [bootLineCount, setBootLineCount] = useState(1);
  // True once the 3D scene has committed (its first onActState report). The
  // scene mounts behind GatedCanvas's Suspense, blocked on 5 GLB + 12 FBX
  // downloads — gating the terminal on this keeps the "linking aria.glb [OK]"
  // theater honest on a cold cache instead of typing over an empty void.
  const [sceneReady, setSceneReady] = useState(false);
  const sceneReadyRef = useRef(false);
  // ssr:false component — safe to read the media query during first render,
  // which avoids one painted frame of overlays for reduced-motion users.
  const [reduced] = useState(
    () =>
      typeof window !== "undefined" &&
      !!window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const rafRef = useRef<number>(0);

  // Boot terminal — the shell owns its own timer, started only once the scene
  // is live so the terminal lines and the 3D materializations stay in sync.
  useEffect(() => {
    if (reduced || !sceneReady) return;
    let revealed = 1;
    const lineTimer = setInterval(() => {
      revealed = Math.min(revealed + 1, BOOT_LINES.length);
      setBootLineCount(revealed);
      if (revealed >= BOOT_LINES.length) clearInterval(lineTimer);
    }, BOOT_LINE_INTERVAL * 1000);
    const waveTimer = setTimeout(
      () => setBootPhase("wave"),
      BOOT_DURATION * 1000,
    );
    return () => {
      clearInterval(lineTimer);
      clearTimeout(waveTimer);
    };
  }, [reduced, sceneReady]);

  // Window-scroll listener — coalesced through one rAF, passive. Lenis is
  // mounted at the page root, so its smoothing applies automatically.
  useEffect(() => {
    if (reduced) return;
    let pending = false;
    const handleScroll = () => {
      if (!containerRef.current || pending) return;
      pending = true;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        pending = false;
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const scrollable = el.offsetHeight - window.innerHeight;
        if (scrollable <= 0) return;
        const p = Math.max(0, Math.min(1, -rect.top / scrollable));
        setScrollProgress(p);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Resize / rotation / mobile URL-bar collapse all shift rect.top and the
    // viewport height without a scroll event — recompute on those too.
    window.addEventListener("resize", handleScroll);
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [reduced]);

  // Discrete beats from the scene. Guarded so identical reports are free.
  // The very first report doubles as the "scene is live" signal.
  const handleActState = useCallback((s: JourneyActState) => {
    if (!sceneReadyRef.current) {
      sceneReadyRef.current = true;
      setSceneReady(true);
    }
    setActState((prev) =>
      prev.act === s.act &&
      prev.worldIndex === s.worldIndex &&
      prev.debateRound === s.debateRound &&
      prev.gameChatCount === s.gameChatCount &&
      prev.councilSpeaker === s.councilSpeaker
        ? prev
        : s,
    );
  }, []);

  // === Overlay fade bands — all derived from timeline.ts ACT_BOUNDS ========
  const p = scrollProgress;
  const scrollAct = actAt(p);
  const breakoutProgress = ramp(p, 0, ACT_BOUNDS.breakoutEnd);

  // Fall captions: in just after the fall starts, out before it ends.
  const fallOpacity =
    ramp(p, ACT_BOUNDS.breakoutEnd + 0.02, ACT_BOUNDS.breakoutEnd + 0.05) *
    (1 - ramp(p, ACT_BOUNDS.fallEnd - 0.07, ACT_BOUNDS.fallEnd - 0.03));

  // Games chat panel: in at games start, fully out BEFORE the act boundary —
  // the scene zeroes gameChatCount the instant the finale begins, so the
  // panel must never outlive its contents as an empty shell.
  const gamesPanelOpacity =
    ramp(p, ACT_BOUNDS.glide2End, ACT_BOUNDS.glide2End + 0.015) *
    (1 - ramp(p, ACT_BOUNDS.gamesEnd - 0.012, ACT_BOUNDS.gamesEnd));

  // Finale CTA: fades in across the first half of the finale act.
  const finaleOpacity = ramp(
    p,
    ACT_BOUNDS.gamesEnd,
    ACT_BOUNDS.gamesEnd + (1 - ACT_BOUNDS.gamesEnd) / 2,
  );

  const chipAct = titleChipFor(p);
  const councilSpeaker =
    scrollAct === "council" ? actState.councilSpeaker : null;
  const debateRound = scrollAct === "debate" ? actState.debateRound : -1;

  return (
    <section
      ref={containerRef}
      id="council-journey"
      // Reduced-motion gets a single static screen, not 16 viewports of it.
      className={`relative w-full ${reduced ? "h-screen" : "h-[1600vh]"}`}
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        <GatedCanvas
          camera={{ position: [0, 155.6, 9.5], fov: 50 }}
          className="absolute inset-0"
          rootMargin="600px 0px"
        >
          <JourneyScene progress={scrollProgress} onActState={handleActState} />
        </GatedCanvas>

        {reduced ? (
          // Static frame: seated council in the scene + the CTA, nothing else.
          <FinaleCTA opacity={1} />
        ) : (
          <>
            {/* a) CRT boot frame — shatters across the breakout */}
            {breakoutProgress < 1 && (
              <JourneyBootFrame
                phase={bootPhase}
                visibleLineCount={bootLineCount}
                breakoutProgress={breakoutProgress}
              />
            )}

            {/* b) "Falling through · <World>" captions */}
            <FallCaption opacity={fallOpacity} worldIndex={actState.worldIndex} />

            {/* c) Act title chips — flow between ground acts */}
            <ActTitleChip act={chipAct} />

            {/* d) Council table chatter */}
            <CouncilChatterBubble speaker={councilSpeaker} />

            {/* e) Debate speech bubbles + round dots */}
            <DebateBubbles round={debateRound} reduced={false} />

            {/* f) Games lounge chat panel */}
            <GamesChatPanel
              opacity={gamesPanelOpacity}
              count={actState.gameChatCount}
            />

            {/* g) Finale CTA */}
            <FinaleCTA opacity={finaleOpacity} />

            {/* h) Journey progress rail */}
            <ProgressRail progress={p} />
          </>
        )}
      </div>
    </section>
  );
}
