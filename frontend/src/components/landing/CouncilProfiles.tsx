"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import GatedCanvas from "@/components/three/canvas/GatedCanvas";
import SectionHeader from "@/components/ui/SectionHeader";
import AuroraButton from "@/components/ui/AuroraButton";
import CouncilMember3D, {
  type CouncilMemberAnimation,
} from "@/components/three/CouncilMember3D";
import {
  COUNCIL_MEMBERS,
  councilColors,
  type CouncilMemberId,
} from "@/lib/design-tokens";

/**
 * "The Council" landing section — the one stage on the page that wants the
 * mouse. The founder loves the cinematic hover: you sweep over a CHARACTER
 * (not a card) and the lighting rig responds like a film set —
 *
 *   • a translucent volumetric spotlight cone blooms above them,
 *   • their per-member coloured spotLight lifts to full intensity,
 *   • the rest of the lineup dims so the focus is unmistakable,
 *   • their floor halo brightens in their signature hue,
 *   • the model steps forward, lifts, scales up, crossfades idle → talking,
 *   • a rich bio panel slides in below the stage; an idle hint when nobody's up.
 *
 * Smoothness contract:
 *   • Every lighting / colour / transform change is DAMPED inside useFrame
 *     (half-life ~0.18s) so transitions read like a stage cue, never a snap.
 *   • activeIndex is discrete React state — fine, it only changes on hover.
 *   • Rendered through the shared GatedCanvas (interactive=true): when this
 *     section scrolls off-screen the render loop drops to "demand" and the
 *     GPU goes idle. GatedCanvas already supplies AdaptiveDpr / AdaptiveEvents
 *     / Suspense / Preload / clamped DPR / PCF shadows, so we add none of that.
 */

// --------------------------------------------------------------------------
// Per-member metadata
// --------------------------------------------------------------------------

const TRAITS_BY_ID: Record<CouncilMemberId, ReadonlyArray<string>> = {
  aria: ["Logical", "Precise", "Cool-headed"],
  rex: ["Bold", "Playful", "Contrarian"],
  sage: ["Strategic", "Visionary", "Calm"],
  nova: ["Imaginative", "Expressive", "Intuitive"],
  echo: ["Perceptive", "Warm", "Reflective"],
};

const TALKING_VARIANTS: Record<CouncilMemberId, 0 | 1 | 2> = {
  aria: 0,
  rex: 2,
  sage: 1,
  nova: 2,
  echo: 0,
};

// A dwell reaction fired ~1.6s after a member is held under the light, giving
// the personality a beat to land. Skipped under prefers-reduced-motion.
const REACTION_BY_ID: Record<CouncilMemberId, CouncilMemberAnimation | null> = {
  aria: null,
  rex: "laughing",
  sage: null,
  nova: "laughing",
  echo: null,
};

// Stage layout — wide spread so each character owns its own column of light.
const LINE_SPACING = 2.7;
const LINE_Z = 3.4;
const MEMBER_SCALE = 1.6;
const ACTIVE_LIFT_Y = 0.06;
const ACTIVE_STEP_Z = 0.3;

// Lighting tiers (per-member coloured accent spot, on top of the unified rig).
const IDLE_SPOT_INTENSITY = 0.55;
const DIM_SPOT_INTENSITY = 0.18;
const ACTIVE_SPOT_INTENSITY = 2.3;
const IDLE_HALO_OPACITY = 0.14;
const ACTIVE_HALO_OPACITY = 0.55;
const ACTIVE_CONE_OPACITY = 0.22;

// Damping half-life (seconds). Reduced-motion shortens it so the still snaps
// in quickly instead of drifting.
const HALF_LIFE = 0.18;
const HALF_LIFE_REDUCED = 0.05;

function makeDamp(halfLife: number) {
  return (current: number, target: number, dt: number): number => {
    const k = 1 - Math.pow(0.5, dt / halfLife);
    return current + (target - current) * k;
  };
}

