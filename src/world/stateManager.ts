// State Manager for applying state changes to WorldState

import type { WorldState, StateChange, WorldItem, Quest, Crime, Bounty } from "./types";

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

    case "relationship_change":
      return handleRelationshipChange(state, change.data);

    case "player_transform":
      return handlePlayerTransform(state, change.data);

    case "add_curse":
      return handleAddCurse(state, change.data);

    case "add_blessing":
      return handleAddBlessing(state, change.data);

    case "remove_curse":
      return handleRemoveCurse(state, change.data);

    case "remove_blessing":
      return handleRemoveBlessing(state, change.data);

    case "skill_practice":
      return handleSkillPractice(state, change.data);

    case "record_crime":
      return handleRecordCrime(state, change.data);

    case "add_bounty":
      return handleAddBounty(state, change.data);

    case "remove_bounty":
      return handleRemoveBounty(state, change.data);

    case "update_bounty":
      return handleUpdateBounty(state, change.data);

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
  if (toNpc && typeof toNpc === "string") {
    const existingNpc = state.npcs[toNpc];
    if (existingNpc) {
      const newNpcs = { ...state.npcs };
      newNpcs[toNpc] = {
        ...existingNpc,
        inventory: [...existingNpc.inventory, worldItem],
      };
      return { ...state, npcs: newNpcs };
    }
  }

  // Add to location
  if (toLocation && typeof toLocation === "string") {
    const existingLocation = state.locations[toLocation];
    if (existingLocation) {
      const newLocations = { ...state.locations };
      newLocations[toLocation] = {
        ...existingLocation,
        items: [...existingLocation.items, worldItem],
      };
      return { ...state, locations: newLocations };
    }
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
  if (fromNpc && typeof fromNpc === "string") {
    const existingNpc = state.npcs[fromNpc];
    if (existingNpc) {
      const newNpcs = { ...state.npcs };
      newNpcs[fromNpc] = {
        ...existingNpc,
        inventory: existingNpc.inventory.filter((i) => i.id !== itemId),
      };
      return { ...state, npcs: newNpcs };
    }
  }

  // Remove from location
  if (fromLocation && typeof fromLocation === "string") {
    const existingLocation = state.locations[fromLocation];
    if (existingLocation) {
      const newLocations = { ...state.locations };
      newLocations[fromLocation] = {
        ...existingLocation,
        items: existingLocation.items.filter((i) => i.id !== itemId),
      };
      return { ...state, locations: newLocations };
    }
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
    heardRumors: npc.heardRumors || [],
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
    crimes: [],
    bounties: [],
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

// ===== Relationship System =====

/**
 * Handle relationship_change state change.
 * Updates relationship status between the player and an NPC.
 *
 * data: {
 *   npcId: string,                    // Required: The NPC involved
 *   type: string,                     // Required: Type of relationship change
 *   attitudeChange?: number           // Optional: Attitude adjustment (clamped to -100 to 100)
 * }
 *
 * Relationship types:
 * - "marry": Sets player.marriedToNpcId to the NPC
 * - "divorce": Clears player.marriedToNpcId (must match current spouse)
 * - "have_child": Adds a new child NPC to player.childrenNpcIds (must be married or NPC is a child)
 * - "adopt": Adds existing NPC to player.childrenNpcIds
 * - "disown": Removes NPC from player.childrenNpcIds
 * - "attitude": Just applies attitudeChange (delegates to update_npc_attitude logic)
 *
 * All relationship changes also record a relationship event in eventHistory.
 * Attitude changes affect NPC dialogue tone and willingness to help.
 */
function handleRelationshipChange(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { npcId, type, attitudeChange } = data;

  if (!npcId || typeof npcId !== "string") {
    console.warn("relationship_change: invalid npcId");
    return state;
  }

  if (!type || typeof type !== "string") {
    console.warn("relationship_change: invalid type");
    return state;
  }

  const npc = state.npcs[npcId];
  if (!npc) {
    console.warn(`relationship_change: NPC not found: ${npcId}`);
    return state;
  }

  let newState = { ...state };
  newState.player = { ...state.player };
  newState.npcs = { ...state.npcs };

  // Apply attitude change if provided (for all relationship types)
  if (typeof attitudeChange === "number") {
    const currentAttitude = npc.attitude;
    const newAttitude = Math.max(-100, Math.min(100, currentAttitude + attitudeChange));
    newState.npcs[npcId] = {
      ...npc,
      attitude: newAttitude,
    };
  }

  // Handle specific relationship types
  switch (type.toLowerCase()) {
    case "marry": {
      // Can only marry if not already married
      if (newState.player.marriedToNpcId) {
        console.warn(
          `relationship_change: player already married to ${newState.player.marriedToNpcId}`
        );
        return state;
      }
      newState.player.marriedToNpcId = npcId;

      // Marriage is a significant event
      const marriageEvent: import("./types").WorldEvent = {
        id: `event_marriage_${state.actionCounter}_${Date.now()}`,
        actionNumber: state.actionCounter,
        description: `${state.player.name || "The player"} married ${npc.name}`,
        type: "relationship",
        involvedNpcIds: [npcId],
        locationId: state.player.currentLocationId,
        isSignificant: true,
      };
      newState.eventHistory = [...state.eventHistory, marriageEvent];
      break;
    }

    case "divorce": {
      // Can only divorce current spouse
      if (newState.player.marriedToNpcId !== npcId) {
        console.warn(
          `relationship_change: player is not married to ${npcId}`
        );
        return state;
      }
      newState.player.marriedToNpcId = undefined;

      // Divorce is a significant event
      const divorceEvent: import("./types").WorldEvent = {
        id: `event_divorce_${state.actionCounter}_${Date.now()}`,
        actionNumber: state.actionCounter,
        description: `${state.player.name || "The player"} and ${npc.name} parted ways`,
        type: "relationship",
        involvedNpcIds: [npcId],
        locationId: state.player.currentLocationId,
        isSignificant: true,
      };
      newState.eventHistory = [...state.eventHistory, divorceEvent];
      break;
    }

    case "have_child": {
      // The NPC should be a newly created child NPC
      // Validate it's not already in childrenNpcIds
      if (newState.player.childrenNpcIds.includes(npcId)) {
        console.warn(`relationship_change: ${npcId} is already a child`);
        return state;
      }
      newState.player.childrenNpcIds = [...newState.player.childrenNpcIds, npcId];

      // Birth is a significant event
      const birthEvent: import("./types").WorldEvent = {
        id: `event_birth_${state.actionCounter}_${Date.now()}`,
        actionNumber: state.actionCounter,
        description: `${npc.name} was born`,
        type: "relationship",
        involvedNpcIds: [npcId],
        locationId: state.player.currentLocationId,
        isSignificant: true,
      };
      newState.eventHistory = [...state.eventHistory, birthEvent];
      break;
    }

    case "adopt": {
      // Add an existing NPC as a child
      if (newState.player.childrenNpcIds.includes(npcId)) {
        console.warn(`relationship_change: ${npcId} is already a child`);
        return state;
      }
      newState.player.childrenNpcIds = [...newState.player.childrenNpcIds, npcId];

      // Adoption is a significant event
      const adoptionEvent: import("./types").WorldEvent = {
        id: `event_adoption_${state.actionCounter}_${Date.now()}`,
        actionNumber: state.actionCounter,
        description: `${state.player.name || "The player"} adopted ${npc.name}`,
        type: "relationship",
        involvedNpcIds: [npcId],
        locationId: state.player.currentLocationId,
        isSignificant: true,
      };
      newState.eventHistory = [...state.eventHistory, adoptionEvent];
      break;
    }

    case "disown": {
      // Remove NPC from childrenNpcIds
      if (!newState.player.childrenNpcIds.includes(npcId)) {
        console.warn(`relationship_change: ${npcId} is not a child`);
        return state;
      }
      newState.player.childrenNpcIds = newState.player.childrenNpcIds.filter(
        (id) => id !== npcId
      );

      // Disowning is a significant event
      const disownEvent: import("./types").WorldEvent = {
        id: `event_disown_${state.actionCounter}_${Date.now()}`,
        actionNumber: state.actionCounter,
        description: `${state.player.name || "The player"} disowned ${npc.name}`,
        type: "relationship",
        involvedNpcIds: [npcId],
        locationId: state.player.currentLocationId,
        isSignificant: true,
      };
      newState.eventHistory = [...state.eventHistory, disownEvent];
      break;
    }

    case "attitude": {
      // Just apply attitude change (already done above if attitudeChange was provided)
      // No event needed for simple attitude changes - those are tracked elsewhere
      if (typeof attitudeChange !== "number") {
        console.warn("relationship_change type 'attitude' requires attitudeChange");
        return state;
      }
      break;
    }

    default:
      console.warn(`relationship_change: unknown type: ${type}`);
      return state;
  }

  return newState;
}

// ===== Transformation System =====

/**
 * Handle player_transform state change.
 * Adds or removes a transformation from the player.
 *
 * data: {
 *   transformation: string,            // Required: Name of the transformation (e.g., "vampire", "werewolf", "ghost")
 *   physicalDescriptionChange?: string, // Optional: How the transformation affects physical appearance
 *   remove?: boolean                    // Optional: If true, removes the transformation instead of adding
 * }
 *
 * Transformations:
 * - Are stored in player.transformations array
 * - Affect player.physicalDescription (appended description of physical changes)
 * - Are considered by GPT when resolving actions (already passed in context)
 * - Can be removed through narrative means (cures, rituals, etc.)
 *
 * Example transformations: vampire, werewolf, ghost, lich, demon, fae, elemental, cursed_form
 */
function handlePlayerTransform(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { transformation, physicalDescriptionChange, remove } = data;

  if (!transformation || typeof transformation !== "string") {
    console.warn("player_transform: invalid transformation");
    return state;
  }

  const normalizedTransformation = transformation.toLowerCase().trim();

  let newState = { ...state };
  newState.player = { ...state.player };

  if (remove === true) {
    // Remove transformation if it exists
    if (!newState.player.transformations.includes(normalizedTransformation)) {
      console.warn(
        `player_transform: transformation not found: ${normalizedTransformation}`
      );
      return state;
    }

    newState.player.transformations = newState.player.transformations.filter(
      (t) => t !== normalizedTransformation
    );

    // If physical description change is provided, update it (for reverting appearance)
    if (physicalDescriptionChange && typeof physicalDescriptionChange === "string") {
      newState.player.physicalDescription = physicalDescriptionChange;
    }

    // Create transformation removal event
    const removeEvent: import("./types").WorldEvent = {
      id: `event_transform_remove_${state.actionCounter}_${Date.now()}`,
      actionNumber: state.actionCounter,
      description: `${state.player.name || "The player"} is no longer a ${normalizedTransformation}`,
      type: "discovery",
      involvedNpcIds: [],
      locationId: state.player.currentLocationId,
      isSignificant: true,
    };
    newState.eventHistory = [...state.eventHistory, removeEvent];
  } else {
    // Add transformation if not already present
    if (newState.player.transformations.includes(normalizedTransformation)) {
      console.warn(
        `player_transform: already has transformation: ${normalizedTransformation}`
      );
      return state;
    }

    newState.player.transformations = [
      ...newState.player.transformations,
      normalizedTransformation,
    ];

    // Update physical description if provided
    if (physicalDescriptionChange && typeof physicalDescriptionChange === "string") {
      // Append the transformation's physical changes to existing description
      const currentDescription = newState.player.physicalDescription;
      newState.player.physicalDescription = currentDescription
        ? `${currentDescription} ${physicalDescriptionChange}`
        : physicalDescriptionChange;
    }

    // Create transformation event
    const transformEvent: import("./types").WorldEvent = {
      id: `event_transform_${state.actionCounter}_${Date.now()}`,
      actionNumber: state.actionCounter,
      description: `${state.player.name || "The player"} transformed into a ${normalizedTransformation}`,
      type: "discovery",
      involvedNpcIds: [],
      locationId: state.player.currentLocationId,
      isSignificant: true,
    };
    newState.eventHistory = [...state.eventHistory, transformEvent];
  }

  return newState;
}

// ===== Curses and Blessings System =====

/**
 * Handle add_curse state change.
 * Adds a curse to the player's curses array.
 *
 * data: {
 *   curse: string,                      // Required: Name/description of the curse
 *   source?: string,                    // Optional: Who or what inflicted the curse
 *   effects?: string                    // Optional: Description of the curse's effects
 * }
 *
 * Curses:
 * - Are stored in player.curses array
 * - Are considered by GPT when resolving actions (already passed in context)
 * - Can be removed through narrative means (cures, rituals, divine intervention, completing quests)
 *
 * Example curses: cursed by witch, marked by shadow, blood debt, unlucky, silenced, weakened
 */
function handleAddCurse(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { curse, source, effects } = data;

  if (!curse || typeof curse !== "string") {
    console.warn("add_curse: invalid curse");
    return state;
  }

  const normalizedCurse = curse.toLowerCase().trim();

  // Check if player already has this curse
  if (state.player.curses.includes(normalizedCurse)) {
    console.warn(`add_curse: player already has curse: ${normalizedCurse}`);
    return state;
  }

  // Build the curse entry - can include source and effects for narrative richness
  let curseEntry = normalizedCurse;
  if (source && typeof source === "string") {
    curseEntry = `${normalizedCurse} (from ${source})`;
  }

  // Create a significant event for the curse
  const curseEvent: import("./types").WorldEvent = {
    id: `event_curse_${state.actionCounter}_${Date.now()}`,
    actionNumber: state.actionCounter,
    description: effects
      ? `${state.player.name || "The player"} was cursed: ${normalizedCurse}. ${effects}`
      : `${state.player.name || "The player"} was cursed: ${normalizedCurse}`,
    type: "other",
    involvedNpcIds: [],
    locationId: state.player.currentLocationId,
    isSignificant: true,
  };

  return {
    ...state,
    player: {
      ...state.player,
      curses: [...state.player.curses, curseEntry],
    },
    eventHistory: [...state.eventHistory, curseEvent],
  };
}

/**
 * Handle add_blessing state change.
 * Adds a blessing to the player's blessings array.
 *
 * data: {
 *   blessing: string,                   // Required: Name/description of the blessing
 *   source?: string,                    // Optional: Who or what granted the blessing
 *   effects?: string                    // Optional: Description of the blessing's effects
 * }
 *
 * Blessings:
 * - Are stored in player.blessings array
 * - Are considered by GPT when resolving actions (already passed in context)
 * - Can be removed or expire through narrative means (time, certain actions, divine disfavor)
 *
 * Example blessings: blessed by priest, favored by fortune, protected by spirits, heightened senses
 */
function handleAddBlessing(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { blessing, source, effects } = data;

  if (!blessing || typeof blessing !== "string") {
    console.warn("add_blessing: invalid blessing");
    return state;
  }

  const normalizedBlessing = blessing.toLowerCase().trim();

  // Check if player already has this blessing
  if (state.player.blessings.includes(normalizedBlessing)) {
    console.warn(`add_blessing: player already has blessing: ${normalizedBlessing}`);
    return state;
  }

  // Build the blessing entry - can include source for narrative richness
  let blessingEntry = normalizedBlessing;
  if (source && typeof source === "string") {
    blessingEntry = `${normalizedBlessing} (from ${source})`;
  }

  // Create a significant event for the blessing
  const blessingEvent: import("./types").WorldEvent = {
    id: `event_blessing_${state.actionCounter}_${Date.now()}`,
    actionNumber: state.actionCounter,
    description: effects
      ? `${state.player.name || "The player"} received a blessing: ${normalizedBlessing}. ${effects}`
      : `${state.player.name || "The player"} received a blessing: ${normalizedBlessing}`,
    type: "other",
    involvedNpcIds: [],
    locationId: state.player.currentLocationId,
    isSignificant: true,
  };

  return {
    ...state,
    player: {
      ...state.player,
      blessings: [...state.player.blessings, blessingEntry],
    },
    eventHistory: [...state.eventHistory, blessingEvent],
  };
}

/**
 * Handle remove_curse state change.
 * Removes a curse from the player through narrative means.
 *
 * data: {
 *   curse: string,                      // Required: Name of the curse to remove
 *   method?: string                     // Optional: How the curse was removed
 * }
 *
 * Curses can be removed through:
 * - Divine intervention
 * - Powerful magic or rituals
 * - Completing specific quests
 * - Finding rare items or cures
 * - Paying a price to the one who cursed them
 */
function handleRemoveCurse(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { curse, method } = data;

  if (!curse || typeof curse !== "string") {
    console.warn("remove_curse: invalid curse");
    return state;
  }

  const normalizedCurse = curse.toLowerCase().trim();

  // Find and remove the curse (check partial match since curses may include source info)
  const curseIndex = state.player.curses.findIndex(
    (c) => c.toLowerCase().includes(normalizedCurse)
  );

  if (curseIndex === -1) {
    console.warn(`remove_curse: player does not have curse: ${normalizedCurse}`);
    return state;
  }

  const removedCurse = state.player.curses[curseIndex];
  const newCurses = [...state.player.curses];
  newCurses.splice(curseIndex, 1);

  // Create a significant event for the curse removal
  const removalEvent: import("./types").WorldEvent = {
    id: `event_curse_removed_${state.actionCounter}_${Date.now()}`,
    actionNumber: state.actionCounter,
    description: method
      ? `${state.player.name || "The player"} was freed from the curse of ${removedCurse} through ${method}`
      : `${state.player.name || "The player"} was freed from the curse of ${removedCurse}`,
    type: "discovery",
    involvedNpcIds: [],
    locationId: state.player.currentLocationId,
    isSignificant: true,
  };

  return {
    ...state,
    player: {
      ...state.player,
      curses: newCurses,
    },
    eventHistory: [...state.eventHistory, removalEvent],
  };
}

/**
 * Handle remove_blessing state change.
 * Removes a blessing from the player through narrative means.
 *
 * data: {
 *   blessing: string,                   // Required: Name of the blessing to remove
 *   reason?: string                     // Optional: Why the blessing was lost
 * }
 *
 * Blessings can be removed through:
 * - Time/expiration
 * - Divine disfavor (acting against the deity's wishes)
 * - Using up the blessing's power
 * - Being in a place that nullifies blessings
 * - Voluntary sacrifice
 */
function handleRemoveBlessing(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { blessing, reason } = data;

  if (!blessing || typeof blessing !== "string") {
    console.warn("remove_blessing: invalid blessing");
    return state;
  }

  const normalizedBlessing = blessing.toLowerCase().trim();

  // Find and remove the blessing (check partial match since blessings may include source info)
  const blessingIndex = state.player.blessings.findIndex(
    (b) => b.toLowerCase().includes(normalizedBlessing)
  );

  if (blessingIndex === -1) {
    console.warn(`remove_blessing: player does not have blessing: ${normalizedBlessing}`);
    return state;
  }

  const removedBlessing = state.player.blessings[blessingIndex];
  const newBlessings = [...state.player.blessings];
  newBlessings.splice(blessingIndex, 1);

  // Create an event for the blessing removal (may or may not be significant depending on reason)
  const removalEvent: import("./types").WorldEvent = {
    id: `event_blessing_removed_${state.actionCounter}_${Date.now()}`,
    actionNumber: state.actionCounter,
    description: reason
      ? `${state.player.name || "The player"} lost the blessing of ${removedBlessing}: ${reason}`
      : `The blessing of ${removedBlessing} faded from ${state.player.name || "the player"}`,
    type: "other",
    involvedNpcIds: [],
    locationId: state.player.currentLocationId,
    isSignificant: true,
  };

  return {
    ...state,
    player: {
      ...state.player,
      blessings: newBlessings,
    },
    eventHistory: [...state.eventHistory, removalEvent],
  };
}

// ===== Skill Practice System =====

/**
 * Skill level progression (qualitative descriptions):
 * - novice: Just learning, makes frequent mistakes
 * - apprentice: Can perform basic tasks with concentration
 * - journeyman: Competent, can work independently
 * - adept: Skilled, recognized for ability
 * - expert: Master-level, teaches others
 * - master: Legendary skill, known far and wide
 */
const SKILL_LEVEL_PROGRESSION = [
  "novice",
  "apprentice",
  "journeyman",
  "adept",
  "expert",
  "master",
] as const;

/**
 * Handle skill_practice state change.
 * Improves a skill through practice, potentially advancing the skill level.
 *
 * data: {
 *   skill: string,                     // Required: Name of the skill being practiced
 *   improvement?: string,              // Optional: Description of the improvement (used for narrative)
 *   newLevel?: string,                 // Optional: Explicit new level to set (overrides progression)
 *   requiresTeacher?: boolean,         // Optional: If true, advancement beyond current level needs a teacher
 *   teacherNpcId?: string              // Optional: NPC who taught this advancement
 * }
 *
 * Skill Practice Rules:
 * - Skills are tracked qualitatively with descriptive levels (novice, apprentice, journeyman, etc.)
 * - Practice can improve a skill's level over time
 * - Some skill advancements require teachers (indicated by requiresTeacher)
 * - GPT describes improvement narratively rather than with numbers
 * - Skills affect what actions are possible and their success chances
 */
function handleSkillPractice(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { skill, improvement, newLevel, requiresTeacher, teacherNpcId } = data;

  if (!skill || typeof skill !== "string") {
    console.warn("skill_practice: invalid skill");
    return state;
  }

  const normalizedSkill = skill.toLowerCase().trim();
  const currentLevel = state.player.knowledge.skills[normalizedSkill];

  // If newLevel is explicitly provided, use it
  let finalLevel: string;
  if (newLevel && typeof newLevel === "string") {
    finalLevel = newLevel.toLowerCase().trim();
  } else if (currentLevel) {
    // Try to advance to the next level in progression
    const currentIndex = SKILL_LEVEL_PROGRESSION.findIndex(
      (level) => currentLevel.toLowerCase().includes(level)
    );

    if (currentIndex >= 0 && currentIndex < SKILL_LEVEL_PROGRESSION.length - 1) {
      // Check if teacher is required for advancement past journeyman
      const advancingPastJourneyman = currentIndex >= 2;
      if (advancingPastJourneyman && requiresTeacher && !teacherNpcId) {
        // Can't advance without a teacher - just reinforce current level
        finalLevel = `${SKILL_LEVEL_PROGRESSION[currentIndex]} (practiced)`;
      } else {
        // Advance to next level
        const nextLevel = SKILL_LEVEL_PROGRESSION[currentIndex + 1];
        finalLevel = nextLevel ?? "apprentice"; // Fallback should never happen due to bounds check
      }
    } else if (currentIndex === SKILL_LEVEL_PROGRESSION.length - 1) {
      // Already at master level
      finalLevel = "master (legendary)";
    } else {
      // Current level doesn't match progression - just add improvement note
      finalLevel = improvement
        ? `${currentLevel}, ${improvement}`
        : `${currentLevel} (improved)`;
    }
  } else {
    // New skill - start at novice
    finalLevel = "novice";
  }

  // Build improvement description for event
  let eventDescription: string;
  if (improvement && typeof improvement === "string") {
    eventDescription = `${state.player.name || "The player"} practiced ${normalizedSkill}: ${improvement}`;
  } else if (teacherNpcId && state.npcs[teacherNpcId]) {
    const teacher = state.npcs[teacherNpcId];
    eventDescription = `${state.player.name || "The player"} trained ${normalizedSkill} with ${teacher.name}`;
  } else {
    eventDescription = `${state.player.name || "The player"} practiced ${normalizedSkill}`;
  }

  // Determine if this is a significant improvement (level-up)
  const isLevelUp = Boolean(
    currentLevel &&
      SKILL_LEVEL_PROGRESSION.some(
        (level) =>
          finalLevel.toLowerCase().startsWith(level) &&
          !currentLevel.toLowerCase().includes(level)
      )
  );

  // Create an event for the skill practice
  const practiceEvent: import("./types").WorldEvent = {
    id: `event_skill_${state.actionCounter}_${Date.now()}`,
    actionNumber: state.actionCounter,
    description: eventDescription,
    type: "discovery",
    involvedNpcIds: teacherNpcId ? [teacherNpcId] : [],
    locationId: state.player.currentLocationId,
    isSignificant: isLevelUp, // Only significant if it's a level-up
  };

  return {
    ...state,
    player: {
      ...state.player,
      knowledge: {
        ...state.player.knowledge,
        skills: {
          ...state.player.knowledge.skills,
          [normalizedSkill]: finalLevel,
        },
      },
    },
    eventHistory: [...state.eventHistory, practiceEvent],
  };
}

// ===== Crime and Consequences System =====

/**
 * Handle record_crime state change
 * Records a crime in the player's criminal history and applies consequences.
 * data: {
 *   type: "theft" | "assault" | "murder" | "trespassing" | "fraud" | "vandalism" | "smuggling" | "other",
 *   description: string,
 *   victimNpcId?: string,
 *   witnessNpcIds?: string[],
 *   wasDetected: boolean,
 *   severity: "minor" | "moderate" | "severe",
 *   attitudeChanges?: { npcId: string, change: number }[],
 *   factionReputationChanges?: { factionId: string, change: number }[]
 * }
 */
function handleRecordCrime(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const {
    type,
    description,
    victimNpcId,
    witnessNpcIds = [],
    wasDetected,
    severity = "minor",
    attitudeChanges = [],
    factionReputationChanges = [],
  } = data;

  // Validate required fields
  if (!type || !description || typeof wasDetected !== "boolean") {
    console.warn("record_crime: missing required fields (type, description, wasDetected)");
    return state;
  }

  // Validate crime type
  const validTypes = ["theft", "assault", "murder", "trespassing", "fraud", "vandalism", "smuggling", "other"];
  if (!validTypes.includes(type)) {
    console.warn(`record_crime: invalid crime type "${type}"`);
    return state;
  }

  // Validate severity
  const validSeverities = ["minor", "moderate", "severe"];
  if (!validSeverities.includes(severity)) {
    console.warn(`record_crime: invalid severity "${severity}"`);
    return state;
  }

  // Generate crime ID
  const crimeId = `crime_${type}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

  // Create the crime record
  const crime: Crime = {
    id: crimeId,
    type: type as Crime["type"],
    description: description.trim(),
    committedAtAction: state.actionCounter,
    locationId: state.player.currentLocationId,
    victimNpcId,
    witnessNpcIds: witnessNpcIds.filter((id: string) => typeof id === "string"),
    wasDetected,
    severity: severity as Crime["severity"],
  };

  // Start building new state
  let newNpcs = { ...state.npcs };
  let newFactions = { ...state.factions };

  // Apply attitude changes to NPCs who witnessed or heard about the crime
  if (wasDetected && attitudeChanges.length > 0) {
    for (const { npcId, change } of attitudeChanges) {
      if (typeof npcId === "string" && typeof change === "number" && newNpcs[npcId]) {
        const npc = newNpcs[npcId]!;
        const newAttitude = Math.max(-100, Math.min(100, npc.attitude + change));
        newNpcs = {
          ...newNpcs,
          [npcId]: {
            ...npc,
            attitude: newAttitude,
          },
        };
      }
    }
  }

  // Apply faction reputation changes
  if (wasDetected && factionReputationChanges.length > 0) {
    for (const { factionId, change } of factionReputationChanges) {
      if (typeof factionId === "string" && typeof change === "number" && newFactions[factionId]) {
        const faction = newFactions[factionId]!;
        const newReputation = Math.max(-100, Math.min(100, faction.playerReputation + change));
        newFactions = {
          ...newFactions,
          [factionId]: {
            ...faction,
            playerReputation: newReputation,
          },
        };
      }
    }
  }

  // Create a world event for the crime
  const crimeEvent: import("./types").WorldEvent = {
    id: `event_crime_${state.actionCounter}_${Date.now()}`,
    actionNumber: state.actionCounter,
    description: wasDetected
      ? `${state.player.name || "A stranger"} committed ${type}: ${description}`
      : `A ${type} occurred at ${state.locations[state.player.currentLocationId]?.name || "an unknown location"}`,
    type: "crime",
    involvedNpcIds: victimNpcId ? [victimNpcId, ...witnessNpcIds] : witnessNpcIds,
    locationId: state.player.currentLocationId,
    isSignificant: wasDetected || severity === "severe", // Detected crimes and severe crimes spread as rumors
  };

  return {
    ...state,
    player: {
      ...state.player,
      crimes: [...state.player.crimes, crime],
    },
    npcs: newNpcs,
    factions: newFactions,
    eventHistory: [...state.eventHistory, crimeEvent],
  };
}

/**
 * Handle add_bounty state change
 * Issues a bounty on the player for their crimes.
 * data: {
 *   issuedByFactionId?: string,
 *   issuedByNpcId?: string,
 *   reason: string,
 *   amount: number,
 *   crimeIds?: string[],
 *   locationScope?: string[]
 * }
 */
function handleAddBounty(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const {
    issuedByFactionId,
    issuedByNpcId,
    reason,
    amount,
    crimeIds = [],
    locationScope,
  } = data;

  // Validate required fields
  if (!reason || typeof amount !== "number" || amount <= 0) {
    console.warn("add_bounty: missing or invalid required fields (reason, amount > 0)");
    return state;
  }

  // At least one issuer must be specified
  if (!issuedByFactionId && !issuedByNpcId) {
    console.warn("add_bounty: must specify either issuedByFactionId or issuedByNpcId");
    return state;
  }

  // Generate bounty ID
  const bountyId = `bounty_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

  // Create the bounty record
  const bounty: Bounty = {
    id: bountyId,
    issuedByFactionId: typeof issuedByFactionId === "string" ? issuedByFactionId : undefined,
    issuedByNpcId: typeof issuedByNpcId === "string" ? issuedByNpcId : undefined,
    reason: reason.trim(),
    amount: Math.max(1, Math.round(amount)), // Ensure positive integer
    issuedAtAction: state.actionCounter,
    crimeIds: crimeIds.filter((id: string) => typeof id === "string"),
    locationScope: locationScope?.filter((id: string) => typeof id === "string"),
    isActive: true,
  };

  // Create a world event for the bounty
  const issuerName = issuedByFactionId
    ? state.factions[issuedByFactionId]?.name || "an unknown faction"
    : state.npcs[issuedByNpcId || ""]?.name || "someone";

  const bountyEvent: import("./types").WorldEvent = {
    id: `event_bounty_${state.actionCounter}_${Date.now()}`,
    actionNumber: state.actionCounter,
    description: `A bounty of ${amount} gold has been placed on ${state.player.name || "the adventurer"} by ${issuerName}: "${reason}"`,
    type: "faction",
    involvedNpcIds: issuedByNpcId ? [issuedByNpcId] : [],
    locationId: state.player.currentLocationId,
    isSignificant: true, // Bounties always spread as rumors
  };

  return {
    ...state,
    player: {
      ...state.player,
      bounties: [...state.player.bounties, bounty],
    },
    eventHistory: [...state.eventHistory, bountyEvent],
  };
}

/**
 * Handle remove_bounty state change
 * Removes a bounty from the player (paid off, pardoned, or fulfilled).
 * data: {
 *   bountyId: string,
 *   reason?: string
 * }
 */
function handleRemoveBounty(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { bountyId, reason } = data;

  if (!bountyId || typeof bountyId !== "string") {
    console.warn("remove_bounty: missing or invalid bountyId");
    return state;
  }

  // Find the bounty
  const bountyIndex = state.player.bounties.findIndex((b) => b.id === bountyId);
  if (bountyIndex === -1) {
    console.warn(`remove_bounty: bounty "${bountyId}" not found`);
    return state;
  }

  const bounty = state.player.bounties[bountyIndex]!;

  // Create a world event for bounty removal
  const issuerName = bounty.issuedByFactionId
    ? state.factions[bounty.issuedByFactionId]?.name || "an unknown faction"
    : state.npcs[bounty.issuedByNpcId || ""]?.name || "someone";

  const removalEvent: import("./types").WorldEvent = {
    id: `event_bounty_removed_${state.actionCounter}_${Date.now()}`,
    actionNumber: state.actionCounter,
    description: reason
      ? `The bounty on ${state.player.name || "the adventurer"} from ${issuerName} has been resolved: ${reason}`
      : `The bounty on ${state.player.name || "the adventurer"} from ${issuerName} has been lifted`,
    type: "faction",
    involvedNpcIds: bounty.issuedByNpcId ? [bounty.issuedByNpcId] : [],
    locationId: state.player.currentLocationId,
    isSignificant: true,
  };

  // Remove the bounty from the array
  const newBounties = [
    ...state.player.bounties.slice(0, bountyIndex),
    ...state.player.bounties.slice(bountyIndex + 1),
  ];

  return {
    ...state,
    player: {
      ...state.player,
      bounties: newBounties,
    },
    eventHistory: [...state.eventHistory, removalEvent],
  };
}

/**
 * Handle update_bounty state change
 * Updates an existing bounty (increase amount, add crimes, change status).
 * data: {
 *   bountyId: string,
 *   amountIncrease?: number,
 *   addCrimeIds?: string[],
 *   isActive?: boolean,
 *   newReason?: string
 * }
 */
function handleUpdateBounty(
  state: WorldState,
  data: Record<string, any>
): WorldState {
  const { bountyId, amountIncrease, addCrimeIds, isActive, newReason } = data;

  if (!bountyId || typeof bountyId !== "string") {
    console.warn("update_bounty: missing or invalid bountyId");
    return state;
  }

  // Find the bounty
  const bountyIndex = state.player.bounties.findIndex((b) => b.id === bountyId);
  if (bountyIndex === -1) {
    console.warn(`update_bounty: bounty "${bountyId}" not found`);
    return state;
  }

  const existingBounty = state.player.bounties[bountyIndex]!;

  // Build updated bounty
  const updatedBounty: Bounty = {
    ...existingBounty,
    amount:
      typeof amountIncrease === "number"
        ? Math.max(1, existingBounty.amount + amountIncrease)
        : existingBounty.amount,
    crimeIds:
      Array.isArray(addCrimeIds) && addCrimeIds.length > 0
        ? [...existingBounty.crimeIds, ...addCrimeIds.filter((id: string) => typeof id === "string")]
        : existingBounty.crimeIds,
    isActive: typeof isActive === "boolean" ? isActive : existingBounty.isActive,
    reason: typeof newReason === "string" ? newReason.trim() : existingBounty.reason,
  };

  // Create update event if amount increased
  const events = [...state.eventHistory];
  if (typeof amountIncrease === "number" && amountIncrease > 0) {
    const issuerName = existingBounty.issuedByFactionId
      ? state.factions[existingBounty.issuedByFactionId]?.name || "an unknown faction"
      : state.npcs[existingBounty.issuedByNpcId || ""]?.name || "someone";

    events.push({
      id: `event_bounty_increase_${state.actionCounter}_${Date.now()}`,
      actionNumber: state.actionCounter,
      description: `The bounty on ${state.player.name || "the adventurer"} from ${issuerName} has increased by ${amountIncrease} gold to ${updatedBounty.amount} gold`,
      type: "faction",
      involvedNpcIds: existingBounty.issuedByNpcId ? [existingBounty.issuedByNpcId] : [],
      locationId: state.player.currentLocationId,
      isSignificant: true,
    });
  }

  // Update the bounties array
  const newBounties = [
    ...state.player.bounties.slice(0, bountyIndex),
    updatedBounty,
    ...state.player.bounties.slice(bountyIndex + 1),
  ];

  return {
    ...state,
    player: {
      ...state.player,
      bounties: newBounties,
    },
    eventHistory: events,
  };
}

/**
 * Check if the player is wanted (has active bounties) and return relevant info.
 * Useful for NPC behavior decisions.
 */
export function getPlayerWantedStatus(worldState: WorldState): {
  isWanted: boolean;
  totalBountyAmount: number;
  activeBounties: Bounty[];
  recentCrimes: Crime[];
  mostSevereCrimeType: Crime["severity"] | null;
} {
  const activeBounties = worldState.player.bounties.filter((b) => b.isActive);
  const totalBountyAmount = activeBounties.reduce((sum, b) => sum + b.amount, 0);

  // Get crimes from last 50 actions for "recent"
  const recentCrimes = worldState.player.crimes.filter(
    (c) => worldState.actionCounter - c.committedAtAction <= 50 && c.wasDetected
  );

  // Determine most severe crime type
  let mostSevereCrimeType: Crime["severity"] | null = null;
  for (const crime of recentCrimes) {
    if (crime.severity === "severe") {
      mostSevereCrimeType = "severe";
      break;
    } else if (crime.severity === "moderate" && mostSevereCrimeType !== "moderate") {
      mostSevereCrimeType = "moderate";
    } else if (crime.severity === "minor" && !mostSevereCrimeType) {
      mostSevereCrimeType = "minor";
    }
  }

  return {
    isWanted: activeBounties.length > 0,
    totalBountyAmount,
    activeBounties,
    recentCrimes,
    mostSevereCrimeType,
  };
}

/**
 * Check if an NPC should refuse service to the player based on criminal status.
 * Returns a reason string if service should be refused, null otherwise.
 */
export function shouldNpcRefuseService(
  worldState: WorldState,
  npcId: string
): string | null {
  const npc = worldState.npcs[npcId];
  if (!npc || !npc.isAlive) {
    return null;
  }

  const wantedStatus = getPlayerWantedStatus(worldState);

  // Check if this NPC is hostile due to attitude
  if (npc.attitude < -50) {
    return `${npc.name} refuses to deal with someone they despise.`;
  }

  // Check if NPC was a victim of player's crimes
  const victimOf = worldState.player.crimes.filter(
    (c) => c.victimNpcId === npcId && c.wasDetected
  );
  if (victimOf.length > 0) {
    return `${npc.name} remembers what you did to them and refuses to help you.`;
  }

  // Check if NPC witnessed crimes
  const witnessed = worldState.player.crimes.filter(
    (c) => c.witnessNpcIds.includes(npcId) && c.severity === "severe"
  );
  if (witnessed.length > 0) {
    return `${npc.name} witnessed your crimes and wants nothing to do with you.`;
  }

  // Check if NPC belongs to a faction with very low reputation
  for (const factionId of npc.factionIds) {
    const faction = worldState.factions[factionId];
    if (faction && faction.playerReputation < -50) {
      return `${npc.name}, a member of ${faction.name}, refuses to serve someone with your reputation.`;
    }
  }

  // Check if NPC is aware of large bounties
  if (wantedStatus.totalBountyAmount >= 100) {
    // NPC might recognize wanted player - chance based on attitude and bounty size
    const recognitionChance = Math.min(0.8, 0.2 + (wantedStatus.totalBountyAmount / 500));
    if (Math.random() < recognitionChance && npc.attitude < 30) {
      return `${npc.name} eyes you suspiciously. "I know your face from the wanted posters. Get out."`;
    }
  }

  return null;
}