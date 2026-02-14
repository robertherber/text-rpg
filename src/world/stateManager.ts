// State Manager for applying state changes to WorldState

import type { WorldState, StateChange, WorldItem, Quest } from "./types";

/**
 * Validates whether the player knows about a referenced entity (location, NPC, or item).
 *
 * @param worldState - The current world state
 * @param reference - The reference string to validate (location/NPC id or name, or lore text)
 * @returns true if the player knows about the reference, false otherwise
 */
export function validateKnowledge(
  worldState: WorldState,
  reference: string
): boolean {
  if (!reference || typeof reference !== "string") {
    return false;
  }

  const normalizedRef = reference.toLowerCase().trim();
  const { knowledge } = worldState.player;

  // Check known location IDs
  if (knowledge.locations.some((locId) => locId.toLowerCase() === normalizedRef)) {
    return true;
  }

  // Check known location names
  for (const locId of knowledge.locations) {
    const location = worldState.locations[locId];
    if (location && location.name.toLowerCase().includes(normalizedRef)) {
      return true;
    }
  }

  // Check known NPC IDs
  if (knowledge.npcs.some((npcId) => npcId.toLowerCase() === normalizedRef)) {
    return true;
  }

  // Check known NPC names
  for (const npcId of knowledge.npcs) {
    const npc = worldState.npcs[npcId];
    if (npc && npc.name.toLowerCase().includes(normalizedRef)) {
      return true;
    }
  }

  // Check known lore
  if (knowledge.lore.some((lore) => lore.toLowerCase().includes(normalizedRef))) {
    return true;
  }

  // Check known recipes
  if (knowledge.recipes.some((recipe) => recipe.toLowerCase().includes(normalizedRef))) {
    return true;
  }

  // Check known skills
  const skillNames = Object.keys(knowledge.skills);
  if (skillNames.some((skill) => skill.toLowerCase().includes(normalizedRef))) {
    return true;
  }

  // Check items in player's inventory (players know about items they have)
  for (const item of worldState.player.inventory) {
    if (
      item.id.toLowerCase() === normalizedRef ||
      item.name.toLowerCase().includes(normalizedRef)
    ) {
      return true;
    }
  }

  // Check NPCs/locations at current location (visible things are known)
  const currentLocation = worldState.locations[worldState.player.currentLocationId];
  if (currentLocation) {
    // Check current location itself
    if (
      currentLocation.id.toLowerCase() === normalizedRef ||
      currentLocation.name.toLowerCase().includes(normalizedRef)
    ) {
      return true;
    }

    // Check items at current location
    for (const item of currentLocation.items) {
      if (
        item.id.toLowerCase() === normalizedRef ||
        item.name.toLowerCase().includes(normalizedRef)
      ) {
        return true;
      }
    }

    // Check structures at current location
    for (const structure of currentLocation.structures) {
      if (
        structure.id.toLowerCase() === normalizedRef ||
        structure.name.toLowerCase().includes(normalizedRef)
      ) {
        return true;
      }
    }

    // Check NPCs present at current location
    for (const npcId of currentLocation.presentNpcIds) {
      const npc = worldState.npcs[npcId];
      if (
        npc &&
        npc.isAlive &&
        (npcId.toLowerCase() === normalizedRef ||
          npc.name.toLowerCase().includes(normalizedRef))
      ) {
        return true;
      }
    }
  }

  // Check companions (player always knows their companions)
  for (const companionId of worldState.player.companionIds) {
    const companion = worldState.npcs[companionId];
    if (
      companion &&
      (companionId.toLowerCase() === normalizedRef ||
        companion.name.toLowerCase().includes(normalizedRef))
    ) {
      return true;
    }
  }

  return false;
}

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

    case "move_npc":
      return handleMoveNpc(state, change.data);

    case "update_npc_attitude":
      return handleUpdateNpcAttitude(state, change.data);

    case "npc_death":
      return handleNpcDeath(state, change.data);

    case "add_companion":
      return handleAddCompanion(state, change.data);

    case "remove_companion":
      return handleRemoveCompanion(state, change.data);

    case "create_npc":
      return handleCreateNpc(state, change.data);

    case "create_location":
      return handleCreateLocation(state, change.data);

    case "update_location":
      return handleUpdateLocation(state, change.data);

    case "create_structure":
      return handleCreateStructure(state, change.data);

    case "destroy_structure":
      return handleDestroyStructure(state, change.data);

    case "add_quest":
      return handleAddQuest(state, change.data);

    case "update_quest":
      return handleUpdateQuest(state, change.data);

    case "update_faction":
      return handleUpdateFaction(state, change.data);

    case "claim_home":
      return handleClaimHome(state, change.data);

    case "store_item_at_home":
      return handleStoreItemAtHome(state, change.data);

    case "retrieve_item_from_home":
      return handleRetrieveItemFromHome(state, change.data);

    case "companion_wait_at_home":
      return handleCompanionWaitAtHome(state, change.data);

    case "companion_rejoin":
      return handleCompanionRejoin(state, change.data);

    case "reveal_flashback":
      return handleRevealFlashback(state, change.data);

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

/**
 * Handle move_npc state change
 * data: { npcId: string, locationId: string }
 */
function handleMoveNpc(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { npcId, locationId } = data;

  if (!npcId || typeof npcId !== "string") {
    console.warn("move_npc: invalid npcId");
    return state;
  }

  if (!locationId || typeof locationId !== "string") {
    console.warn("move_npc: invalid locationId");
    return state;
  }

  const npc = state.npcs[npcId];
  if (!npc) {
    console.warn(`move_npc: NPC not found: ${npcId}`);
    return state;
  }

  const oldLocationId = npc.currentLocationId;

  // Update NPC's current location
  const newNpcs = {
    ...state.npcs,
    [npcId]: {
      ...npc,
      currentLocationId: locationId,
    },
  };

  // Update locations' presentNpcIds
  const newLocations = { ...state.locations };

  // Remove NPC from old location
  if (oldLocationId && newLocations[oldLocationId]) {
    newLocations[oldLocationId] = {
      ...newLocations[oldLocationId],
      presentNpcIds: newLocations[oldLocationId].presentNpcIds.filter(
        (id) => id !== npcId
      ),
    };
  }

  // Add NPC to new location
  if (newLocations[locationId]) {
    const currentIds = newLocations[locationId].presentNpcIds;
    if (!currentIds.includes(npcId)) {
      newLocations[locationId] = {
        ...newLocations[locationId],
        presentNpcIds: [...currentIds, npcId],
      };
    }
  }

  return {
    ...state,
    npcs: newNpcs,
    locations: newLocations,
  };
}

