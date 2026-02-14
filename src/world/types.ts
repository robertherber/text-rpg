// World State Types for Open World RPG

export interface Coordinates {
  x: number;
  y: number;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  imagePrompt: string;
  coordinates: Coordinates;
  terrain: "village" | "forest" | "mountain" | "plains" | "water" | "cave" | "dungeon" | "road" | "swamp" | "desert";
  dangerLevel: number; // 0-10
  presentNpcIds: string[];
  items: WorldItem[];
  structures: Structure[];
  notes: PlayerNote[];
  isCanonical?: boolean; // Seed content that shouldn't be overwritten
  lastVisitedAtAction?: number;
  imageStateHash?: string; // Hash of state when image was generated
}

export interface WorldItem {
  id: string;
  name: string;
  description: string;
  type: "weapon" | "armor" | "potion" | "food" | "key" | "misc" | "material" | "book" | "magic";
  effect?: {
    stat: string;
    value: number;
  };
  value: number; // Gold value
  isCanonical?: boolean;
}

export interface Structure {
  id: string;
  name: string;
  description: string;
  type: "camp" | "shelter" | "house" | "fort" | "trap" | "marker" | "grave";
  builtAtAction: number;
  ownerId?: string; // Player or NPC who built/owns it
}

export interface PlayerNote {
  id: string;
  content: string;
  leftAtAction: number;
}

export interface NPC {
  id: string;
  name: string;
  description: string;
  physicalDescription: string;
  soulInstruction: string; // Paragraph: background, goals, personality, speech patterns, gullibility
  currentLocationId: string;
  homeLocationId?: string;
  knowledge: string[]; // What this NPC knows about (locations, people, lore)
  conversationHistory: ConversationSummary[];
  playerNameKnown?: string; // What name player introduced themselves as to this NPC
  attitude: number; // -100 to 100, attitude toward player
  isCompanion: boolean;
  isAnimal: boolean;
  inventory: WorldItem[];
  stats: NPCStats;
  isAlive: boolean;
  deathDescription?: string;
  burialLocationId?: string;
  isCanonical?: boolean;
  factionIds: string[];
}

export interface NPCStats {
  health: number;
  maxHealth: number;
  strength: number;
  defense: number;
}

export interface ConversationSummary {
  actionNumber: number;
  summary: string;
  playerAsked?: string[];
  npcRevealed?: string[];
  attitudeChange?: number;
}

export interface Faction {
  id: string;
  name: string;
  description: string;
  leaderNpcId?: string;
  memberNpcIds: string[];
  playerReputation: number; // -100 to 100
  isCanonical?: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  giverNpcId: string;
  status: "active" | "completed" | "failed" | "impossible";
  objectives: string[];
  completedObjectives: string[];
  rewards?: string;
}

export interface PlayerKnowledge {
  locations: Set<string>; // Known location names/ids
  npcs: Set<string>; // Known NPC names/ids
  lore: Set<string>; // Known lore/facts
  recipes: Set<string>; // Known crafting recipes
  skills: Map<string, string>; // Skill name -> qualitative level description
}

export interface Player {
  name?: string; // May be unknown initially
  physicalDescription: string;
  hiddenBackstory: string; // Revealed through flashbacks
  revealedBackstory: string[];
  origin: string;
  currentLocationId: string;
  homeLocationId?: string;
  health: number;
  maxHealth: number;
  strength: number;
  defense: number;
  magic: number;
  level: number;
  experience: number;
  gold: number;
  inventory: WorldItem[];
  companionIds: string[];
  knowledge: {
    locations: string[];
    npcs: string[];
    lore: string[];
    recipes: string[];
    skills: Record<string, string>;
  };
  behaviorPatterns: {
    combat: number;
    diplomacy: number;
    exploration: number;
    social: number;
    stealth: number;
    magic: number;
  };
  transformations: string[]; // vampire, werewolf, etc.
  curses: string[];
  blessings: string[];
  marriedToNpcId?: string;
  childrenNpcIds: string[];
}

export interface DeceasedHero {
  id: string;
  name?: string;
  physicalDescription: string;
  origin: string;
  diedAtAction: number;
  deathDescription: string;
  deathLocationId: string;
  majorDeeds: string[];
  itemsLeftBehind: { locationId: string; items: WorldItem[] }[];
  knownByNpcIds: string[]; // NPCs who knew this hero
  buriedBy?: string; // NPC id who buried them
  graveLocationId?: string;
}

export interface WorldEvent {
  id: string;
  actionNumber: number;
  description: string;
  type: "combat" | "dialogue" | "discovery" | "death" | "quest" | "relationship" | "faction" | "build" | "craft" | "other";
  involvedNpcIds: string[];
  locationId: string;
  isSignificant: boolean; // Affects rumors/world state
}

export interface WorldState {
  version: number;
  actionCounter: number;
  player: Player;
  locations: Record<string, Location>;
  npcs: Record<string, NPC>;
  factions: Record<string, Faction>;
  quests: Record<string, Quest>;
  deceasedHeroes: DeceasedHero[];
  eventHistory: WorldEvent[];
  messageLog: string[];
  combatState: CombatState | null;
}

export interface CombatState {
  enemyNpcId: string;
  playerTurn: boolean;
  turnCount: number;
  companionsInCombat: string[];
}

// GPT Response Types

export interface ActionResult {
  narrative: string;
  stateChanges: StateChange[];
  suggestedActions: SuggestedAction[];
  initiatesCombat?: string; // NPC id to fight
  revealsFlashback?: string;
  newKnowledge?: string[];
  questUpdates?: { questId: string; status: Quest["status"]; completedObjectives?: string[] }[];
}

export interface StateChange {
  type:
    | "move_player"
    | "move_npc"
    | "add_item"
    | "remove_item"
    | "update_npc_attitude"
    | "npc_death"
    | "player_damage"
    | "player_heal"
    | "add_knowledge"
    | "add_companion"
    | "remove_companion"
    | "create_structure"
    | "destroy_structure"
    | "update_location"
    | "create_npc"
    | "create_location"
    | "add_quest"
    | "update_quest"
    | "update_faction"
    | "player_transform"
    | "add_curse"
    | "add_blessing"
    | "skill_practice"
    | "gold_change"
    | "claim_home"
    | "store_item_at_home"
    | "retrieve_item_from_home"
    | "companion_wait_at_home"
    | "companion_rejoin"
    | "reveal_flashback";
  data: Record<string, any>;
}

export interface SuggestedAction {
  id: string;
  text: string;
  type: "move" | "talk" | "examine" | "use" | "attack" | "craft" | "build" | "travel" | "other";
  targetLocationId?: string;
  targetNpcId?: string;
}