// --------------------------------------------------------------------------
// Unified character lighting — mounted ONCE so all five read consistently.
// The per-member coloured spotLight (in MemberStage) is the hover accent
// layered on top of this neutral rig.
// --------------------------------------------------------------------------

function StageRig() {
  return (
    <>
      {/* Soft global ambient so silhouettes never go fully black when dimmed. */}
      <ambientLight intensity={0.42} />
      {/* Warm key from front-right. */}
      <directionalLight
        position={[5, 8, 7]}
        intensity={0.85}
        color="#fff1e0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      {/* Cool fill from front-left, no shadow. */}
      <directionalLight position={[-5, 5, 6]} intensity={0.4} color="#9bb8d8" />
      {/* Cool rim from behind to carve the silhouettes off the dark stage. */}
      <directionalLight position={[-3, 6, -6]} intensity={0.45} color="#9b87d8" />

      <ContactShadows
        position={[0, 0.002, LINE_Z]}
        opacity={0.5}
        scale={22}
        blur={2.6}
        far={3}
      />
    </>
  );
}

// --------------------------------------------------------------------------
// Inner scene
// --------------------------------------------------------------------------

interface CouncilLineupProps {
  activeIndex: number | null;
  reactionLabel: CouncilMemberAnimation | null;
  reduced: boolean;
  onHover: (index: number | null) => void;
}

function CouncilLineup({
  activeIndex,
  reactionLabel,
  reduced,
  onHover,
}: CouncilLineupProps) {
  const count = COUNCIL_MEMBERS.length;
  const someoneActive = activeIndex !== null;

  return (
    // onPointerMissed lives on the scene root group — clicking/tapping empty
    // stage clears the active member. (GatedCanvas owns the <Canvas>, so we
    // wire deselect here on the group, exactly as the brief notes.)
    <group onPointerMissed={() => onHover(null)}>
      <StageRig />

      {COUNCIL_MEMBERS.map((m, i) => {
        const x = (i - (count - 1) / 2) * LINE_SPACING;
        return (
          <MemberStage
            key={m.id}
            memberId={m.id}
            index={i}
            x={x}
            isActive={activeIndex === i}
            someoneActive={someoneActive}
            reactionLabel={reactionLabel}
            reduced={reduced}
            onHover={onHover}
          />
        );
      })}
    </group>
  );
}

interface MemberStageProps {
  memberId: CouncilMemberId;
  index: number;
  x: number;
  isActive: boolean;
  someoneActive: boolean;
  reactionLabel: CouncilMemberAnimation | null;
  reduced: boolean;
  onHover: (index: number | null) => void;
}