/**
 * Handle update_npc_attitude state change
 * data: { npcId: string, change: number } OR { npcId: string, attitude: number }
 */
function handleUpdateNpcAttitude(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { npcId, change, attitude } = data;

  if (!npcId || typeof npcId !== "string") {
    console.warn("update_npc_attitude: invalid npcId");
    return state;
  }

  const npc = state.npcs[npcId];
  if (!npc) {
    console.warn(`update_npc_attitude: NPC not found: ${npcId}`);
    return state;
  }

  let newAttitude: number;

  if (typeof attitude === "number") {
    // Set absolute attitude
    newAttitude = attitude;
  } else if (typeof change === "number") {
    // Apply relative change
    newAttitude = npc.attitude + change;
  } else {
    console.warn("update_npc_attitude: invalid change or attitude value");
    return state;
  }

  // Clamp attitude to -100 to 100
  newAttitude = Math.max(-100, Math.min(100, newAttitude));

  return {
    ...state,
    npcs: {
      ...state.npcs,
      [npcId]: {
        ...npc,
        attitude: newAttitude,
      },
    },
  };
}

/**
 * Handle npc_death state change
 * data: { npcId: string, deathDescription: string }
 */
function handleNpcDeath(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { npcId, deathDescription } = data;

  if (!npcId || typeof npcId !== "string") {
    console.warn("npc_death: invalid npcId");
    return state;
  }

  const npc = state.npcs[npcId];
  if (!npc) {
    console.warn(`npc_death: NPC not found: ${npcId}`);
    return state;
  }

  const newNpcs = {
    ...state.npcs,
    [npcId]: {
      ...npc,
      isAlive: false,
      deathDescription: deathDescription || "met an untimely end",
      stats: {
        ...npc.stats,
        health: 0,
      },
    },
  };

  // If the NPC was a companion, remove them from companions
  let newPlayer = state.player;
  if (npc.isCompanion && state.player.companionIds.includes(npcId)) {
    newPlayer = {
      ...state.player,
      companionIds: state.player.companionIds.filter((id) => id !== npcId),
    };
  }

  return {
    ...state,
    npcs: newNpcs,
    player: newPlayer,
  };
}

/**
 * Handle add_companion state change
 * data: { npcId: string }
 */
function handleAddCompanion(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { npcId } = data;

  if (!npcId || typeof npcId !== "string") {
    console.warn("add_companion: invalid npcId");
    return state;
  }

  const npc = state.npcs[npcId];
  if (!npc) {
    console.warn(`add_companion: NPC not found: ${npcId}`);
    return state;
  }

  // Don't add if already a companion
  if (state.player.companionIds.includes(npcId)) {
    return state;
  }

  // Update NPC to be a companion
  const newNpcs = {
    ...state.npcs,
    [npcId]: {
      ...npc,
      isCompanion: true,
    },
  };

  // Add to player's companion list
  const newPlayer = {
    ...state.player,
    companionIds: [...state.player.companionIds, npcId],
  };

  return {
    ...state,
    npcs: newNpcs,
    player: newPlayer,
  };
}

/**
 * Handle remove_companion state change
 * data: { npcId: string }
 */
function handleRemoveCompanion(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { npcId } = data;

  if (!npcId || typeof npcId !== "string") {
    console.warn("remove_companion: invalid npcId");
    return state;
  }

  const npc = state.npcs[npcId];
  if (!npc) {
    console.warn(`remove_companion: NPC not found: ${npcId}`);
    return state;
  }

  // Update NPC to no longer be a companion
  const newNpcs = {
    ...state.npcs,
    [npcId]: {
      ...npc,
      isCompanion: false,
    },
  };

  // Remove from player's companion list
  const newPlayer = {
    ...state.player,
    companionIds: state.player.companionIds.filter((id) => id !== npcId),
  };

  return {
    ...state,
    npcs: newNpcs,
    player: newPlayer,
  };
}

/**
 * Handle create_npc state change (for dynamically generated NPCs)
 * data: { npc: NPC } (full NPC object)
 */
function handleCreateNpc(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { npc } = data;

  if (!npc || typeof npc !== "object") {
    console.warn("create_npc: invalid npc data");
    return state;
  }

  // Generate ID if not provided
  const npcId = npc.id || `npc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create a complete NPC with defaults for any missing fields
  const newNpc: import("./types").NPC = {
    id: npcId,
    name: npc.name || "Unknown Stranger",
    description: npc.description || "",
    physicalDescription: npc.physicalDescription || "",
    soulInstruction: npc.soulInstruction || "",
    currentLocationId: npc.currentLocationId || state.player.currentLocationId,
    homeLocationId: npc.homeLocationId,
    knowledge: npc.knowledge || [],
    conversationHistory: npc.conversationHistory || [],
    playerNameKnown: npc.playerNameKnown,
    attitude: npc.attitude ?? 0,
    isCompanion: npc.isCompanion ?? false,
    isAnimal: npc.isAnimal ?? false,
    inventory: npc.inventory || [],
    stats: npc.stats || {
      health: 50,
      maxHealth: 50,
      strength: 5,
      defense: 5,
    },
    isAlive: npc.isAlive ?? true,
    deathDescription: npc.deathDescription,
    burialLocationId: npc.burialLocationId,
    isCanonical: false, // Dynamically created NPCs are not canonical
    factionIds: npc.factionIds || [],
  };

  // Add NPC to state
  const newNpcs = {
    ...state.npcs,
    [npcId]: newNpc,
  };

  // Add NPC to their current location's presentNpcIds
  const locationId = newNpc.currentLocationId;
  let newLocations = state.locations;

  if (locationId && newLocations[locationId]) {
    const currentIds = newLocations[locationId].presentNpcIds;
    if (!currentIds.includes(npcId)) {
      newLocations = {
        ...newLocations,
        [locationId]: {
          ...newLocations[locationId],
          presentNpcIds: [...currentIds, npcId],
        },
      };
    }
  }

  return {
    ...state,
    npcs: newNpcs,
    locations: newLocations,
  };
}

/**
 * Handle create_location state change (for dynamically generated locations)
 * data: { location: Location } OR { location: Location, direction: string, fromLocationId: string }
 *
 * If direction and fromLocationId are provided, coordinates are calculated automatically.
 * Direction can be: "north", "south", "east", "west", "northeast", "northwest", "southeast", "southwest"
 */
function handleCreateLocation(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { location, direction, fromLocationId } = data;

  if (!location || typeof location !== "object") {
    console.warn("create_location: invalid location data");
    return state;
  }

  // Generate ID if not provided
  const locationId =
    location.id ||
    `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Calculate coordinates based on direction if provided
  let coordinates = location.coordinates;

  if (direction && fromLocationId) {
    const fromLocation = state.locations[fromLocationId];
    if (fromLocation) {
      coordinates = calculateCoordinatesFromDirection(
        fromLocation.coordinates,
        direction
      );
    }
  }

  // If still no coordinates, default to (0, 0) - though this shouldn't happen normally
  if (!coordinates) {
    console.warn("create_location: no coordinates provided, defaulting to (0, 0)");
    coordinates = { x: 0, y: 0 };
  }

  // Create a complete Location with defaults for any missing fields
  const newLocation: import("./types").Location = {
    id: locationId,
    name: location.name || "Unknown Location",
    description: location.description || "",
    imagePrompt: location.imagePrompt || location.description || "",
    coordinates,
    terrain: location.terrain || "plains",
    dangerLevel: location.dangerLevel ?? 0,
    presentNpcIds: location.presentNpcIds || [],
    items: location.items || [],
    structures: location.structures || [],
    notes: location.notes || [],
    isCanonical: false, // Dynamically created locations are not canonical
    lastVisitedAtAction: undefined,
    imageStateHash: undefined,
  };

  // Add location to state
  const newLocations = {
    ...state.locations,
    [locationId]: newLocation,
  };

  return {
    ...state,
    locations: newLocations,
  };
}

