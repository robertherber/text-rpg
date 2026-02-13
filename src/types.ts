// Game Types

export interface Character {
  name: string;
  health: number;
  maxHealth: number;
  strength: number;
  magic: number;
  defense: number;
  level: number;
  experience: number;
  gold: number;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: "weapon" | "armor" | "potion" | "key" | "misc";
  effect?: {
    stat: keyof Character;
    value: number;
  };
}

export interface Enemy {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  strength: number;
  defense: number;
  experienceReward: number;
  goldReward: number;
  description: string;
}

export interface Choice {
  id: string;
  text: string;
  nextLocationId?: string;
  action?: "combat" | "item" | "dialogue" | "shop";
  enemyId?: string;
  itemId?: string;
  requirement?: {
    type: "item" | "stat" | "gold";
    id?: string;
    stat?: keyof Character;
    value?: number;
  };
}

export interface Location {
  id: string;
  name: string;
  description: string;
  imagePrompt?: string;
  parentLocationId?: string; // For dialogue/sub-scenes that share parent's image
  choices: Choice[];
  enemies?: string[];
  items?: string[];
  onEnter?: {
    type: "heal" | "damage" | "addItem" | "removeItem" | "addGold";
    value?: number;
    itemId?: string;
  };
}

export interface GameState {
  character: Character;
  inventory: Item[];
  currentLocationId: string;
  visitedLocations: string[];
  defeatedEnemies: string[];
  storyFlags: Record<string, boolean>;
  combatState: CombatState | null;
  messageLog: string[];
}

export interface CombatState {
  enemy: Enemy;
  playerTurn: boolean;
  turnCount: number;
}
