import type { GameState, Character, Item, Enemy, CombatState, Choice } from "./types";
import { locations, items, enemies, initialCharacter } from "./gameData";

export function createInitialState(): GameState {
  return {
    character: { ...initialCharacter },
    inventory: [],
    currentLocationId: "village_square",
    visitedLocations: ["village_square"],
    defeatedEnemies: [],
    storyFlags: {},
    combatState: null,
    messageLog: ["Welcome, brave adventurer! Your journey begins in the village of Millbrook..."],
  };
}

export function getLocation(locationId: string) {
  return locations[locationId];
}

export function getItem(itemId: string) {
  return items[itemId];
}

export function getEnemy(enemyId: string) {
  return enemies[enemyId];
}

export function calculateDamage(attacker: { strength: number }, defender: { defense: number }): number {
  const baseDamage = attacker.strength;
  const reduction = defender.defense * 0.5;
  const damage = Math.max(1, Math.floor(baseDamage - reduction + (Math.random() * 6 - 3)));
  return damage;
}

export function checkRequirement(state: GameState, choice: Choice): boolean {
  if (!choice.requirement) return true;

  const { type, id, stat, value } = choice.requirement;

  switch (type) {
    case "item":
      return state.inventory.some((item) => item.id === id);
    case "stat":
      if (stat && value !== undefined) {
        const statValue = state.character[stat as keyof typeof state.character];
        return typeof statValue === "number" && statValue >= value;
      }
      return true;
    case "gold":
      return value !== undefined && state.character.gold >= value;
    default:
      return true;
  }
}

export function processChoice(state: GameState, choice: Choice): GameState {
  let newState = { ...state };
  newState.character = { ...state.character };
  newState.inventory = [...state.inventory];
  newState.messageLog = [...state.messageLog];
  newState.visitedLocations = [...state.visitedLocations];
  newState.defeatedEnemies = [...state.defeatedEnemies];
  newState.storyFlags = { ...state.storyFlags };

  // Deduct gold if required
  if (choice.requirement?.type === "gold" && choice.requirement.value) {
    newState.character.gold -= choice.requirement.value;
    newState.messageLog.push(`You paid ${choice.requirement.value} gold.`);
  }

  // Handle action
  if (choice.action === "item" && choice.itemId) {
    const item = getItem(choice.itemId);
    if (item) {
      if (item.type === "potion") {
        // Use potion immediately
        if (item.effect) {
          const statKey = item.effect.stat;
          if (statKey === "health") {
            newState.character.health = Math.min(
              newState.character.maxHealth,
              newState.character.health + item.effect.value
            );
            newState.messageLog.push(`You used ${item.name} and restored ${item.effect.value} health!`);
          }
        }
      } else {
        // Check if we already have this item (except for consumables)
        const alreadyHas = newState.inventory.some((i) => i.id === item.id);
        if (!alreadyHas) {
          newState.inventory.push(item);
          newState.messageLog.push(`You obtained: ${item.name}!`);

          // Apply stat bonuses
          if (item.effect && item.effect.stat !== "health" && item.effect.stat !== "name") {
            const stat = item.effect.stat;
            (newState.character[stat] as number) += item.effect.value;
            newState.messageLog.push(`Your ${stat} increased by ${item.effect.value}!`);
          }
        } else {
          newState.messageLog.push(`You already have: ${item.name}`);
        }
      }
    }
  }

  if (choice.action === "combat" && choice.enemyId) {
    const enemy = getEnemy(choice.enemyId);
    if (enemy) {
      newState.combatState = {
        enemy: { ...enemy },
        playerTurn: true,
        turnCount: 1,
      };
      newState.messageLog.push(`Combat begins with ${enemy.name}!`);
    }
  }

  // Change location
  if (choice.nextLocationId && !newState.combatState) {
    newState.currentLocationId = choice.nextLocationId;
    if (!newState.visitedLocations.includes(choice.nextLocationId)) {
      newState.visitedLocations.push(choice.nextLocationId);
    }

    // Process onEnter effects
    const newLocation = getLocation(choice.nextLocationId);
    if (newLocation?.onEnter) {
      const effect = newLocation.onEnter;
      switch (effect.type) {
        case "heal":
          newState.character.health = Math.min(
            newState.character.maxHealth,
            newState.character.health + (effect.value || 0)
          );
          newState.messageLog.push(`You feel refreshed! Health restored.`);
          break;
        case "damage":
          newState.character.health -= effect.value || 0;
          newState.messageLog.push(`You took ${effect.value} damage!`);
          break;
        case "addGold":
          newState.character.gold += effect.value || 0;
          newState.messageLog.push(`You gained ${effect.value} gold!`);
          break;
        case "addItem":
          if (effect.itemId) {
            const item = getItem(effect.itemId);
            if (item && !newState.inventory.some((i) => i.id === item.id)) {
              newState.inventory.push(item);
              newState.messageLog.push(`You received: ${item.name}!`);
            }
          }
          break;
      }
    }
  }

  return newState;
}