/**
 * Calculate new coordinates based on direction from a starting point
 */
function calculateCoordinatesFromDirection(
  from: import("./types").Coordinates,
  direction: string
): import("./types").Coordinates {
  const directionMap: Record<string, { dx: number; dy: number }> = {
    north: { dx: 0, dy: 1 },
    south: { dx: 0, dy: -1 },
    east: { dx: 1, dy: 0 },
    west: { dx: -1, dy: 0 },
    northeast: { dx: 1, dy: 1 },
    northwest: { dx: -1, dy: 1 },
    southeast: { dx: 1, dy: -1 },
    southwest: { dx: -1, dy: -1 },
  };

  const delta = directionMap[direction.toLowerCase()] || { dx: 0, dy: 0 };

  return {
    x: from.x + delta.dx,
    y: from.y + delta.dy,
  };
}

/**
 * Handle update_location state change
 * data: { locationId: string, updates: Partial<Location> }
 */
function handleUpdateLocation(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { locationId, updates } = data;

  if (!locationId || typeof locationId !== "string") {
    console.warn("update_location: invalid locationId");
    return state;
  }

  const location = state.locations[locationId];
  if (!location) {
    console.warn(`update_location: location not found: ${locationId}`);
    return state;
  }

  if (!updates || typeof updates !== "object") {
    console.warn("update_location: invalid updates");
    return state;
  }

  // Don't allow changing id or coordinates directly (use create_location for new locations)
  const { id, coordinates, ...safeUpdates } = updates;

  // Merge updates into existing location
  const updatedLocation = {
    ...location,
    ...safeUpdates,
  };

  return {
    ...state,
    locations: {
      ...state.locations,
      [locationId]: updatedLocation,
    },
  };
}

/**
 * Handle create_structure state change
 * data: { structure: Structure, locationId?: string }
 *
 * If locationId is not provided, structure is created at player's current location.
 */