function MemberStage({
  memberId,
  index,
  x,
  isActive,
  someoneActive,
  reactionLabel,
  reduced,
  onHover,
}: MemberStageProps) {
  const c = councilColors[memberId];
  const damp = useRef(makeDamp(reduced ? HALF_LIFE_REDUCED : HALF_LIFE));
  damp.current = makeDamp(reduced ? HALF_LIFE_REDUCED : HALF_LIFE);

  // Refs to objects we smooth-tween in useFrame.
  const groupRef = useRef<THREE.Group>(null);
  const spotRef = useRef<THREE.SpotLight>(null);
  const haloMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const coneMaterialRef = useRef<THREE.MeshBasicMaterial>(null);

  // Per-frame damping — bloom the spotlight, the halo, and the volumetric cone
  // smoothly as state changes. No conditional remount → no "snap".
  useFrame((_, dt) => {
    const d = damp.current;
    const spotTarget = isActive
      ? ACTIVE_SPOT_INTENSITY
      : someoneActive
        ? DIM_SPOT_INTENSITY
        : IDLE_SPOT_INTENSITY;
    if (spotRef.current) {
      spotRef.current.intensity = d(spotRef.current.intensity, spotTarget, dt);
    }

    const haloTarget = isActive ? ACTIVE_HALO_OPACITY : IDLE_HALO_OPACITY;
    if (haloMaterialRef.current) {
      haloMaterialRef.current.opacity = d(
        haloMaterialRef.current.opacity,
        haloTarget,
        dt,
      );
    }

    const coneTarget = isActive ? ACTIVE_CONE_OPACITY : 0;
    if (coneMaterialRef.current) {
      coneMaterialRef.current.opacity = d(
        coneMaterialRef.current.opacity,
        coneTarget,
        dt,
      );
    }

    // Forward step + lift + grow on active.
    if (groupRef.current) {
      const g = groupRef.current;
      const targetZ = LINE_Z + (isActive ? -ACTIVE_STEP_Z : 0);
      const targetY = isActive ? ACTIVE_LIFT_Y : 0;
      const targetScale = MEMBER_SCALE * (isActive ? 1.05 : 1);
      g.position.z = d(g.position.z, targetZ, dt);
      g.position.y = d(g.position.y, targetY, dt);
      const s = d(g.scale.x, targetScale, dt);
      g.scale.setScalar(s);
    }
  });

  // Cursor affordance on hover.
  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = "pointer";
    onHover(index);
  };
  const handleOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = "auto";
    onHover(null);
  };

  // Under reduced motion, hold the idle pose (no dwell reaction, no talking
  // crossfade churn) — but keep the hover affordance.
  const animation: CouncilMemberAnimation = isActive
    ? reduced
      ? "talking"
      : (reactionLabel ?? "talking")
    : "idle";

  return (
    <>
      {/* Per-member coloured spotlight from above. Always mounted — intensity
          damps each frame so it reads like a stage lighting cue. */}
      <spotLight
        ref={spotRef}
        position={[x, 5.0, LINE_Z]}
        target-position={[x, 0.9, LINE_Z]}
        intensity={IDLE_SPOT_INTENSITY}
        color={c.hex}
        angle={0.42}
        penumbra={0.55}
        distance={10}
        decay={2}
      />

      {/* Volumetric cone — purely cosmetic. Narrow apex at the lamp, base
          widens to the floor; additive blend so it glows. Opacity damps
          0 → 0.22 when the character becomes active. */}
      <mesh position={[x, 2.4, LINE_Z]} renderOrder={2}>
        <coneGeometry args={[1.1, 4.8, 28, 1, true]} />
        <meshBasicMaterial
          ref={coneMaterialRef}
          color={c.hex}
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Floor halo under the character. */}
      <mesh
        position={[x, 0.005, LINE_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={-1}
      >
        <circleGeometry args={[1.05, 36]} />
        <meshBasicMaterial
          ref={haloMaterialRef}
          color={c.hex}
          transparent
          opacity={IDLE_HALO_OPACITY}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* The character — group is tweened for step/lift/scale and catches the
          pointer events that drive the whole rig. */}
      <group
        ref={groupRef}
        position={[x, 0, LINE_Z]}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      >
        <CouncilMember3D
          modelPath={`/models/council/${memberId}.glb`}
          animation={animation}
          talkingVariant={TALKING_VARIANTS[memberId]}
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          scale={1}
          headBobPhase={index * 1.1}
          idleVariant={index % 3}
          groundShadow={false}
        />

        {/* Invisible bounding cylinder — a forgiving column to aim at, since
            the skinned silhouette is jagged. colorWrite off so it never paints. */}
        <mesh position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.7, 0.7, 2.4, 16, 1, true]} />
          <meshBasicMaterial
            transparent
            opacity={0}
            depthWrite={false}
            colorWrite={false}
          />
        </mesh>
      </group>
    </>
  );
}

// --------------------------------------------------------------------------
// Section
// --------------------------------------------------------------------------

