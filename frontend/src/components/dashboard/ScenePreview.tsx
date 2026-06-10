"use client";

import { motion } from "framer-motion";
import { councilColors } from "@/lib/design-tokens";
import { useEnvironment } from "./EnvironmentProvider";

/**
 * "Come sit with us" — a warm card that previews the 3D scene.
 *
 * NOTE for the 3D team: the canvas slot is `<div id="scene-preview">`. Mount
 * your react-three-fiber Canvas inside that container and the surrounding
 * gradient + play overlay will keep working. Until then we render an SVG
 * silhouette of 5 figures arranged in a circle so the dashboard *feels* like
 * the room is being set up.
 */
export default function ScenePreview() {
  const { current } = useEnvironment();

  return (
    <div className="glass-warm rounded-3xl overflow-hidden">
      <div className="grid md:grid-cols-[1fr_1.4fr]">
        {/* Left — copy */}
        <div className="p-7 md:p-8 flex flex-col justify-between gap-7 relative">
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.32em] font-[var(--font-label)] text-white/55">
              The room
            </p>
            <h2 className="text-2xl md:text-3xl font-[var(--font-headline)] font-bold text-white leading-tight">
              Come sit with us
            </h2>
            <p className="text-sm text-white/55 leading-relaxed">
              We&apos;re holding seats in the{" "}
              <span className="text-white font-semibold">
                {current.name.toLowerCase()}
              </span>{" "}
              — {current.hint.toLowerCase()}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#15121d] font-semibold text-sm hover:bg-white/90 active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">play_arrow</span>
              Step inside
            </button>
            <span className="text-[11px] uppercase tracking-wider font-[var(--font-label)] text-white/40">
              Beta · 3D
            </span>
          </div>
        </div>

        {/* Right — canvas placeholder + SVG silhouettes */}
        <div className="relative h-64 md:h-72 lg:h-80 m-3 rounded-2xl overflow-hidden">
          {/* Background — lilac from above, candle-light from below */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 30%, rgba(155,135,216,0.22), transparent 70%), radial-gradient(ellipse at 50% 110%, rgba(224,176,131,0.14), transparent 60%), linear-gradient(180deg, #131017 0%, #0b0910 100%)",
            }}
          />
          {/* Floor */}
          <div
            aria-hidden
            className="absolute bottom-0 inset-x-0 h-1/2 noise opacity-25"
          />

          {/* Real slot for the 3D Canvas — kept empty for the 3D team */}
          <div
            id="scene-preview"
            data-slot="3d-canvas"
            className="absolute inset-0 pointer-events-none"
          />

          {/* SVG silhouettes — 5 figures in a circle */}
          <SilhouetteCircle />

          {/* Foreground play overlay */}
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="grid place-items-center w-16 h-16 rounded-full glass-strong"
            >
              <span className="material-symbols-outlined text-[28px] text-white">
                play_arrow
              </span>
            </motion.div>
          </div>

          {/* Caption */}
          <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/35 backdrop-blur-md text-[10px] uppercase tracking-wider font-[var(--font-label)] font-semibold text-white/65">
            Setting the room…
          </div>
        </div>
      </div>
    </div>
  );
}

/** 5 council members arranged in a circle (back row recedes, front row glows). */
function SilhouetteCircle() {
  // Positions arranged around an ellipse, ordered so back row paints first.
  // The vibe: aria + sage at the back, nova centered + slightly back,
  // rex + echo facing forward at the front. Each silhouette uses the
  // member's signature color.
  const figures = [
    { id: "sage", x: 22, y: 38, scale: 0.85, z: 0 },
    { id: "aria", x: 78, y: 38, scale: 0.85, z: 0 },
    { id: "nova", x: 50, y: 32, scale: 0.95, z: 1 },
    { id: "rex", x: 30, y: 64, scale: 1.1, z: 2 },
    { id: "echo", x: 70, y: 64, scale: 1.1, z: 2 },
  ] as const;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 w-full h-full"
      aria-hidden
    >
      {figures.map((f) => (
        <FigureSilhouette
          key={f.id}
          cx={f.x}
          cy={f.y}
          scale={f.scale}
          color={councilColors[f.id].hex}
          z={f.z}
        />
      ))}
      {/* Floor highlight — candle-light warm */}
      <ellipse
        cx="50"
        cy="84"
        rx="44"
        ry="3"
        fill="url(#floor-glow)"
        opacity="0.35"
      />
      <defs>
        <radialGradient id="floor-glow">
          <stop offset="0%" stopColor="#e0b083" stopOpacity="0.6" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function FigureSilhouette({
  cx,
  cy,
  scale,
  color,
  z,
}: {
  cx: number;
  cy: number;
  scale: number;
  color: string;
  z: number;
}) {
  const alpha = 0.45 + z * 0.18;
  const halo = 0.18 + z * 0.12;
  // Tiny figure: head + torso shape, glowing in the member's signature color.
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale * 0.04})`}>
      {/* Halo */}
      <ellipse cx="0" cy="120" rx="120" ry="14" fill={color} opacity={halo * 0.4} />
      {/* Torso */}
      <path
        d="M -55 120 Q -55 55 -25 35 Q 0 25 25 35 Q 55 55 55 120 Z"
        fill={color}
        opacity={alpha}
      />
      {/* Head */}
      <circle cx="0" cy="-5" r="30" fill={color} opacity={alpha + 0.05} />
      {/* Subtle rim light */}
      <ellipse cx="-12" cy="-12" rx="8" ry="6" fill="white" opacity="0.15" />
    </g>
  );
}