function handleCreateStructure(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { structure, locationId } = data;

  if (!structure || typeof structure !== "object") {
    console.warn("create_structure: invalid structure data");
    return state;
  }

  const targetLocationId = locationId || state.player.currentLocationId;
  const location = state.locations[targetLocationId];

  if (!location) {
    console.warn(`create_structure: location not found: ${targetLocationId}`);
    return state;
  }

  // Generate ID if not provided
  const structureId =
    structure.id ||
    `struct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create a complete Structure with defaults for any missing fields
  const newStructure: import("./types").Structure = {
    id: structureId,
    name: structure.name || "Unknown Structure",
    description: structure.description || "",
    type: structure.type || "marker",
    builtAtAction: structure.builtAtAction ?? state.actionCounter,
    ownerId: structure.ownerId,
  };

  // Add structure to location
  const updatedLocation = {
    ...location,
    structures: [...location.structures, newStructure],
  };

  return {
    ...state,
    locations: {
      ...state.locations,
      [targetLocationId]: updatedLocation,
    },
  };
}

/**
 * Handle destroy_structure state change
 * data: { structureId: string, locationId?: string }
 *
 * If locationId is not provided, searches in player's current location.
 */
function handleDestroyStructure(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { structureId, locationId } = data;

  if (!structureId || typeof structureId !== "string") {
    console.warn("destroy_structure: invalid structureId");
    return state;
  }

  const targetLocationId = locationId || state.player.currentLocationId;
  const location = state.locations[targetLocationId];

  if (!location) {
    console.warn(`destroy_structure: location not found: ${targetLocationId}`);
    return state;
  }

  // Check if structure exists
  const structureExists = location.structures.some((s) => s.id === structureId);
  if (!structureExists) {
    console.warn(`destroy_structure: structure not found: ${structureId}`);
    return state;
  }

  // Remove structure from location
  const updatedLocation = {
    ...location,
    structures: location.structures.filter((s) => s.id !== structureId),
  };

  return {
    ...state,
    locations: {
      ...state.locations,
      [targetLocationId]: updatedLocation,
    },
  };
}

/**
 * Handle player death with world persistence.
 *
 * This function:
 * - Adds the current character to the deceasedHeroes array
 * - Records death location and major deeds
 * - Leaves player's items at death location
 * - Marks companions as scattered (no longer following)
 * - Returns modified WorldState ready for a new character
 *
 * @param worldState - The current world state
 * @param deathDescription - A narrative description of how the player died
 * @returns A new WorldState with death processed
 */
export function handlePlayerDeath(
  worldState: WorldState,
  deathDescription: string
): WorldState {
  const { player, npcs, locations, eventHistory, actionCounter } = worldState;

  // Gather major deeds from significant events
  const majorDeeds: string[] = eventHistory
    .filter(
      (event) =>
        event.isSignificant &&
        (event.type === "combat" ||
          event.type === "quest" ||
          event.type === "discovery" ||
          event.type === "relationship")
    )
    .map((event) => event.description)
    .slice(-10); // Keep last 10 significant deeds

  // Create the deceased hero record
  const deceasedHero: import("./types").DeceasedHero = {
    id: `hero_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: player.name,
    physicalDescription: player.physicalDescription,
    origin: player.origin,
    diedAtAction: actionCounter,
    deathDescription: deathDescription || "met an untimely end",
    deathLocationId: player.currentLocationId,
    majorDeeds,
    itemsLeftBehind: [
      {
        locationId: player.currentLocationId,
        items: [...player.inventory],
      },
    ],
    knownByNpcIds: Object.keys(npcs).filter((npcId) => {
      const npc = npcs[npcId];
      return (
        npc &&
        npc.isAlive &&
        (npc.conversationHistory.length > 0 ||
          npc.playerNameKnown ||
          npc.isCompanion)
      );
    }),
    buriedBy: undefined,
    graveLocationId: undefined,
  };

  // Leave player's items at death location
  const deathLocation = locations[player.currentLocationId];
  let newLocations = { ...locations };

  if (deathLocation) {
    newLocations[player.currentLocationId] = {
      ...deathLocation,
      items: [...deathLocation.items, ...player.inventory],
    };
  }

  // Mark companions as scattered (no longer following)
  let newNpcs = { ...npcs };
  for (const companionId of player.companionIds) {
    const companion = npcs[companionId];
    if (companion && companion.isAlive) {
      newNpcs[companionId] = {
        ...companion,
        isCompanion: false,
        // Companions stay at their current location (which is player's death location)
      };
    }
  }

  // Add death event to history
  const deathEvent: import("./types").WorldEvent = {
    id: `event_death_${actionCounter}`,
    actionNumber: actionCounter,
    description: deathDescription || "The hero fell",
    type: "death",
    involvedNpcIds: [],
    locationId: player.currentLocationId,
    isSignificant: true,
  };

  // Create a fresh player state ready for new character creation
  // This resets player stats but keeps the world intact
  const freshPlayer: import("./types").Player = {
    name: undefined,
    physicalDescription: "",
    hiddenBackstory: "",
    revealedBackstory: [],
    origin: "",
    currentLocationId: "loc_village_square", // Start at village
    homeLocationId: undefined,
    health: 100,
    maxHealth: 100,
    strength: 10,
    defense: 10,
    magic: 5,
    level: 1,
    experience: 0,
    gold: 0,
    inventory: [],
    companionIds: [],
    knowledge: {
      locations: ["loc_village_square"],
      npcs: [],
      lore: [],
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
    marriedToNpcId: undefined,
    childrenNpcIds: [],
  };

  return {
    ...worldState,
    player: freshPlayer,
    npcs: newNpcs,
    locations: newLocations,
    deceasedHeroes: [...worldState.deceasedHeroes, deceasedHero],
    eventHistory: [...worldState.eventHistory, deathEvent],
  };
}

/**
 * Handle add_quest state change
 * data: { quest: Quest } (full Quest object) OR { title, description, giverNpcId, objectives, rewards? }
 *
 * Creates a new quest and stores it in worldState.quests
 */
