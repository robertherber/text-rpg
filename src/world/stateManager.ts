// State Manager for applying state changes to WorldState

import type { WorldState, StateChange, WorldItem } from "./types";

/**
 * Apply an array of state changes to a WorldState immutably.
 * Returns a new WorldState with the changes applied.
 */
export function applyStateChanges(
  state: WorldState,
  changes: StateChange[]
): WorldState {
  let newState = { ...state };

  for (const change of changes) {
    newState = applySingleChange(newState, change);
  }

  return newState;
}

/**
 * Apply a single state change to a WorldState.
 * Returns a new WorldState with the change applied.
 */
function applySingleChange(state: WorldState, change: StateChange): WorldState {
  switch (change.type) {
    case "move_player":
      return handleMovePlayer(state, change.data);

    case "add_item":
      return handleAddItem(state, change.data);

    case "remove_item":
      return handleRemoveItem(state, change.data);

    case "gold_change":
      return handleGoldChange(state, change.data);

    case "player_damage":
      return handlePlayerDamage(state, change.data);

    case "player_heal":
      return handlePlayerHeal(state, change.data);

    case "add_knowledge":
      return handleAddKnowledge(state, change.data);

    default:
      // Unknown state change type - return state unchanged
      // Future stories will add more handlers
      console.warn(`Unknown state change type: ${change.type}`);
      return state;
  }
}

/**
 * Handle move_player state change
 * data: { locationId: string }
 */
function handleMovePlayer(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { locationId } = data;

  if (!locationId || typeof locationId !== "string") {
    console.warn("move_player: invalid locationId");
    return state;
  }

  // Update player's current location
  const newPlayer = {
    ...state.player,
    currentLocationId: locationId,
  };

  // Update the location's lastVisitedAtAction
  const newLocations = { ...state.locations };
  if (newLocations[locationId]) {
    newLocations[locationId] = {
      ...newLocations[locationId],
      lastVisitedAtAction: state.actionCounter,
    };
  }

  return {
    ...state,
    player: newPlayer,
    locations: newLocations,
  };
}

/**
 * Handle add_item state change
 * data: { item: WorldItem } OR { item: WorldItem, toLocation: string } OR { item: WorldItem, toNpc: string }
 */
function handleAddItem(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { item, toLocation, toNpc } = data;

  if (!item || typeof item !== "object") {
    console.warn("add_item: invalid item data");
    return state;
  }

  const worldItem: WorldItem = {
    id: item.id || `item_${Date.now()}`,
    name: item.name || "Unknown Item",
    description: item.description || "",
    type: item.type || "misc",
    value: item.value || 0,
    effect: item.effect,
  };

  // Add to NPC inventory
  if (toNpc && typeof toNpc === "string" && state.npcs[toNpc]) {
    const newNpcs = { ...state.npcs };
    newNpcs[toNpc] = {
      ...newNpcs[toNpc],
      inventory: [...newNpcs[toNpc].inventory, worldItem],
    };
    return { ...state, npcs: newNpcs };
  }

  // Add to location
  if (toLocation && typeof toLocation === "string" && state.locations[toLocation]) {
    const newLocations = { ...state.locations };
    newLocations[toLocation] = {
      ...newLocations[toLocation],
      items: [...newLocations[toLocation].items, worldItem],
    };
    return { ...state, locations: newLocations };
  }

  // Default: add to player inventory
  const newPlayer = {
    ...state.player,
    inventory: [...state.player.inventory, worldItem],
  };

  return { ...state, player: newPlayer };
}

/**
 * Handle remove_item state change
 * data: { itemId: string } OR { itemId: string, fromLocation: string } OR { itemId: string, fromNpc: string }
 */
function handleRemoveItem(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { itemId, fromLocation, fromNpc } = data;

  if (!itemId || typeof itemId !== "string") {
    console.warn("remove_item: invalid itemId");
    return state;
  }

  // Remove from NPC inventory
  if (fromNpc && typeof fromNpc === "string" && state.npcs[fromNpc]) {
    const newNpcs = { ...state.npcs };
    newNpcs[fromNpc] = {
      ...newNpcs[fromNpc],
      inventory: newNpcs[fromNpc].inventory.filter((i) => i.id !== itemId),
    };
    return { ...state, npcs: newNpcs };
  }

  // Remove from location
  if (fromLocation && typeof fromLocation === "string" && state.locations[fromLocation]) {
    const newLocations = { ...state.locations };
    newLocations[fromLocation] = {
      ...newLocations[fromLocation],
      items: newLocations[fromLocation].items.filter((i) => i.id !== itemId),
    };
    return { ...state, locations: newLocations };
  }

  // Default: remove from player inventory
  const newPlayer = {
    ...state.player,
    inventory: state.player.inventory.filter((i) => i.id !== itemId),
  };

  return { ...state, player: newPlayer };
}

/**
 * Handle gold_change state change
 * data: { amount: number }
 */
function handleGoldChange(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { amount } = data;

  if (typeof amount !== "number") {
    console.warn("gold_change: invalid amount");
    return state;
  }

  const newGold = Math.max(0, state.player.gold + amount);

  return {
    ...state,
    player: {
      ...state.player,
      gold: newGold,
    },
  };
}

/**
 * Handle player_damage state change
 * data: { amount: number }
 */
function handlePlayerDamage(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { amount } = data;

  if (typeof amount !== "number" || amount < 0) {
    console.warn("player_damage: invalid amount");
    return state;
  }

  const newHealth = Math.max(0, state.player.health - amount);

  return {
    ...state,
    player: {
      ...state.player,
      health: newHealth,
    },
  };
}

/**
 * Handle player_heal state change
 * data: { amount: number }
 */
function handlePlayerHeal(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { amount } = data;

  if (typeof amount !== "number" || amount < 0) {
    console.warn("player_heal: invalid amount");
    return state;
  }

  const newHealth = Math.min(state.player.maxHealth, state.player.health + amount);

  return {
    ...state,
    player: {
      ...state.player,
      health: newHealth,
    },
  };
}

/**
 * Handle add_knowledge state change
 * data: { knowledgeType: "locations" | "npcs" | "lore" | "recipes", value: string }
 * OR data: { skill: string, level: string }
 */
function handleAddKnowledge(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { knowledgeType, value, skill, level } = data;

  // Handle skill knowledge
  if (skill && typeof skill === "string") {
    const newSkills = {
      ...state.player.knowledge.skills,
      [skill]: level || "novice",
    };
    return {
      ...state,
      player: {
        ...state.player,
        knowledge: {
          ...state.player.knowledge,
          skills: newSkills,
        },
      },
    };
  }

  // Handle other knowledge types
  if (!knowledgeType || !value || typeof value !== "string") {
    console.warn("add_knowledge: invalid knowledgeType or value");
    return state;
  }

  const validTypes = ["locations", "npcs", "lore", "recipes"] as const;
  if (!validTypes.includes(knowledgeType as any)) {
    console.warn(`add_knowledge: invalid knowledgeType: ${knowledgeType}`);
    return state;
  }

  const knowledgeKey = knowledgeType as "locations" | "npcs" | "lore" | "recipes";
  const currentKnowledge = state.player.knowledge[knowledgeKey];

  // Don't add duplicates
  if (currentKnowledge.includes(value)) {
    return state;
  }

  return {
    ...state,
    player: {
      ...state.player,
      knowledge: {
        ...state.player.knowledge,
        [knowledgeKey]: [...currentKnowledge, value],
      },
    },
  };
}
