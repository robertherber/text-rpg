// Seed World Data for Dragon's Bane
// Creates the initial world state with Millbrook village

import type { WorldState, Location, Player, NPC, Faction } from "./types";

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
      npcs: [], // Will be populated after NPCs are created
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
    crimes: [],
    bounties: [],
  };

  // Assemble locations record
  const locations: Record<string, Location> = {
    [villageSquare.id]: villageSquare,
    [tavern.id]: tavern,
    [blacksmith.id]: blacksmith,
    [elderHouse.id]: elderHouse,
    [villageGate.id]: villageGate,
  };

  // Create seed NPCs
  const barkeep: NPC = {
    id: seedId("npc", "marta_barkeep"),
    name: "Marta the Barkeep",
    description: "A stout woman with calloused hands and a knowing smile, owner of The Rusty Tankard.",
    physicalDescription: "A heavyset woman in her fifties with ruddy cheeks, gray-streaked auburn hair tied in a practical bun, and arms thick from years of hauling kegs. Her apron is perpetually stained, and a wooden ladle hangs from her belt like a sidearm.",
    soulInstruction: "Marta has run The Rusty Tankard for thirty years, inheriting it from her late husband Bertram who choked on a fish bone. She knows every secret whispered over ale in Millbrook and trades gossip like currency—she'll share information if you give her something interesting in return. She speaks in a warm but no-nonsense manner, often wiping down the bar mid-conversation. Her goal is to keep her tavern prosperous and learn everyone's business. She's moderately gullible when it comes to flattery about her cooking, but shrewd about money. She refers to everyone as 'dearie' or 'love' regardless of station.",
    currentLocationId: tavern.id,
    homeLocationId: tavern.id,
    knowledge: [
      "Knows everyone in Millbrook by name",
      "Heard rumors of wolves in the western forest",
      "Knows Elder Bramwell has been troubled lately",
      "Remembers travelers who pass through",
    ],
    conversationHistory: [],
    heardRumors: [],
    attitude: 50, // Friendly to strangers
    isCompanion: false,
    isAnimal: false,
    inventory: [],
    stats: {
      health: 80,
      maxHealth: 80,
      strength: 8,
      defense: 5,
    },
    isAlive: true,
    isCanonical: true,
    factionIds: [],
  };

  const blacksmithNpc: NPC = {
    id: seedId("npc", "grimjaw_smith"),
    name: "Grimjaw",
    description: "A towering blacksmith with burn-scarred arms and a perpetual scowl that belies a gentle heart.",
    physicalDescription: "A mountain of a man standing nearly seven feet tall, with skin darkened by forge-soot and arms like tree trunks crisscrossed with old burn scars. His jaw is crooked—hence the name—from a hammer accident in his youth. His leather apron is thick as armor, and his hands are permanently blackened despite washing.",
    soulInstruction: "Grimjaw speaks little, preferring the honest language of hammer and metal. He came to Millbrook twenty years ago fleeing some past he never discusses—the scars on his back aren't from forge work. He respects action over words and will only truly warm to those who prove themselves through deeds. He crafts the finest blades within a hundred miles but refuses to make weapons for those he deems unworthy. His goal is to live out his days in peace and perhaps train an apprentice. He speaks in short, gruff sentences and often grunts instead of answering. He's nearly impossible to deceive—his years of judging metal quality have made him excellent at judging character.",
    currentLocationId: blacksmith.id,
    homeLocationId: blacksmith.id,
    knowledge: [
      "Knows metalworking and weapon quality",
      "Knows of old mines to the north",
      "Has heard of a dark blade that brings misfortune",
      "Knows Elder Bramwell from the old days",
    ],
    conversationHistory: [],
    heardRumors: [],
    attitude: 10, // Neutral, reserved with strangers
    isCompanion: false,
    isAnimal: false,
    inventory: [
      {
        id: seedId("item", "simple_dagger"),
        name: "Simple Iron Dagger",
        description: "A well-crafted but plain dagger, suitable for utility work or self-defense.",
        type: "weapon",
        effect: { stat: "strength", value: 3 },
        value: 15,
        isCanonical: true,
      },
    ],
    stats: {
      health: 150,
      maxHealth: 150,
      strength: 18,
      defense: 12,
    },
    isAlive: true,
    isCanonical: true,
    factionIds: [],
  };

  const elder: NPC = {
    id: seedId("npc", "bramwell_elder"),
    name: "Elder Bramwell",
    description: "The aged village elder whose cloudy eyes seem to see more than they should.",
    physicalDescription: "A wispy old man with a long white beard stained yellow at the tips from pipe smoke. His eyes are milky with cataracts yet unnervingly perceptive. He walks with a gnarled oak staff carved with forgotten runes, and his robes are patched so many times they're more repair than original cloth.",
    soulInstruction: "Elder Bramwell has guided Millbrook for forty years and carries the weight of every decision—good and ill—in his stooped shoulders. He speaks in riddles and parables not to be cryptic but because direct answers have cost him dearly in the past. He knows fragments of old magic, just enough to be dangerous, and fears the return of something he helped seal away in his youth. His goal is to find someone worthy of carrying his burden before death claims him. He tests newcomers with seemingly simple requests that reveal character. He speaks slowly, often trailing off mid-sentence as if listening to voices others cannot hear. He's impossible to fool but rarely calls out lies—he simply remembers them.",
    currentLocationId: elderHouse.id,
    homeLocationId: elderHouse.id,
    knowledge: [
      "Knows the old lore and forgotten places",
      "Remembers when the forest was different",
      "Knows fragments of protective magic",
      "Knows every soul born in Millbrook",
      "Remembers heroes who came before",
    ],
    conversationHistory: [],
    heardRumors: [],
    attitude: 30, // Cautiously welcoming
    isCompanion: false,
    isAnimal: false,
    inventory: [],
    stats: {
      health: 40,
      maxHealth: 40,
      strength: 3,
      defense: 2,
    },
    isAlive: true,
    isCanonical: true,
    factionIds: [],
  };

  const stablehand: NPC = {
    id: seedId("npc", "pip_stablehand"),
    name: "Pip",
    description: "A bright-eyed young stablehand who dreams of adventure beyond Millbrook's gates.",
    physicalDescription: "A scrawny youth of perhaps fifteen summers with a shock of straw-colored hair that refuses to lie flat. Freckles dust his sun-tanned face, and his clothes are perpetually covered in hay. His boots are too big—hand-me-downs—and he walks with the boundless energy of youth.",
    soulInstruction: "Pip is an orphan raised by the village, sleeping in the hayloft and earning his keep tending to travelers' horses and the village's few mules. He's desperate for adventure and treats any stranger as a potential hero from the stories he's heard. He speaks quickly, often interrupting himself with new thoughts, and asks far too many questions. His goal is to prove himself worthy of becoming a hero's companion. He's incredibly gullible and will believe almost anything told with conviction, though he'll eventually figure out lies and feel deeply betrayed. He knows every hiding spot in Millbrook and often overhears things he shouldn't.",
    currentLocationId: villageSquare.id,
    homeLocationId: villageSquare.id,
    knowledge: [
      "Knows all the hiding spots in Millbrook",
      "Overheard merchants talking about bandits on the east road",
      "Knows which villagers are kind and which are cruel",
      "Has seen strange lights in the forest at night",
    ],
    conversationHistory: [],
    heardRumors: [],
    attitude: 70, // Very friendly and eager
    isCompanion: false,
    isAnimal: false,
    inventory: [],
    stats: {
      health: 50,
      maxHealth: 50,
      strength: 5,
      defense: 3,
    },
    isAlive: true,
    isCanonical: true,
    factionIds: [],
  };

  // Place NPCs at their locations
  locations[tavern.id]!.presentNpcIds = [barkeep.id];
  locations[blacksmith.id]!.presentNpcIds = [blacksmithNpc.id];
  locations[elderHouse.id]!.presentNpcIds = [elder.id];
  locations[villageSquare.id]!.presentNpcIds = [stablehand.id];

  // Assemble NPCs record
  const npcs: Record<string, NPC> = {
    [barkeep.id]: barkeep,
    [blacksmithNpc.id]: blacksmithNpc,
    [elder.id]: elder,
    [stablehand.id]: stablehand,
  };

  // Update player knowledge with NPCs they can see
  player.knowledge.npcs = [
    stablehand.id, // Pip is in the village square where player starts
  ];

  // Create seed factions
  const thievesGuild: Faction = {
    id: seedId("faction", "shadow_hand"),
    name: "The Shadow Hand",
    description:
      "A secretive network of thieves, pickpockets, and information brokers operating in the shadows of every major settlement. They value loyalty, cunning, and discretion above all else. Their motives are profit, but they maintain a strict code: never steal from the destitute, and always honor a contract.",
    leaderNpcId: undefined, // Leader operates from a larger city, unknown to villagers
    memberNpcIds: [],
    playerReputation: 0,
    isCanonical: true,
  };

  const merchantConsortium: Faction = {
    id: seedId("faction", "golden_scale"),
    name: "The Golden Scale Consortium",
    description:
      "A powerful alliance of merchants, traders, and craftsmen who control most legitimate commerce in the region. They protect their members from bandits and unfair competition, set fair prices, and maintain trade routes. Marta at The Rusty Tankard pays dues to remain in good standing.",
    leaderNpcId: undefined, // Guild leadership is in the capital
    memberNpcIds: [barkeep.id], // Marta is a member
    playerReputation: 0,
    isCanonical: true,
  };

  const nobleHouse: Faction = {
    id: seedId("faction", "house_valdris"),
    name: "House Valdris",
    description:
      "The noble house that rules these lands from their distant castle. They collect taxes, maintain the King's peace, and dispense justice through appointed magistrates. Elder Bramwell serves as their local representative in Millbrook, though his loyalties are complex. The common folk have mixed feelings—the house provides protection but demands much in return.",
    leaderNpcId: undefined, // Lord Valdris is far away
    memberNpcIds: [elder.id], // Elder Bramwell represents them locally
    playerReputation: 0,
    isCanonical: true,
  };

  // Assemble factions record
  const factions: Record<string, Faction> = {
    [thievesGuild.id]: thievesGuild,
    [merchantConsortium.id]: merchantConsortium,
    [nobleHouse.id]: nobleHouse,
  };

  // Update NPCs with their faction affiliations
  barkeep.factionIds = [merchantConsortium.id];
  elder.factionIds = [nobleHouse.id];

  // Create and return the complete world state
  const worldState: WorldState = {
    version: 1,
    actionCounter: 0,
    player,
    locations,
    npcs,
    factions,
    quests: {},
    deceasedHeroes: [],
    eventHistory: [],
    messageLog: [
      "You find yourself standing in the village square of Millbrook, a modest hamlet at the edge of civilization. The afternoon sun casts long shadows across the cobblestones, and the bustle of village life surrounds you. A scrawny stablehand with straw-colored hair watches you with undisguised curiosity. How you came to be here, you cannot quite recall...",
    ],
    combatState: null,
  };

  return worldState;
}
