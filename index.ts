import index from "./public/index.html";
import worldIndex from "./public/world.html";
import {
  createInitialState,
  getLocation,
  processChoice,
  processCombatAction,
  checkRequirement,
} from "./src/gameEngine";
import { generateImage, preGenerateImagesForDestinations } from "./src/imageService";
import type { GameState } from "./src/types";
import type { WorldState } from "./src/world/types";
import { loadWorldState, saveWorldState } from "./src/world/persistence";
import { createSeedWorld } from "./src/world/seedWorld";
import { generateSuggestedActions, resolveAction, extractReferences, generateNarratorRejection, handleConversation, generateNewCharacter, handleTravel, generateInitialCharacter, calculateRumorSpread, applyRumorSpreads } from "./src/world/gptService";
import { applyStateChanges, validateKnowledge, initiateWorldCombat, processWorldCombatAction, handlePlayerDeath, updateBehaviorPatterns } from "./src/world/stateManager";
import { getMapData } from "./src/world/mapService";
import type { SuggestedAction } from "./src/world/types";

// Module-level world state for API access
let worldState: WorldState;

// Store last suggested actions for action lookup by ID
let lastSuggestedActions: SuggestedAction[] = [];

// Initialize world state - load existing or create seed world
async function initializeWorldState(): Promise<void> {
  const existingState = await loadWorldState();

  if (existingState) {
    worldState = existingState;
    console.log("✅ Loaded existing world state");
  } else {
    worldState = createSeedWorld();
    await saveWorldState(worldState);
    console.log("🌱 Created new world with Millbrook village");
  }
}

// Initialize world state before starting server
await initializeWorldState();