export function processCombatAction(
  state: GameState,
  action: "attack" | "defend" | "flee" | "usePotion"
): GameState {
  if (!state.combatState) return state;

  let newState = { ...state };
  newState.character = { ...state.character };
  newState.combatState = { ...state.combatState, enemy: { ...state.combatState.enemy } };
  newState.messageLog = [...state.messageLog];
  newState.inventory = [...state.inventory];
  newState.defeatedEnemies = [...state.defeatedEnemies];

  const enemy = newState.combatState.enemy;

  // Player action
  switch (action) {
    case "attack": {
      const damage = calculateDamage(newState.character, enemy);
      enemy.health -= damage;
      newState.messageLog.push(`You deal ${damage} damage to ${enemy.name}!`);
      break;
    }
    case "defend": {
      newState.storyFlags.defending = true;
      newState.messageLog.push("You take a defensive stance!");
      break;
    }
    case "flee": {
      if (Math.random() > 0.5) {
        newState.combatState = null;
        newState.messageLog.push("You managed to escape!");
        return newState;
      } else {
        newState.messageLog.push("You failed to escape!");
      }
      break;
    }
    case "usePotion": {
      const potionIndex = newState.inventory.findIndex((i) => i.type === "potion");
      const potion = newState.inventory[potionIndex];
      if (potionIndex !== -1 && potion) {
        if (potion.effect) {
          newState.character.health = Math.min(
            newState.character.maxHealth,
            newState.character.health + potion.effect.value
          );
          newState.messageLog.push(`You used ${potion.name} and restored ${potion.effect.value} health!`);
        }
        newState.inventory.splice(potionIndex, 1);
      } else {
        newState.messageLog.push("You don't have any potions!");
      }
      break;
    }
  }

  // Check if enemy defeated
  if (enemy.health <= 0) {
    newState.messageLog.push(`You defeated ${enemy.name}!`);
    newState.messageLog.push(`Gained ${enemy.experienceReward} XP and ${enemy.goldReward} gold!`);
    newState.character.experience += enemy.experienceReward;
    newState.character.gold += enemy.goldReward;
    newState.defeatedEnemies.push(enemy.id);

    // Check for level up
    const xpNeeded = newState.character.level * 50;
    if (newState.character.experience >= xpNeeded) {
      newState.character.level++;
      newState.character.experience -= xpNeeded;
      newState.character.maxHealth += 10;
      newState.character.health = newState.character.maxHealth;
      newState.character.strength += 2;
      newState.character.defense += 1;
      newState.messageLog.push(`LEVEL UP! You are now level ${newState.character.level}!`);
    }

    newState.combatState = null;

    // Find the current location's combat choice to get the next location
    const currentLocation = getLocation(state.currentLocationId);
    const combatChoice = currentLocation?.choices.find(
      (c) => c.action === "combat" && c.enemyId === enemy.id
    );
    if (combatChoice?.nextLocationId) {
      newState.currentLocationId = combatChoice.nextLocationId;
      if (!newState.visitedLocations.includes(combatChoice.nextLocationId)) {
        newState.visitedLocations.push(combatChoice.nextLocationId);
      }
    }

    return newState;
  }

  // Enemy turn
  let damageMultiplier = 1;
  if (newState.storyFlags.defending) {
    damageMultiplier = 0.5;
    delete newState.storyFlags.defending;
  }

  const enemyDamage = Math.floor(calculateDamage(enemy, newState.character) * damageMultiplier);
  newState.character.health -= enemyDamage;
  newState.messageLog.push(`${enemy.name} deals ${enemyDamage} damage to you!`);

  // Check if player defeated
  if (newState.character.health <= 0) {
    newState.messageLog.push("You have been defeated...");
    newState.combatState = null;
  }

  newState.combatState!.turnCount++;

  return newState;
}

export function isGameOver(state: GameState): boolean {
  return state.character.health <= 0;
}