export default function CouncilProfiles() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [reactionLabel, setReactionLabel] =
    useState<CouncilMemberAnimation | null>(null);
  const [reduced, setReduced] = useState(false);
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track prefers-reduced-motion live.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // After dwelling on a member, fire a personality-tagged reaction — unless the
  // user prefers reduced motion, in which case we skip the dwell churn.
  useEffect(() => {
    if (dwellTimer.current) clearTimeout(dwellTimer.current);
    setReactionLabel(null);
    if (activeIndex == null || reduced) return;
    const member = COUNCIL_MEMBERS[activeIndex];
    const reaction = REACTION_BY_ID[member.id];
    if (!reaction) return;
    dwellTimer.current = setTimeout(() => setReactionLabel(reaction), 1600);
    return () => {
      if (dwellTimer.current) clearTimeout(dwellTimer.current);
    };
  }, [activeIndex, reduced]);

  // Restore body cursor if the component unmounts mid-hover.
  useEffect(() => {
    return () => {
      document.body.style.cursor = "auto";
    };
  }, []);

  return (
    <section id="about" className="relative py-32 px-6 max-w-7xl mx-auto">
      <SectionHeader
        kicker="05 · Meet them properly"
        title={
          <>
            Five minds. <span className="aurora-text">One table.</span>
          </>
        }
        subtitle="Hover any of them on the stage below — they'll step into the spotlight."
      />

      {/* 3D lineup stage */}
      <div className="relative mt-16">
        <div
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 -bottom-10 w-[90%] h-44 blur-3xl pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 100% at 50% 100%, rgba(155,135,216,0.22), transparent 70%)",
          }}
        />

        <div className="relative h-[520px] md:h-[600px] lg:h-[660px] rounded-[2rem] overflow-hidden border border-white/[0.07]">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 50% 35%, rgba(155,135,216,0.16), transparent 70%), linear-gradient(180deg, #100e16 0%, #07060c 100%)",
            }}
          />

          {/* Shared, self-pausing canvas. interactive=true is mandatory here —
              this is the one section that needs pointer events. */}
          <GatedCanvas
            interactive
            className="absolute inset-0"
            camera={{ position: [0, 1.7, 12], fov: 42 }}
          >
            <CouncilLineup
              activeIndex={activeIndex}
              reactionLabel={reactionLabel}
              reduced={reduced}
              onHover={setActiveIndex}
            />
          </GatedCanvas>

          {/* Floating name badge — tracks whoever is active. */}
          <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center">
            <AnimatePresence mode="wait">
              {activeIndex != null && (
                <ActiveMemberBadge
                  key={activeIndex}
                  index={activeIndex}
                  reduced={reduced}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Idle hint at the bottom. */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center transition-opacity duration-500"
            style={{ opacity: activeIndex == null ? 1 : 0 }}
          >
            <div className="glass-strong rounded-full px-3.5 py-1.5 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] font-[var(--font-label)] text-white/80">
              <span className="material-symbols-outlined text-[14px]">
                touch_app
              </span>
              Hover any character
            </div>
          </div>
        </div>
      </div>

      {/* Now-showing info panel — animates in when a character is active. */}
      <div className="mt-10 min-h-[200px]">
        <AnimatePresence mode="wait">
          {activeIndex != null ? (
            <ActiveMemberPanel
              key={activeIndex}
              index={activeIndex}
              reduced={reduced}
            />
          ) : (
            <IdleInfoPanel key="idle" reduced={reduced} />
          )}
        </AnimatePresence>
      </div>

      {/* Footer CTA */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="mt-14 flex justify-center"
      >
        <AuroraButton href="/signup" variant="primary" size="lg">
          Pull up a chair
        </AuroraButton>
      </motion.div>
    </section>
  );
}

// --------------------------------------------------------------------------
// Floating badge naming the active member.
// --------------------------------------------------------------------------

function ActiveMemberBadge({
  index,
  reduced,
}: {
  index: number;
  reduced: boolean;
}) {
  const member = COUNCIL_MEMBERS[index];
  const c = councilColors[member.id];
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -10 }}
      transition={{
        duration: reduced ? 0.2 : 0.3,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="glass-strong rounded-full pl-3 pr-4 py-1.5 inline-flex items-center gap-2 border"
      style={{
        borderColor: c.hex + "66",
        boxShadow: `0 10px 28px -12px ${c.hex}88`,
      }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ background: c.hex, boxShadow: `0 0 10px ${c.hex}` }}
      />
      <span className="text-[12px] font-semibold text-white">{member.name}</span>
      <span
        className="text-[10px] font-[var(--font-label)] uppercase tracking-[0.22em]"
        style={{ color: c.hex }}
      >
        {member.role}
      </span>
    </motion.div>
  );
}

