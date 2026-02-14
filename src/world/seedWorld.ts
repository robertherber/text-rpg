// Seed World Data for Dragon's Bane
// Creates the initial world state with Millbrook village

import type { WorldState, Location, Player } from "./types";

/**
 * Creates a unique ID for seed content
 */
function seedId(prefix: string, name: string): string {
  return `${prefix}_${name.toLowerCase().replace(/\s+/g, "_")}`;
}

/**
 * Creates the seed world with Millbrook village at coordinates (0,0)
 * @returns Complete WorldState ready for persistence
 */
export function createSeedWorld(): WorldState {
  // Create seed locations
  const villageSquare: Location = {
    id: seedId("loc", "millbrook_square"),
    name: "Millbrook Village Square",
    description:
      "The heart of Millbrook, where weathered cobblestones form a modest plaza beneath an ancient oak. A stone well sits at the center, its bucket dangling from a frayed rope. Villagers gather here to trade gossip and wares, their voices mingling with the clucking of chickens and the distant clang of the smithy.",
    imagePrompt:
      "Medieval village square with ancient oak tree, stone well in center, cobblestone ground, villagers milling about, warm afternoon light, fantasy art style",
    coordinates: { x: 0, y: 0 },
    terrain: "village",
    dangerLevel: 0,
    presentNpcIds: [],
    items: [],
    structures: [],
    notes: [],
    isCanonical: true,
  };

  const tavern: Location = {
    id: seedId("loc", "rusty_tankard"),
    name: "The Rusty Tankard",
    description:
      "A squat timber building with smoke curling from its chimney and the warm glow of hearth-fire spilling through foggy windows. The sign above the door depicts a dented tankard, swinging lazily in the breeze. Inside, the air is thick with the smell of roasting meat, spilled ale, and old wood.",
    imagePrompt:
      "Cozy medieval tavern interior, wooden beams, roaring fireplace, long bar with tankards, candle-lit tables, patrons drinking, warm amber lighting, fantasy art style",
    coordinates: { x: 0, y: 1 },
    terrain: "village",
    dangerLevel: 0,
    presentNpcIds: [],
    items: [],
    structures: [],
    notes: [],
    isCanonical: true,
  };

  const blacksmith: Location = {
    id: seedId("loc", "ironheart_forge"),
    name: "Ironheart Forge",
    description:
      "The rhythmic ring of hammer on anvil echoes from this soot-stained workshop. A great stone forge dominates the space, its coals glowing like angry eyes. Weapons and tools hang from every beam—swords waiting for hilts, horseshoes cooling in water buckets, and mysterious projects hidden beneath cloth.",
    imagePrompt:
      "Medieval blacksmith forge interior, glowing hot coals, anvil with hammer, weapons hanging on walls, soot-covered stone, muscular figure working, dramatic orange firelight, fantasy art style",
    coordinates: { x: 1, y: 0 },
    terrain: "village",
    dangerLevel: 0,
    presentNpcIds: [],
    items: [],
    structures: [],
    notes: [],
    isCanonical: true,
  };

  const elderHouse: Location = {
    id: seedId("loc", "elder_house"),
    name: "Elder's Cottage",
    description:
      "A humble cottage adorned with dried herbs and wind chimes made of old bones and bells. The thatch roof sags with age, and the wooden door bears carvings of protective runes. Inside, shelves overflow with scrolls, dried plants, and curious trinkets collected over a lifetime of quiet wisdom.",
    imagePrompt:
      "Cozy cottage interior of village elder, dried herbs hanging from ceiling, wooden shelves with scrolls and trinkets, rune-carved door, warm candlelight, mystical atmosphere, fantasy art style",
    coordinates: { x: -1, y: 0 },
    terrain: "village",
    dangerLevel: 0,
    presentNpcIds: [],
    items: [],
    structures: [],
    notes: [],
    isCanonical: true,
  };

  const villageGate: Location = {
    id: seedId("loc", "millbrook_gate"),
    name: "Millbrook Village Gate",
    description:
      "The village's humble wooden gate marks the boundary between Millbrook's safety and the wild lands beyond. Two torches flank the entrance, their flames dancing in whatever wind blows from the outer world. Beyond lies a dirt road disappearing into rolling hills dotted with ancient trees.",
    imagePrompt:
      "Medieval village wooden gate entrance, two torches, dirt road leading to rolling hills and forests, sunset lighting, sense of adventure, fantasy art style",
    coordinates: { x: 0, y: -1 },
    terrain: "road",
    dangerLevel: 1,
    presentNpcIds: [],
    items: [],
    structures: [],
    notes: [],
    isCanonical: true,
  };

  // Create default player
  const player: Player = {
    name: undefined, // To be determined
    physicalDescription: "A traveler with road-worn clothes and weary eyes",
    hiddenBackstory: "", // Will be generated
    revealedBackstory: [],
    origin: "unknown",
    currentLocationId: villageSquare.id,
    health: 100,
    maxHealth: 100,
    strength: 10,
    defense: 10,
    magic: 5,
    level: 1,
    experience: 0,
    gold: 25,
    inventory: [],
    companionIds: [],
    knowledge: {
      locations: [
        villageSquare.id,
        tavern.id,
        blacksmith.id,
        elderHouse.id,
        villageGate.id,
      ],
      npcs: [],
      lore: ["Millbrook is a small village at the edge of the known world."],
      recipes: [],
      skills: {},
    },
    behaviorPatterns: {
      combat: 0,
      diplomacy: 0,
      exploration: 0,
      social: 0,
      stealth: 0,
      magic: 0,
    },
    transformations: [],
    curses: [],
    blessings: [],
    childrenNpcIds: [],
  };

  // Assemble locations record
  const locations: Record<string, Location> = {
    [villageSquare.id]: villageSquare,
    [tavern.id]: tavern,
    [blacksmith.id]: blacksmith,
    [elderHouse.id]: elderHouse,
    [villageGate.id]: villageGate,
  };

  // Create and return the complete world state
  const worldState: WorldState = {
    version: 1,
    actionCounter: 0,
    player,
    locations,
    npcs: {},
    factions: {},
    quests: {},
    deceasedHeroes: [],
    eventHistory: [],
    messageLog: [
      "You find yourself standing in the village square of Millbrook, a modest hamlet at the edge of civilization. The afternoon sun casts long shadows across the cobblestones, and the bustle of village life surrounds you. How you came to be here, you cannot quite recall...",
    ],
    combatState: null,
  };

  return worldState;
}
