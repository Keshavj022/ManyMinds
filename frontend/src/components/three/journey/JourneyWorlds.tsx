"use client";

/**
 * JourneyWorlds — public barrel for the Journey's world content.
 *
 *   JourneyWorld     — one of the 7 stacked fall dioramas (self-fading).
 *   CyberSpace       — the boot platform + breakout shatter (self-fading).
 *   CouncilFurniture — café centrepiece: table + five stools + pendant.
 *   DebateDressing   — debate stage set.
 *   GamesDressing    — games lounge set.
 *
 * All fragments live at their own local origin — the scene (agent B) wraps
 * them in <group>s at worldYFor(i) / CYBER_Y / ZONE_Y offsets. Each world and
 * CyberSpace own a useFrame that eases every material's opacity toward the
 * `opacity` prop (half-life 0.18s) and hides the group when fully faded, so
 * invisible worlds cost zero.
 */

import * as React from "react";
import type { JourneyWorldId } from "./timeline";
import { FadeGroup } from "./worldKit";
import { ForestWorld, MountainWorld, RooftopWorld, ZenWorld } from "./worldsUpper";
import { BeachWorld, CafeWorld, LibraryWorld } from "./worldsLower";

const WORLD_FRAGMENTS: Record<JourneyWorldId, React.ComponentType> = {
  mountain: MountainWorld,
  zen: ZenWorld,
  forest: ForestWorld,
  rooftop: RooftopWorld,
  beach: BeachWorld,
  library: LibraryWorld,
  cafe: CafeWorld,
};

export function JourneyWorld({
  id,
  opacity,
}: {
  id: JourneyWorldId;
  opacity: number;
}): React.JSX.Element {
  const Fragment = WORLD_FRAGMENTS[id];
  return (
    <FadeGroup opacity={opacity}>
      <Fragment />
    </FadeGroup>
  );
}

export { CyberSpace } from "./CyberSpace";
export { CouncilFurniture, DebateDressing, GamesDressing } from "./dressings";