// --------------------------------------------------------------------------
// Idle hint shown when no one is hovered.
// --------------------------------------------------------------------------

function IdleInfoPanel({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0.2 : 0.3 }}
      className="text-center"
    >
      <div className="inline-flex flex-col items-center gap-3 px-6 py-5 rounded-2xl border border-white/[0.06] bg-white/[0.025] max-w-2xl">
        <div className="flex items-center gap-2">
          {COUNCIL_MEMBERS.map((m) => (
            <span
              key={m.id}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: councilColors[m.id].hex,
                boxShadow: `0 0 6px ${councilColors[m.id].hex}`,
              }}
            />
          ))}
        </div>
        <p className="text-white/65 text-sm leading-relaxed max-w-md">
          Each of them shows up differently. Sweep your mouse across the stage
          to put one under the light — they&apos;ll look up, talk, and tell you
          who they are.
        </p>
      </div>
    </motion.div>
  );
}

// --------------------------------------------------------------------------
// Rich info card for whoever is active.
// --------------------------------------------------------------------------

function ActiveMemberPanel({
  index,
  reduced,
}: {
  index: number;
  reduced: boolean;
}) {
  const member = COUNCIL_MEMBERS[index];
  const c = councilColors[member.id];
  const traits = TRAITS_BY_ID[member.id] ?? [];

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -16 }}
      transition={{
        duration: reduced ? 0.25 : 0.45,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="relative grid md:grid-cols-[1fr_auto] gap-6 md:gap-10 items-start rounded-3xl p-6 md:p-7 border overflow-hidden"
      style={{
        background: `linear-gradient(120deg, ${c.soft}, rgba(255,255,255,0.02) 60%)`,
        borderColor: c.hex + "55",
        boxShadow: `0 28px 60px -28px ${c.hex}55`,
      }}
    >
      {/* Aurora halo behind */}
      <span
        aria-hidden
        className="absolute -top-12 -left-12 w-64 h-64 rounded-full blur-3xl opacity-50 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${c.hex}, transparent 70%)`,
        }}
      />

      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: c.hex, boxShadow: `0 0 10px ${c.hex}` }}
          />
          <p
            className="text-[10px] font-[var(--font-label)] uppercase tracking-[0.32em] font-bold"
            style={{ color: c.hex }}
          >
            {member.role}
          </p>
        </div>
        <h3
          className="font-[var(--font-headline)] text-3xl md:text-4xl font-bold text-white leading-tight"
          style={{ textShadow: `0 0 30px ${c.hex}33` }}
        >
          {member.name}
        </h3>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {traits.map((t) => (
            <span
              key={t}
              className="px-2.5 py-1 rounded-full text-[10px] font-[var(--font-label)] font-semibold uppercase tracking-wider border text-white/85"
              style={{ borderColor: c.hex + "55" }}
            >
              {t}
            </span>
          ))}
        </div>

        <p className="mt-4 text-white/70 text-sm leading-relaxed max-w-xl">
          {member.shortBio}
        </p>

        <p
          className="mt-3 text-[13px] italic leading-snug max-w-xl"
          style={{ color: c.hex + "dd" }}
        >
          &ldquo;{member.signatureGreeting}&rdquo;
        </p>
      </div>

      {/* CTA */}
      <div className="relative flex md:flex-col items-start md:items-end gap-3">
        <AuroraButton
          href="/signup"
          variant="member"
          memberColor={member.id}
          size="md"
        >
          Talk to {member.name}
        </AuroraButton>
        <span className="text-[10px] font-[var(--font-label)] uppercase tracking-[0.28em] text-white/40">
          {member.vibe}
        </span>
      </div>
    </motion.div>
  );
}