function handleAddQuest(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { quest, title, description, giverNpcId, objectives, rewards } = data;

  // Support both full quest object or individual fields
  const questData = quest || { title, description, giverNpcId, objectives, rewards };

  if (!questData.title || typeof questData.title !== "string") {
    console.warn("add_quest: invalid or missing title");
    return state;
  }

  if (!questData.giverNpcId || typeof questData.giverNpcId !== "string") {
    console.warn("add_quest: invalid or missing giverNpcId");
    return state;
  }

  if (!questData.objectives || !Array.isArray(questData.objectives) || questData.objectives.length === 0) {
    console.warn("add_quest: invalid or missing objectives");
    return state;
  }

  // Generate ID if not provided
  const questId =
    questData.id ||
    `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Don't add duplicate quests
  if (state.quests[questId]) {
    console.warn(`add_quest: quest already exists: ${questId}`);
    return state;
  }

  // Create a complete Quest object
  const newQuest: Quest = {
    id: questId,
    title: questData.title,
    description: questData.description || "",
    giverNpcId: questData.giverNpcId,
    status: "active",
    objectives: questData.objectives,
    completedObjectives: [],
    rewards: questData.rewards,
  };

  return {
    ...state,
    quests: {
      ...state.quests,
      [questId]: newQuest,
    },
  };
}

/**
 * Handle update_quest state change
 * data: { questId: string, status?: Quest["status"], completedObjectives?: string[] }
 *
 * Updates an existing quest's status and/or marks objectives as complete
 */
function handleUpdateQuest(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { questId, status, completedObjectives } = data;

  if (!questId || typeof questId !== "string") {
    console.warn("update_quest: invalid questId");
    return state;
  }

  const existingQuest = state.quests[questId];
  if (!existingQuest) {
    console.warn(`update_quest: quest not found: ${questId}`);
    return state;
  }

  // Build updated quest
  let updatedQuest = { ...existingQuest };

  // Update status if provided
  if (status && ["active", "completed", "failed", "impossible"].includes(status)) {
    updatedQuest.status = status;
  }

  // Add completed objectives if provided (without duplicates)
  if (completedObjectives && Array.isArray(completedObjectives)) {
    const newCompletedObjectives = [...updatedQuest.completedObjectives];
    for (const objective of completedObjectives) {
      if (typeof objective === "string" && !newCompletedObjectives.includes(objective)) {
        newCompletedObjectives.push(objective);
      }
    }
    updatedQuest.completedObjectives = newCompletedObjectives;

    // Auto-complete quest if all objectives are completed
    if (
      updatedQuest.status === "active" &&
      updatedQuest.objectives.every((obj) => newCompletedObjectives.includes(obj))
    ) {
      updatedQuest.status = "completed";
    }
  }

  return {
    ...state,
    quests: {
      ...state.quests,
      [questId]: updatedQuest,
    },
  };
}

/**
 * Handle update_faction state change
 * data: { factionId: string, reputationChange?: number, reputation?: number }
 *
 * Updates player's reputation with a faction. Can use either:
 * - `reputationChange`: relative change (e.g., +10 or -5)
 * - `reputation`: absolute value to set (e.g., 50)
 *
 * Reputation is clamped to -100 to 100 range.
 */
function handleUpdateFaction(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { factionId, reputationChange, reputation } = data;

  if (!factionId || typeof factionId !== "string") {
    console.warn("update_faction: invalid factionId");
    return state;
  }

  const existingFaction = state.factions[factionId];
  if (!existingFaction) {
    console.warn(`update_faction: faction not found: ${factionId}`);
    return state;
  }

  let newReputation: number;

  if (typeof reputation === "number") {
    // Set absolute reputation
    newReputation = reputation;
  } else if (typeof reputationChange === "number") {
    // Apply relative change
    newReputation = existingFaction.playerReputation + reputationChange;
  } else {
    console.warn("update_faction: invalid reputationChange or reputation value");
    return state;
  }

  // Clamp reputation to -100 to 100
  newReputation = Math.max(-100, Math.min(100, newReputation));

  return {
    ...state,
    factions: {
      ...state.factions,
      [factionId]: {
        ...existingFaction,
        playerReputation: newReputation,
      },
    },
  };
}

// ===== Home Ownership System =====

/**
 * Handle claim_home state change
 * data: { locationId?: string }
 *
 * Claims a location as the player's home. If no locationId is provided,
 * the current location is claimed. Only structures of type "house" or
 * locations without restrictions can be claimed as homes.
 */
function handleClaimHome(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { locationId } = data;
  const targetLocationId = locationId || state.player.currentLocationId;

  const location = state.locations[targetLocationId];
  if (!location) {
    console.warn(`claim_home: location not found: ${targetLocationId}`);
    return state;
  }

  // Set the player's home location
  return {
    ...state,
    player: {
      ...state.player,
      homeLocationId: targetLocationId,
    },
  };
}

/**
 * Handle store_item_at_home state change
 * data: { itemId: string }
 *
 * Moves an item from the player's inventory to their home location.
 * Player must have a home set and must possess the item.
 */
function handleStoreItemAtHome(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { itemId } = data;

  if (!itemId || typeof itemId !== "string") {
    console.warn("store_item_at_home: invalid itemId");
    return state;
  }

  const homeLocationId = state.player.homeLocationId;
  if (!homeLocationId) {
    console.warn("store_item_at_home: player has no home");
    return state;
  }

  const homeLocation = state.locations[homeLocationId];
  if (!homeLocation) {
    console.warn(`store_item_at_home: home location not found: ${homeLocationId}`);
    return state;
  }

  // Find the item in player's inventory
  const itemIndex = state.player.inventory.findIndex((i) => i.id === itemId);
  if (itemIndex === -1) {
    console.warn(`store_item_at_home: item not in inventory: ${itemId}`);
    return state;
  }

  const item = state.player.inventory[itemIndex]!;

  // Remove item from player inventory
  const newInventory = [...state.player.inventory];
  newInventory.splice(itemIndex, 1);

  // Add item to home location
  const newLocations = {
    ...state.locations,
    [homeLocationId]: {
      ...homeLocation,
      items: [...homeLocation.items, item],
    },
  };

  return {
    ...state,
    player: {
      ...state.player,
      inventory: newInventory,
    },
    locations: newLocations,
  };
}

/**
 * Handle retrieve_item_from_home state change
 * data: { itemId: string }
 *
 * Moves an item from the player's home location to their inventory.
 * Player must have a home set and must be at that location.
 */
function handleRetrieveItemFromHome(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { itemId } = data;

  if (!itemId || typeof itemId !== "string") {
    console.warn("retrieve_item_from_home: invalid itemId");
    return state;
  }

  const homeLocationId = state.player.homeLocationId;
  if (!homeLocationId) {
    console.warn("retrieve_item_from_home: player has no home");
    return state;
  }

  // Player must be at home to retrieve items
  if (state.player.currentLocationId !== homeLocationId) {
    console.warn("retrieve_item_from_home: player not at home");
    return state;
  }

  const homeLocation = state.locations[homeLocationId];
  if (!homeLocation) {
    console.warn(`retrieve_item_from_home: home location not found: ${homeLocationId}`);
    return state;
  }

  // Find the item at home location
  const itemIndex = homeLocation.items.findIndex((i) => i.id === itemId);
  if (itemIndex === -1) {
    console.warn(`retrieve_item_from_home: item not found at home: ${itemId}`);
    return state;
  }

  const item = homeLocation.items[itemIndex]!;

  // Remove item from home location
  const newHomeItems = [...homeLocation.items];
  newHomeItems.splice(itemIndex, 1);

  // Add item to player inventory
  return {
    ...state,
    player: {
      ...state.player,
      inventory: [...state.player.inventory, item],
    },
    locations: {
      ...state.locations,
      [homeLocationId]: {
        ...homeLocation,
        items: newHomeItems,
      },
    },
  };
}

/**
 * Handle companion_wait_at_home state change
 * data: { npcId: string }
 *
 * Makes a companion wait at the player's home location instead of following.
 * The companion remains a companion but is moved to the home location.
 */
function handleCompanionWaitAtHome(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { npcId } = data;

  if (!npcId || typeof npcId !== "string") {
    console.warn("companion_wait_at_home: invalid npcId");
    return state;
  }

  const homeLocationId = state.player.homeLocationId;
  if (!homeLocationId) {
    console.warn("companion_wait_at_home: player has no home");
    return state;
  }

  const npc = state.npcs[npcId];
  if (!npc) {
    console.warn(`companion_wait_at_home: NPC not found: ${npcId}`);
    return state;
  }

  if (!npc.isCompanion || !state.player.companionIds.includes(npcId)) {
    console.warn(`companion_wait_at_home: NPC is not a companion: ${npcId}`);
    return state;
  }

  const homeLocation = state.locations[homeLocationId];
  if (!homeLocation) {
    console.warn(`companion_wait_at_home: home location not found: ${homeLocationId}`);
    return state;
  }

  const oldLocationId = npc.currentLocationId;

  // Update NPC location to home and mark as waiting
  let newNpcs = { ...state.npcs };
  newNpcs[npcId] = {
    ...npc,
    currentLocationId: homeLocationId,
    // Companion remains a companion, just at home
  };

  // Update location presentNpcIds
  let newLocations = { ...state.locations };

  // Remove from old location
  if (oldLocationId && newLocations[oldLocationId]) {
    newLocations[oldLocationId] = {
      ...newLocations[oldLocationId],
      presentNpcIds: newLocations[oldLocationId].presentNpcIds.filter(
        (id) => id !== npcId
      ),
    };
  }

  // Add to home location (we validated homeLocation exists earlier)
  if (!newLocations[homeLocationId]!.presentNpcIds.includes(npcId)) {
    newLocations[homeLocationId] = {
      ...newLocations[homeLocationId]!,
      presentNpcIds: [...newLocations[homeLocationId]!.presentNpcIds, npcId],
    };
  }

  return {
    ...state,
    npcs: newNpcs,
    locations: newLocations,
  };
}

/**
 * Handle companion_rejoin state change
 * data: { npcId: string }
 *
 * Makes a companion who is waiting at home rejoin the player.
 * The companion is moved to the player's current location.
 */
function handleCompanionRejoin(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { npcId } = data;

  if (!npcId || typeof npcId !== "string") {
    console.warn("companion_rejoin: invalid npcId");
    return state;
  }

  const npc = state.npcs[npcId];
  if (!npc) {
    console.warn(`companion_rejoin: NPC not found: ${npcId}`);
    return state;
  }

  if (!npc.isCompanion || !state.player.companionIds.includes(npcId)) {
    console.warn(`companion_rejoin: NPC is not a companion: ${npcId}`);
    return state;
  }

  const playerLocationId = state.player.currentLocationId;
  const playerLocation = state.locations[playerLocationId];
  if (!playerLocation) {
    console.warn(`companion_rejoin: player location not found: ${playerLocationId}`);
    return state;
  }

  const oldLocationId = npc.currentLocationId;

  // Update NPC location to player's location
  let newNpcs = { ...state.npcs };
  newNpcs[npcId] = {
    ...npc,
    currentLocationId: playerLocationId,
  };

  // Update location presentNpcIds
  let newLocations = { ...state.locations };

  // Remove from old location
  if (oldLocationId && newLocations[oldLocationId]) {
    newLocations[oldLocationId] = {
      ...newLocations[oldLocationId],
      presentNpcIds: newLocations[oldLocationId].presentNpcIds.filter(
        (id) => id !== npcId
      ),
    };
  }

  // Add to player's current location (we validated playerLocation exists earlier)
  if (!newLocations[playerLocationId]!.presentNpcIds.includes(npcId)) {
    newLocations[playerLocationId] = {
      ...newLocations[playerLocationId]!,
      presentNpcIds: [...newLocations[playerLocationId]!.presentNpcIds, npcId],
    };
  }

  return {
    ...state,
    npcs: newNpcs,
    locations: newLocations,
  };
}

// ===== Combat System for World State =====

/**
 * Result of a combat action
 */
export interface WorldCombatResult {
  newState: WorldState;
  messages: string[];
  combatEnded: boolean;
  playerVictory: boolean;
  playerDefeated: boolean;
  fled: boolean;
  experienceGained: number;
  goldGained: number;
  leveledUp: boolean;
}

/**
 * Calculate damage for world combat, accounting for stats
 */
function calculateWorldCombatDamage(
  attackerStrength: number,
  defenderDefense: number
): number {
  const baseDamage = attackerStrength;
  const reduction = defenderDefense * 0.5;
  const damage = Math.max(1, Math.floor(baseDamage - reduction + (Math.random() * 6 - 3)));
  return damage;
}

/**
 * Initiate combat with an NPC.
 * Sets up the combat state with the specified NPC as the enemy.
 *
 * @param state - The current world state
 * @param npcId - The ID of the NPC to fight
 * @returns A new WorldState with combat initiated, or unchanged state if NPC invalid
 */
export function initiateWorldCombat(
  state: WorldState,
  npcId: string
): WorldState {
  const npc = state.npcs[npcId];

  if (!npc) {
    console.warn(`initiateWorldCombat: NPC not found: ${npcId}`);
    return state;
  }

  if (!npc.isAlive) {
    console.warn(`initiateWorldCombat: NPC is not alive: ${npcId}`);
    return state;
  }

  // Get player's companions who are present at the current location
  const currentLocation = state.locations[state.player.currentLocationId];
  const companionsInCombat = state.player.companionIds.filter((companionId) => {
    const companion = state.npcs[companionId];
    return (
      companion &&
      companion.isAlive &&
      currentLocation?.presentNpcIds.includes(companionId)
    );
  });

  return {
    ...state,
    combatState: {
      enemyNpcId: npcId,
      playerTurn: true,
      turnCount: 1,
      companionsInCombat,
    },
  };
}

/**
 * Process a combat action in the world system.
 *
 * This function handles:
 * - Attack: Player deals damage to enemy NPC
 * - Defend: Reduces incoming damage on enemy turn
 * - Flee: 50% chance to escape combat
 * - UsePotion: Consumes a potion from inventory to heal
 *
 * After player action, if enemy survives, enemy counter-attacks.
 * Combat ends when enemy is defeated (NPC marked as dead) or player flees.
 *
 * @param state - The current world state with active combatState
 * @param action - The combat action to take
 * @returns WorldCombatResult with new state, messages, and outcome flags
 */
export function processWorldCombatAction(
  state: WorldState,
  action: "attack" | "defend" | "flee" | "usePotion"
): WorldCombatResult {
  const messages: string[] = [];
  let experienceGained = 0;
  let goldGained = 0;
  let leveledUp = false;

  if (!state.combatState) {
    return {
      newState: state,
      messages: ["Not in combat"],
      combatEnded: true,
      playerVictory: false,
      playerDefeated: false,
      fled: false,
      experienceGained: 0,
      goldGained: 0,
      leveledUp: false,
    };
  }

  const enemyNpc = state.npcs[state.combatState.enemyNpcId];
  if (!enemyNpc || !enemyNpc.isAlive) {
    return {
      newState: { ...state, combatState: null },
      messages: ["Enemy is no longer a threat"],
      combatEnded: true,
      playerVictory: true,
      playerDefeated: false,
      fled: false,
      experienceGained: 0,
      goldGained: 0,
      leveledUp: false,
    };
  }

  // Create mutable copies
  let newState = { ...state };
  newState.player = { ...state.player };
  newState.npcs = { ...state.npcs };
  newState.npcs[enemyNpc.id] = {
    ...enemyNpc,
    stats: { ...enemyNpc.stats },
  };
  newState.combatState = {
    ...state.combatState,
  };
  newState.messageLog = [...state.messageLog];

  // Get enemy reference (guaranteed to exist since we just created it)
  const enemy = newState.npcs[enemyNpc.id]!;
  let isDefending = false;

  // Player action
  switch (action) {
    case "attack": {
      const damage = calculateWorldCombatDamage(
        newState.player.strength,
        enemy.stats.defense
      );
      enemy.stats.health -= damage;
      messages.push(`You deal ${damage} damage to ${enemy.name}!`);
      break;
    }
    case "defend": {
      isDefending = true;
      messages.push("You take a defensive stance!");
      break;
    }
    case "flee": {
      if (Math.random() > 0.5) {
        newState.combatState = null;
        messages.push("You managed to escape!");
        return {
          newState,
          messages,
          combatEnded: true,
          playerVictory: false,
          playerDefeated: false,
          fled: true,
          experienceGained: 0,
          goldGained: 0,
          leveledUp: false,
        };
      } else {
        messages.push("You failed to escape!");
      }
      break;
    }
    case "usePotion": {
      const potionIndex = newState.player.inventory.findIndex(
        (i) => i.type === "potion"
      );
      if (potionIndex !== -1) {
        const potion = newState.player.inventory[potionIndex]!;
        if (potion.effect) {
          const healAmount = potion.effect.value;
          newState.player.health = Math.min(
            newState.player.maxHealth,
            newState.player.health + healAmount
          );
          messages.push(
            `You used ${potion.name} and restored ${healAmount} health!`
          );
        }
        newState.player.inventory = [...newState.player.inventory];
        newState.player.inventory.splice(potionIndex, 1);
      } else {
        messages.push("You don't have any potions!");
      }
      break;
    }
  }

  // Check if enemy defeated
  if (enemy.stats.health <= 0) {
    messages.push(`You defeated ${enemy.name}!`);

    // Calculate rewards based on enemy stats
    experienceGained = Math.floor(
      10 + enemy.stats.maxHealth * 0.5 + enemy.stats.strength * 2
    );
    goldGained = Math.floor(Math.random() * 20 + 5 + enemy.stats.strength);

    messages.push(`Gained ${experienceGained} XP and ${goldGained} gold!`);

    newState.player.experience += experienceGained;
    newState.player.gold += goldGained;

    // Update behavior pattern for combat
    newState.player.behaviorPatterns = {
      ...newState.player.behaviorPatterns,
      combat: newState.player.behaviorPatterns.combat + 1,
    };

    // Mark NPC as dead
    newState.npcs[enemy.id] = {
      ...enemy,
      isAlive: false,
      deathDescription: `Slain in combat by the player`,
    };

    // Check for level up
    const xpNeeded = newState.player.level * 50;
    if (newState.player.experience >= xpNeeded) {
      newState.player.level++;
      newState.player.experience -= xpNeeded;
      newState.player.maxHealth += 10;
      newState.player.health = newState.player.maxHealth;
      newState.player.strength += 2;
      newState.player.defense += 1;
      messages.push(`LEVEL UP! You are now level ${newState.player.level}!`);
      leveledUp = true;
    }

    // Add combat event to history
    const combatEvent: import("./types").WorldEvent = {
      id: `event_combat_${newState.actionCounter}_${Date.now()}`,
      actionNumber: newState.actionCounter,
      description: `Defeated ${enemy.name} in combat`,
      type: "combat",
      involvedNpcIds: [enemy.id],
      locationId: newState.player.currentLocationId,
      isSignificant: true,
    };
    newState.eventHistory = [...newState.eventHistory, combatEvent];

    newState.combatState = null;

    return {
      newState,
      messages,
      combatEnded: true,
      playerVictory: true,
      playerDefeated: false,
      fled: false,
      experienceGained,
      goldGained,
      leveledUp,
    };
  }

  // Enemy turn
  let damageMultiplier = isDefending ? 0.5 : 1;

  const enemyDamage = Math.floor(
    calculateWorldCombatDamage(enemy.stats.strength, newState.player.defense) *
      damageMultiplier
  );
  newState.player.health -= enemyDamage;
  messages.push(`${enemy.name} deals ${enemyDamage} damage to you!`);

  // Check if player defeated
  if (newState.player.health <= 0) {
    messages.push("You have been defeated...");
    newState.combatState = null;

    return {
      newState,
      messages,
      combatEnded: true,
      playerVictory: false,
      playerDefeated: true,
      fled: false,
      experienceGained: 0,
      goldGained: 0,
      leveledUp: false,
    };
  }

  // Increment turn counter
  newState.combatState = {
    ...newState.combatState,
    turnCount: newState.combatState.turnCount + 1,
  };

  return {
    newState,
    messages,
    combatEnded: false,
    playerVictory: false,
    playerDefeated: false,
    fled: false,
    experienceGained: 0,
    goldGained: 0,
    leveledUp: false,
  };
}

// ===== Emergent Storyline Tracking =====

/**
 * Analyzes an action and its results to update player behavior patterns.
 * These patterns influence GPT's generation of aligned story hooks.
 *
 * @param state - The current world state
 * @param action - The action text the player took
 * @param actionResult - The result from resolving the action
 * @returns New WorldState with updated behavior patterns
 */
export function updateBehaviorPatterns(
  state: WorldState,
  action: string,
  stateChanges: StateChange[],
  initiatesCombat?: string
): WorldState {
  // Parse the action text and state changes to determine behavior type
  const actionLower = action.toLowerCase();
  const patterns = { ...state.player.behaviorPatterns };

  // Combat patterns - fighting, attacking, aggression
  if (initiatesCombat) {
    patterns.combat += 2;
  }
  if (
    actionLower.includes("attack") ||
    actionLower.includes("fight") ||
    actionLower.includes("kill") ||
    actionLower.includes("strike") ||
    actionLower.includes("battle") ||
    actionLower.includes("slay")
  ) {
    patterns.combat += 1;
  }

  // Diplomacy patterns - negotiation, persuasion, peacemaking
  if (
    actionLower.includes("negotiate") ||
    actionLower.includes("persuade") ||
    actionLower.includes("convince") ||
    actionLower.includes("bargain") ||
    actionLower.includes("compromise") ||
    actionLower.includes("mediate") ||
    actionLower.includes("diplomacy") ||
    actionLower.includes("peace")
  ) {
    patterns.diplomacy += 2;
  }

  // Social patterns - talking, helping, making friends
  const hasTalkStateChange = stateChanges.some(
    (sc) => sc.type === "update_npc_attitude" && (sc.data.change > 0 || sc.data.attitude > 0)
  );
  if (hasTalkStateChange) {
    patterns.social += 1;
  }
  if (
    actionLower.includes("talk to") ||
    actionLower.includes("speak with") ||
    actionLower.includes("chat") ||
    actionLower.includes("help") ||
    actionLower.includes("befriend") ||
    actionLower.includes("greet")
  ) {
    patterns.social += 1;
  }

  // Exploration patterns - discovering, traveling, searching
  const hasExploreStateChange = stateChanges.some(
    (sc) =>
      sc.type === "move_player" ||
      sc.type === "create_location" ||
      (sc.type === "add_knowledge" && sc.data.type === "location")
  );
  if (hasExploreStateChange) {
    patterns.exploration += 1;
  }
  if (
    actionLower.includes("explore") ||
    actionLower.includes("search") ||
    actionLower.includes("investigate") ||
    actionLower.includes("discover") ||
    actionLower.includes("travel") ||
    actionLower.includes("journey") ||
    actionLower.includes("venture")
  ) {
    patterns.exploration += 1;
  }

  // Stealth patterns - sneaking, hiding, stealing
  if (
    actionLower.includes("sneak") ||
    actionLower.includes("hide") ||
    actionLower.includes("steal") ||
    actionLower.includes("pickpocket") ||
    actionLower.includes("shadow") ||
    actionLower.includes("creep") ||
    actionLower.includes("stealthy") ||
    actionLower.includes("quietly") ||
    actionLower.includes("unseen") ||
    actionLower.includes("covert")
  ) {
    patterns.stealth += 2;
  }

  // Magic patterns - casting spells, using magic items, studying arcane
  const hasMagicItem = stateChanges.some(
    (sc) => sc.type === "add_item" && sc.data.item?.type === "magic"
  );
  if (hasMagicItem) {
    patterns.magic += 1;
  }
  if (
    actionLower.includes("cast") ||
    actionLower.includes("spell") ||
    actionLower.includes("magic") ||
    actionLower.includes("enchant") ||
    actionLower.includes("arcane") ||
    actionLower.includes("conjure") ||
    actionLower.includes("summon") ||
    actionLower.includes("mystic") ||
    actionLower.includes("sorcery")
  ) {
    patterns.magic += 2;
  }

  return {
    ...state,
    player: {
      ...state.player,
      behaviorPatterns: patterns,
    },
  };
}

/**
 * Get the dominant behavior pattern(s) for the player.
 * Returns patterns that are significantly above average (> 1.5x mean).
 *
 * @param patterns - The player's behavior patterns
 * @returns Array of dominant pattern names sorted by value (highest first)
 */
export function getDominantPatterns(
  patterns: WorldState["player"]["behaviorPatterns"]
): string[] {
  const entries = Object.entries(patterns) as [string, number][];
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  const mean = total / entries.length || 0;
  const threshold = mean * 1.5;

  return entries
    .filter(([, value]) => value > threshold && value > 3) // Must be above threshold AND have at least 3 actions
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}

// ===== Flashback System =====

/**
 * Handle reveal_flashback state change.
 * Processes a flashback that reveals part of the player's hidden backstory.
 *
 * data: {
 *   flashbackContent: string,      // The revealed flashback narrative
 *   revealedSkill?: {              // Optional skill revealed through the flashback
 *     name: string,                // Skill name
 *     level: string                // Skill level description
 *   }
 * }
 *
 * This handler:
 * - Adds the flashback content to player.revealedBackstory
 * - If a skill is revealed, adds it to player.knowledge.skills
 * - Creates a discovery event in eventHistory
 */
function handleRevealFlashback(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { flashbackContent, revealedSkill } = data;

  if (!flashbackContent || typeof flashbackContent !== "string") {
    console.warn("reveal_flashback: invalid flashbackContent");
    return state;
  }

  // Add flashback to revealed backstory (avoid duplicates)
  let newRevealedBackstory = [...state.player.revealedBackstory];
  if (!newRevealedBackstory.includes(flashbackContent)) {
    newRevealedBackstory.push(flashbackContent);
  }

  // Handle skill revelation if present
  let newSkills = { ...state.player.knowledge.skills };
  if (revealedSkill && typeof revealedSkill === "object") {
    const { name, level } = revealedSkill;
    if (name && typeof name === "string") {
      // Add or upgrade the skill
      newSkills[name] = level || "remembered";
    }
  }

  // Create a discovery event for the flashback
  const flashbackEvent: import("./types").WorldEvent = {
    id: `event_flashback_${state.actionCounter}_${Date.now()}`,
    actionNumber: state.actionCounter,
    description: `A memory from the past was revealed: ${flashbackContent.slice(0, 100)}${flashbackContent.length > 100 ? "..." : ""}`,
    type: "discovery",
    involvedNpcIds: [],
    locationId: state.player.currentLocationId,
    isSignificant: true,
  };

  return {
    ...state,
    player: {
      ...state.player,
      revealedBackstory: newRevealedBackstory,
      knowledge: {
        ...state.player.knowledge,
        skills: newSkills,
      },
    },
    eventHistory: [...state.eventHistory, flashbackEvent],
  };
}

/**
 * Process a flashback revelation triggered by GPT's revealsFlashback field.
 *
 * This function is called by the API endpoints when actionResult.revealsFlashback
 * is populated. It creates the appropriate state change and applies it.
 *
 * @param state - The current world state
 * @param flashbackContent - The flashback narrative content from GPT
 * @param revealedSkill - Optional skill that the flashback reveals
 * @returns The new WorldState with the flashback applied
 */
export function processFlashbackRevelation(
  state: WorldState,
  flashbackContent: string,
  revealedSkill?: { name: string; level: string }
): WorldState {
  return handleRevealFlashback(state, {
    flashbackContent,
    revealedSkill,
  });
}