const server = Bun.serve({
  port: 3000,

  // Serve static files from image-cache directory
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/image-cache/")) {
      const filePath = `.${url.pathname}`;
      const file = Bun.file(filePath);
      if (await file.exists()) {
        return new Response(file, {
          headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000" },
        });
      }
      return new Response("Not found", { status: 404 });
    }
    // Let routes handle everything else
    return undefined as any;
  },

  routes: {
    "/": index,
    "/world": worldIndex,

    // Start a new game
    "/api/game/start": {
      POST: async (req) => {
        const body = await req.json();
        const state = createInitialState();
        state.character.name = body.playerName || "Hero";
        return Response.json({ state });
      },
    },

    // Get location info
    "/api/game/location/:id": {
      GET: (req) => {
        const location = getLocation(req.params.id);
        if (!location) {
          return Response.json({ error: "Location not found" }, { status: 404 });
        }
        return Response.json({ location });
      },
    },

    // Get the root image location ID (resolves parent chain)
    "/api/game/image-location/:id": {
      GET: (req) => {
        let location = getLocation(req.params.id);
        if (!location) {
          return Response.json({ error: "Location not found" }, { status: 404 });
        }

        // If this location has a parent, find the root
        while (location.parentLocationId) {
          const parent = getLocation(location.parentLocationId);
          if (parent) {
            location = parent;
          } else {
            break;
          }
        }

        return Response.json({ imageLocationId: location.id });
      },
    },

    // Get image for location
    "/api/game/image/:id": {
      GET: async (req) => {
        let location = getLocation(req.params.id);
        if (!location) {
          return Response.json({ error: "Location not found" }, { status: 404 });
        }

        // If this location has a parent, use the parent's image
        while (location.parentLocationId) {
          const parent = getLocation(location.parentLocationId);
          if (parent) {
            location = parent;
          } else {
            break;
          }
        }

        if (!location.imagePrompt) {
          return Response.json({ error: "No image for this location" }, { status: 404 });
        }

        const imageUrl = await generateImage(location.id, location.imagePrompt);
        return Response.json({ imageUrl, imageLocationId: location.id });
      },
    },

    // Get available choices for current location
    "/api/game/choices": {
      POST: async (req) => {
        const body = await req.json();
        const state: GameState = body.state;
        const location = getLocation(state.currentLocationId);

        if (!location) {
          return Response.json({ choices: [] });
        }

        const choices = location.choices.map((choice) => ({
          ...choice,
          available: checkRequirement(state, choice),
        }));

        return Response.json({ choices });
      },
    },

    // Process a player action/choice
    "/api/game/action": {
      POST: async (req) => {
        const body = await req.json();
        const state: GameState = body.state;
        const choiceId: string = body.choiceId;

        const location = getLocation(state.currentLocationId);
        const choice = location?.choices.find((c) => c.id === choiceId);

        if (!choice) {
          return Response.json({ error: "Invalid choice" }, { status: 400 });
        }

        if (!checkRequirement(state, choice)) {
          return Response.json({ error: "Requirements not met" }, { status: 400 });
        }

        const newState = processChoice(state, choice);
        return Response.json({ state: newState });
      },
    },

    // Process combat action
    "/api/game/combat": {
      POST: async (req) => {
        const body = await req.json();
        const state: GameState = body.state;
        const action: "attack" | "defend" | "flee" | "usePotion" = body.action;

        if (!state.combatState) {
          return Response.json({ error: "Not in combat" }, { status: 400 });
        }

        const newState = processCombatAction(state, action);
        return Response.json({ state: newState });
      },
    },

    // ===== Open World API Endpoints =====

    // Get current world state with suggested actions
    "/api/world/state": {
      GET: async () => {
        const { player, locations, npcs, deceasedHeroes } = worldState;

        // Check if player needs character creation (no name = new character needed)
        if (!player.name || player.name.trim() === "") {
          // Get the most recent deceased hero if any
          const lastDeceasedHero = deceasedHeroes.length > 0
            ? deceasedHeroes[deceasedHeroes.length - 1]
            : null;

          return Response.json({
            needsCharacterCreation: true,
            playerStats: { name: "" },
            deceasedHero: lastDeceasedHero ? {
              id: lastDeceasedHero.id,
              name: lastDeceasedHero.name,
              physicalDescription: lastDeceasedHero.physicalDescription,
              origin: lastDeceasedHero.origin,
              diedAtAction: lastDeceasedHero.diedAtAction,
              deathDescription: lastDeceasedHero.deathDescription,
              deathLocationId: lastDeceasedHero.deathLocationId,
              majorDeeds: lastDeceasedHero.majorDeeds,
            } : null,
          });
        }

        const currentLocation = locations[player.currentLocationId];

        if (!currentLocation) {
          return Response.json(
            { error: "Current location not found" },
            { status: 500 }
          );
        }

        // Get NPCs present at current location
        const presentNpcs = currentLocation.presentNpcIds
          .map((id) => npcs[id])
          .filter((npc): npc is NonNullable<typeof npc> => npc != null && npc.isAlive)
          .map((npc) => ({
            id: npc.id,
            name: npc.name,
            description: npc.description,
            physicalDescription: npc.physicalDescription,
            attitude: npc.attitude,
            isCompanion: npc.isCompanion,
            isAnimal: npc.isAnimal,
          }));

        // Spread rumors when entering location - NPCs may have heard about player deeds
        const rumorSpreads = calculateRumorSpread(worldState, player.currentLocationId);
        if (rumorSpreads.length > 0) {
          worldState = applyRumorSpreads(worldState, rumorSpreads);
          await saveWorldState(worldState);
          console.log(`📢 ${rumorSpreads.length} rumors spread to NPCs at ${currentLocation.name}`);
        }

        // Generate suggested actions using GPT
        const suggestedActions = await generateSuggestedActions(worldState);

        // Store for action lookup by ID
        lastSuggestedActions = suggestedActions;

        // Pre-generate images for movement destinations in background (non-blocking)
        preGenerateImagesForDestinations(worldState, suggestedActions);

        // Build player stats summary
        const playerStats = {
          name: player.name,
          health: player.health,
          maxHealth: player.maxHealth,
          gold: player.gold,
          level: player.level,
          strength: player.strength,
          defense: player.defense,
          magic: player.magic,
          experience: player.experience,
          companionCount: player.companionIds.length,
          inventoryCount: player.inventory.length,
          inventory: player.inventory.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            type: item.type,
            effect: item.effect,
            value: item.value,
          })),
        };

        // Build combat state if in combat
        let combatInfo = null;
        if (worldState.combatState) {
          const enemy = npcs[worldState.combatState.enemyNpcId];
          if (enemy) {
            combatInfo = {
              enemy: {
                id: enemy.id,
                name: enemy.name,
                description: enemy.description,
                health: enemy.stats.health,
                maxHealth: enemy.stats.maxHealth,
              },
              playerTurn: worldState.combatState.playerTurn,
              turnCount: worldState.combatState.turnCount,
              companionsInCombat: worldState.combatState.companionsInCombat,
            };
          }
        }

        return Response.json({
          currentLocation: {
            id: currentLocation.id,
            name: currentLocation.name,
            description: currentLocation.description,
            terrain: currentLocation.terrain,
            dangerLevel: currentLocation.dangerLevel,
            coordinates: currentLocation.coordinates,
            items: currentLocation.items,
            structures: currentLocation.structures,
          },
          presentNpcs,
          playerStats,
          suggestedActions,
          inCombat: worldState.combatState !== null,
          combat: combatInfo,
        });
      },
    },

    // Process a suggested action by ID
    "/api/world/action": {
      POST: async (req) => {
        const body = await req.json() as { actionId?: string };
        const { actionId } = body;

        if (!actionId || typeof actionId !== "string") {
          return Response.json(
            { error: "actionId is required" },
            { status: 400 }
          );
        }

        // Find the action from last suggested actions
        const selectedAction = lastSuggestedActions.find((a) => a.id === actionId);

        if (!selectedAction) {
          return Response.json(
            { error: "Action not found. Please refresh suggested actions." },
            { status: 404 }
          );
        }

        // Resolve the action using GPT
        const actionResult = await resolveAction(worldState, selectedAction.text);

        // Apply state changes
        worldState = applyStateChanges(worldState, actionResult.stateChanges);

        // Update behavior patterns based on the action taken
        worldState = updateBehaviorPatterns(
          worldState,
          selectedAction.text,
          actionResult.stateChanges,
          actionResult.initiatesCombat
        );

        // Check if combat should be initiated
        let combatStarted = false;
        let enemyInfo = null;
        if (actionResult.initiatesCombat) {
          const npc = worldState.npcs[actionResult.initiatesCombat];
          if (npc && npc.isAlive) {
            worldState = initiateWorldCombat(worldState, actionResult.initiatesCombat);
            combatStarted = true;
            enemyInfo = {
              id: npc.id,
              name: npc.name,
              description: npc.description,
              health: npc.stats.health,
              maxHealth: npc.stats.maxHealth,
            };
          }
        }

        // Increment action counter
        worldState = {
          ...worldState,
          actionCounter: worldState.actionCounter + 1,
        };

        // Save the updated world state
        await saveWorldState(worldState);

        // Store the new suggested actions for next action lookup
        lastSuggestedActions = actionResult.suggestedActions;

        // Pre-generate images for movement destinations in background (non-blocking)
        preGenerateImagesForDestinations(worldState, actionResult.suggestedActions);

        return Response.json({
          narrative: actionResult.narrative,
          suggestedActions: actionResult.suggestedActions,
          initiatesCombat: actionResult.initiatesCombat,
          combatStarted,
          enemy: enemyInfo,
          inCombat: worldState.combatState !== null,
          revealsFlashback: actionResult.revealsFlashback,
        });
      },
    },

    // Process free-form text input from player
    "/api/world/freeform": {
      POST: async (req) => {
        const body = await req.json() as { text?: string };
        const { text } = body;

        if (!text || typeof text !== "string" || text.trim().length === 0) {
          return Response.json(
            { error: "text is required and must be a non-empty string" },
            { status: 400 }
          );
        }

        const trimmedText = text.trim();

        // Extract potential references from player input
        const references = extractReferences(trimmedText);

        // Validate each reference against player knowledge
        const unknownReferences: string[] = [];
        for (const ref of references) {
          if (!validateKnowledge(worldState, ref)) {
            unknownReferences.push(ref);
          }
        }

        // If player referenced something they don't know about, reject playfully
        if (unknownReferences.length > 0) {
          const rejection = await generateNarratorRejection(unknownReferences, trimmedText);

          // Generate new suggested actions for the player
          const suggestedActions = await generateSuggestedActions(worldState);
          lastSuggestedActions = suggestedActions;

          // Pre-generate images for movement destinations in background (non-blocking)
          preGenerateImagesForDestinations(worldState, suggestedActions);

          return Response.json({
            narrative: rejection,
            suggestedActions,
            knowledgeRejection: true,
            unknownReferences,
          });
        }

        // Resolve the free-form action using GPT
        const actionResult = await resolveAction(worldState, trimmedText);

        // Apply state changes
        worldState = applyStateChanges(worldState, actionResult.stateChanges);

        // Update behavior patterns based on the action taken
        worldState = updateBehaviorPatterns(
          worldState,
          trimmedText,
          actionResult.stateChanges,
          actionResult.initiatesCombat
        );

        // Check if combat should be initiated
        let combatStarted = false;
        let enemyInfo = null;
        if (actionResult.initiatesCombat) {
          const npc = worldState.npcs[actionResult.initiatesCombat];
          if (npc && npc.isAlive) {
            worldState = initiateWorldCombat(worldState, actionResult.initiatesCombat);
            combatStarted = true;
            enemyInfo = {
              id: npc.id,
              name: npc.name,
              description: npc.description,
              health: npc.stats.health,
              maxHealth: npc.stats.maxHealth,
            };
          }
        }

        // Increment action counter
        worldState = {
          ...worldState,
          actionCounter: worldState.actionCounter + 1,
        };

        // Save the updated world state
        await saveWorldState(worldState);

        // Store the new suggested actions for next action lookup
        lastSuggestedActions = actionResult.suggestedActions;

        // Pre-generate images for movement destinations in background (non-blocking)
        preGenerateImagesForDestinations(worldState, actionResult.suggestedActions);

        return Response.json({
          narrative: actionResult.narrative,
          suggestedActions: actionResult.suggestedActions,
          initiatesCombat: actionResult.initiatesCombat,
          combatStarted,
          enemy: enemyInfo,
          inCombat: worldState.combatState !== null,
          revealsFlashback: actionResult.revealsFlashback,
        });
      },
    },

    // Talk to an NPC with conversation memory
    "/api/world/talk": {
      POST: async (req) => {
        const body = await req.json() as { npcId?: string; message?: string };
        const { npcId, message } = body;

        // Validate input
        if (!npcId || typeof npcId !== "string") {
          return Response.json(
            { error: "npcId is required" },
            { status: 400 }
          );
        }

        if (!message || typeof message !== "string" || message.trim().length === 0) {
          return Response.json(
            { error: "message is required and must be a non-empty string" },
            { status: 400 }
          );
        }

        // Check NPC exists
        const npc = worldState.npcs[npcId];
        if (!npc) {
          return Response.json(
            { error: "NPC not found" },
            { status: 404 }
          );
        }

        // Check NPC is alive
        if (!npc.isAlive) {
          return Response.json(
            { error: `Cannot talk to ${npc.name} - they are no longer alive` },
            { status: 400 }
          );
        }

        // Check NPC is at current location
        const currentLocation = worldState.locations[worldState.player.currentLocationId];
        if (!currentLocation?.presentNpcIds.includes(npcId)) {
          return Response.json(
            { error: `${npc.name} is not here` },
            { status: 400 }
          );
        }

        try {
          // Handle the conversation
          const conversationResult = await handleConversation(
            worldState,
            npcId,
            message.trim()
          );

          // Update NPC's conversation history
          const newConversationEntry = {
            actionNumber: worldState.actionCounter,
            summary: conversationResult.conversationSummary,
            playerAsked: [message.trim()],
            npcRevealed: conversationResult.newKnowledge,
          };

          const updatedConversationHistory = [
            ...npc.conversationHistory,
            newConversationEntry,
          ];

          // Calculate new attitude (clamped to -100 to 100)
          const newAttitude = Math.max(
            -100,
            Math.min(100, npc.attitude + conversationResult.attitudeChange)
          );

          // Update NPC in world state
          worldState = {
            ...worldState,
            npcs: {
              ...worldState.npcs,
              [npcId]: {
                ...npc,
                conversationHistory: updatedConversationHistory,
                attitude: newAttitude,
              },
            },
          };

          // Add new knowledge to player if any was revealed
          if (conversationResult.newKnowledge.length > 0) {
            const updatedLore = [
              ...worldState.player.knowledge.lore,
              ...conversationResult.newKnowledge.filter(
                (k) => !worldState.player.knowledge.lore.includes(k)
              ),
            ];

            worldState = {
              ...worldState,
              player: {
                ...worldState.player,
                knowledge: {
                  ...worldState.player.knowledge,
                  lore: updatedLore,
                },
              },
            };
          }

          // Increment action counter
          worldState = {
            ...worldState,
            actionCounter: worldState.actionCounter + 1,
          };

          // Save the updated world state
          await saveWorldState(worldState);

          return Response.json({
            narrative: conversationResult.narrative,
            npcResponse: conversationResult.npcResponse,
            npcName: npc.name,
            attitudeChange: conversationResult.attitudeChange,
            newAttitude,
            suggestsEndConversation: conversationResult.suggestsEndConversation,
            newKnowledge: conversationResult.newKnowledge,
          });
        } catch (error) {
          // Handle errors from handleConversation
          const errorMessage = error instanceof Error ? error.message : "Conversation failed";
          return Response.json(
            { error: errorMessage },
            { status: 500 }
          );
        }
      },
    },

    // Get map data for canvas rendering
    "/api/world/map": {
      GET: () => {
        const mapData = getMapData(worldState);
        return Response.json(mapData);
      },
    },

    // Get journal data - quests, lore, deceased heroes
    "/api/world/journal": {
      GET: () => {
        const { quests, deceasedHeroes, player } = worldState;

        // Categorize quests by status
        const allQuests = Object.values(quests);
        const activeQuests = allQuests
          .filter((q) => q.status === "active")
          .map((q) => ({
            id: q.id,
            title: q.title,
            description: q.description,
            giverNpcId: q.giverNpcId,
            objectives: q.objectives,
            completedObjectives: q.completedObjectives,
          }));

        const completedQuests = allQuests
          .filter((q) => q.status === "completed")
          .map((q) => ({
            id: q.id,
            title: q.title,
            description: q.description,
            giverNpcId: q.giverNpcId,
            rewards: q.rewards,
          }));

        const failedQuests = allQuests
          .filter((q) => q.status === "failed" || q.status === "impossible")
          .map((q) => ({
            id: q.id,
            title: q.title,
            description: q.description,
            status: q.status,
          }));

        // Get known lore
        const knownLore = player.knowledge.lore;

        // Format deceased heroes for display
        const deceasedHeroesDisplay = deceasedHeroes.map((hero) => ({
          id: hero.id,
          name: hero.name,
          origin: hero.origin,
          deathDescription: hero.deathDescription,
          deathLocationId: hero.deathLocationId,
          majorDeeds: hero.majorDeeds,
          diedAtAction: hero.diedAtAction,
        }));

        return Response.json({
          activeQuests,
          completedQuests,
          failedQuests,
          knownLore,
          deceasedHeroes: deceasedHeroesDisplay,
        });
      },
    },

    // Create a new character after death
    "/api/world/new-character": {
      POST: async (req) => {
        const body = await req.json() as { backstory?: string };
        const { backstory } = body;

        if (!backstory || typeof backstory !== "string") {
          return Response.json(
            { error: "backstory is required and must be a string" },
            { status: 400 }
          );
        }

        try {
          // Generate the new character
          const result = await generateNewCharacter(worldState, backstory.trim());

          // Apply the new player to world state
          worldState = {
            ...worldState,
            player: result.player,
          };

          // Apply NPC knowledge updates
          for (const update of result.npcUpdates) {
            const npc = worldState.npcs[update.npcId];
            if (npc) {
              worldState = {
                ...worldState,
                npcs: {
                  ...worldState.npcs,
                  [update.npcId]: {
                    ...npc,
                    knowledge: [
                      ...npc.knowledge,
                      ...update.newKnowledge.filter(
                        (k) => !npc.knowledge.includes(k)
                      ),
                    ],
                  },
                },
              };
            }
          }

          // Save the updated world state
          await saveWorldState(worldState);

          // Get starting location details
          const startingLocation = worldState.locations[result.player.currentLocationId];

          return Response.json({
            player: {
              name: result.player.name,
              physicalDescription: result.player.physicalDescription,
              origin: result.player.origin,
              health: result.player.health,
              maxHealth: result.player.maxHealth,
              gold: result.player.gold,
              level: result.player.level,
            },
            narrative: result.narrative,
            startingLocation: startingLocation ? {
              id: startingLocation.id,
              name: startingLocation.name,
              description: startingLocation.description,
              terrain: startingLocation.terrain,
            } : null,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Character creation failed";
          return Response.json(
            { error: errorMessage },
            { status: 500 }
          );
        }
      },
    },

    // Create a new character with a fresh world
    "/api/world/create-character": {
      POST: async (req) => {
        const body = await req.json() as { name?: string; backstoryHints?: string };
        const { name, backstoryHints } = body;

        // Validate name
        if (!name || typeof name !== "string" || name.trim().length === 0) {
          return Response.json(
            { error: "name is required and must be a non-empty string" },
            { status: 400 }
          );
        }

        const trimmedName = name.trim();

        // Validate name length
        if (trimmedName.length < 2 || trimmedName.length > 50) {
          return Response.json(
            { error: "name must be between 2 and 50 characters" },
            { status: 400 }
          );
        }

        try {
          // Generate the initial character and fresh world
          const result = await generateInitialCharacter(
            trimmedName,
            backstoryHints?.trim() || ""
          );

          // Replace the current world state with the fresh world
          worldState = result.worldState;

          // Save the new world state
          await saveWorldState(worldState);

          // Get starting location details
          const startingLocation = worldState.locations[result.player.currentLocationId];

          // Generate initial suggested actions for the player
          const suggestedActions = await generateSuggestedActions(worldState);
          lastSuggestedActions = suggestedActions;

          return Response.json({
            player: {
              name: result.player.name,
              physicalDescription: result.player.physicalDescription,
              origin: result.player.origin,
              health: result.player.health,
              maxHealth: result.player.maxHealth,
              strength: result.player.strength,
              defense: result.player.defense,
              magic: result.player.magic,
              gold: result.player.gold,
              level: result.player.level,
              inventory: result.player.inventory.map((item) => ({
                id: item.id,
                name: item.name,
                description: item.description,
                type: item.type,
                value: item.value,
              })),
            },
            narrative: result.narrative,
            startingLocation: startingLocation ? {
              id: startingLocation.id,
              name: startingLocation.name,
              description: startingLocation.description,
              terrain: startingLocation.terrain,
              coordinates: startingLocation.coordinates,
            } : null,
            suggestedActions,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Character creation failed";
          return Response.json(
            { error: errorMessage },
            { status: 500 }
          );
        }
      },
    },

    // Process a combat action in the world system
    "/api/world/combat": {
      POST: async (req) => {
        const body = await req.json() as { action?: "attack" | "defend" | "flee" | "usePotion" };
        const { action } = body;

        // Validate action
        if (!action || !["attack", "defend", "flee", "usePotion"].includes(action)) {
          return Response.json(
            { error: "Invalid action. Must be one of: attack, defend, flee, usePotion" },
            { status: 400 }
          );
        }

        // Check if in combat
        if (!worldState.combatState) {
          return Response.json(
            { error: "Not in combat" },
            { status: 400 }
          );
        }

        // Process the combat action
        const result = processWorldCombatAction(worldState, action);
        worldState = result.newState;

        // Handle player death if defeated
        let deceasedHeroInfo = null;
        let deathNarrative = "";
        if (result.playerDefeated) {
          // Generate death description from combat context
          const enemyNpc = worldState.npcs[worldState.combatState?.enemyNpcId || ""];
          const previousPlayerName = worldState.player.name;
          deathNarrative = enemyNpc
            ? `Alas, ${previousPlayerName || "our hero"} has fallen in combat against ${enemyNpc.name}! The world grows darker, yet hope springs eternal...`
            : `Alas, ${previousPlayerName || "our hero"} has fallen in combat! The world grows darker, yet hope springs eternal...`;
          const deathDescription = enemyNpc
            ? `Fell in combat against ${enemyNpc.name}`
            : "Fell in combat";

          worldState = handlePlayerDeath(worldState, deathDescription);

          // Get the deceased hero info for the death screen
          const lastDeceasedHero = worldState.deceasedHeroes[worldState.deceasedHeroes.length - 1];
          if (lastDeceasedHero) {
            deceasedHeroInfo = {
              id: lastDeceasedHero.id,
              name: lastDeceasedHero.name,
              physicalDescription: lastDeceasedHero.physicalDescription,
              origin: lastDeceasedHero.origin,
              diedAtAction: lastDeceasedHero.diedAtAction,
              deathDescription: lastDeceasedHero.deathDescription,
              deathLocationId: lastDeceasedHero.deathLocationId,
              majorDeeds: lastDeceasedHero.majorDeeds,
            };
          }
        }

        // Increment action counter
        worldState = {
          ...worldState,
          actionCounter: worldState.actionCounter + 1,
        };

        // Save the updated world state
        await saveWorldState(worldState);

        // Get enemy info for UI
        let enemyInfo = null;
        if (worldState.combatState) {
          const enemy = worldState.npcs[worldState.combatState.enemyNpcId];
          if (enemy) {
            enemyInfo = {
              id: enemy.id,
              name: enemy.name,
              description: enemy.description,
              health: enemy.stats.health,
              maxHealth: enemy.stats.maxHealth,
            };
          }
        }

        return Response.json({
          messages: result.messages,
          combatEnded: result.combatEnded,
          playerVictory: result.playerVictory,
          playerDefeated: result.playerDefeated,
          fled: result.fled,
          experienceGained: result.experienceGained,
          goldGained: result.goldGained,
          leveledUp: result.leveledUp,
          playerHealth: worldState.player.health,
          playerMaxHealth: worldState.player.maxHealth,
          enemy: enemyInfo,
          inCombat: worldState.combatState !== null,
          // Include death info when player is defeated
          deathNarrative: result.playerDefeated ? deathNarrative : undefined,
          deceasedHero: result.playerDefeated ? deceasedHeroInfo : undefined,
        });
      },
    },

    // Initiate combat with an NPC
    "/api/world/combat/start": {
      POST: async (req) => {
        const body = await req.json() as { npcId?: string };
        const { npcId } = body;

        if (!npcId || typeof npcId !== "string") {
          return Response.json(
            { error: "npcId is required" },
            { status: 400 }
          );
        }

        // Check if already in combat
        if (worldState.combatState) {
          return Response.json(
            { error: "Already in combat" },
            { status: 400 }
          );
        }

        // Check NPC exists and is alive
        const npc = worldState.npcs[npcId];
        if (!npc) {
          return Response.json(
            { error: "NPC not found" },
            { status: 404 }
          );
        }

        if (!npc.isAlive) {
          return Response.json(
            { error: `${npc.name} is already dead` },
            { status: 400 }
          );
        }

        // Check NPC is at current location
        const currentLocation = worldState.locations[worldState.player.currentLocationId];
        if (!currentLocation?.presentNpcIds.includes(npcId)) {
          return Response.json(
            { error: `${npc.name} is not here` },
            { status: 400 }
          );
        }

        // Initiate combat
        worldState = initiateWorldCombat(worldState, npcId);

        // Save the updated world state
        await saveWorldState(worldState);

        return Response.json({
          message: `Combat begins with ${npc.name}!`,
          enemy: {
            id: npc.id,
            name: npc.name,
            description: npc.description,
            health: npc.stats.health,
            maxHealth: npc.stats.maxHealth,
          },
          inCombat: true,
        });
      },
    },

    // Reset the world and start fresh
    "/api/world/reset": {
      POST: async () => {
        try {
          // Create a completely fresh seed world
          worldState = createSeedWorld();

          // Save the new world state
          await saveWorldState(worldState);

          // Clear last suggested actions
          lastSuggestedActions = [];

          console.log("🔄 World has been reset to initial state");

          return Response.json({
            success: true,
            message: "World has been reset. Create a new character to begin.",
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to reset world";
          return Response.json(
            { error: errorMessage },
            { status: 500 }
          );
        }
      },
    },

    // Fast travel to a known location with potential encounters
    "/api/world/travel": {
      POST: async (req) => {
        const body = await req.json() as { destinationId?: string };
        const { destinationId } = body;

        // Validate input
        if (!destinationId || typeof destinationId !== "string") {
          return Response.json(
            { error: "destinationId is required" },
            { status: 400 }
          );
        }

        // Check destination exists
        const destination = worldState.locations[destinationId];
        if (!destination) {
          return Response.json(
            { error: "Destination not found" },
            { status: 404 }
          );
        }

        // Validate destination is in player knowledge
        const playerKnowledge = worldState.player.knowledge;
        const knowsDestination = playerKnowledge.locations.some(
          (knownLoc) =>
            knownLoc === destinationId ||
            knownLoc.toLowerCase() === destination.name.toLowerCase()
        );

        if (!knowsDestination) {
          // Generate a playful rejection narrative
          const rejection = await generateNarratorRejection(
            [destination.name],
            `travel to ${destination.name}`
          );

          // Generate new suggested actions
          const suggestedActions = await generateSuggestedActions(worldState);
          lastSuggestedActions = suggestedActions;

          return Response.json({
            narrative: rejection,
            suggestedActions,
            knowledgeRejection: true,
            unknownDestination: destinationId,
          });
        }

        try {
          // Handle the travel with potential encounters
          const travelResult = await handleTravel(worldState, destinationId);

          // Apply state changes from travel
          worldState = applyStateChanges(worldState, travelResult.stateChanges as any);

          // Increment action counter
          worldState = {
            ...worldState,
            actionCounter: worldState.actionCounter + 1,
          };

          // Save the updated world state
          await saveWorldState(worldState);

          // Generate new suggested actions based on final location
          const suggestedActions = await generateSuggestedActions(worldState);
          lastSuggestedActions = suggestedActions;

          // Pre-generate images for movement destinations in background (non-blocking)
          preGenerateImagesForDestinations(worldState, suggestedActions);

          // Get final location details
          const finalLocation = worldState.locations[travelResult.finalLocationId];

          return Response.json({
            narrative: travelResult.narrative,
            arrived: travelResult.arrived,
            finalLocation: finalLocation ? {
              id: finalLocation.id,
              name: finalLocation.name,
              description: finalLocation.description,
              terrain: finalLocation.terrain,
              coordinates: finalLocation.coordinates,
            } : null,
            encounter: travelResult.encounter,
            suggestedActions,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Travel failed";
          return Response.json(
            { error: errorMessage },
            { status: 500 }
          );
        }
      },
    },
  },

  development: {
    hmr: true,
    console: true,
  },
});

console.log(`
🐉 Dragon's Bane - Text RPG Server
================================
Server running at: http://localhost:${server.port}

${process.env.OPENAI_API_KEY ? "✅ OpenAI API key detected - AI images enabled!" : "⚠️  No OPENAI_API_KEY set - using placeholder images"}

Press Ctrl+C to stop
`);
