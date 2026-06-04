/**
 * ManyMinds — Environment library
 *
 * The 5 immersive 3D scenes the council can hang out in. Used by:
 *  - Header environment switcher (popover)
 *  - Dashboard "Step inside the room" tile
 *  - (eventually) the 3D canvas team to pick the scene
 */

export interface Environment {
  id: string;
  name: string;
  icon: string; // material-symbols
  mood: string; // 2-3 word vibe
  hint: string; // longer descriptor
}

export const ENVIRONMENTS: ReadonlyArray<Environment> = [
  {
    id: "cafe",
    name: "Café",
    icon: "local_cafe",
    mood: "warm & buzzy",
    hint: "Background hum, slow afternoon light.",
  },
  {
    id: "beach",
    name: "Beach",
    icon: "beach_access",
    mood: "open & breezy",
    hint: "Salt air, soft waves, long thoughts.",
  },
  {
    id: "rooftop",
    name: "Rooftop",
    icon: "deck",
    mood: "city after dark",
    hint: "City glow, big-question energy.",
  },
  {
    id: "library",
    name: "Library",
    icon: "auto_stories",
    mood: "quiet & sharp",
    hint: "Hushed shelves, the deep work corner.",
  },
  {
    id: "forest",
    name: "Forest",
    icon: "forest",
    mood: "grounded & still",
    hint: "Tree filtered light, the slow conversation.",
  },
  {
    id: "mountain",
    name: "Mountain",
    icon: "filter_hdr",
    mood: "crisp & alpine",
    hint: "Aurora overhead, a campfire above the clouds.",
  },
  {
    id: "zen",
    name: "Zen Garden",
    icon: "spa",
    mood: "serene & still",
    hint: "Raked sand, koi, blossoms drifting at dusk.",
  },
] as const;

export type EnvironmentId = (typeof ENVIRONMENTS)[number]["id"];

export const ENVIRONMENT_STORAGE_KEY = "manyminds:environment";

export function getDefaultEnvironment(): Environment {
  return ENVIRONMENTS[0];
}

export function findEnvironment(id: string): Environment {
  return ENVIRONMENTS.find((e) => e.id === id) ?? getDefaultEnvironment();
}
