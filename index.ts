import index from "./public/index.html";
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
import { generateSuggestedActions, resolveAction, extractReferences, generateNarratorRejection, handleConversation } from "./src/world/gptService";
import { applyStateChanges, validateKnowledge } from "./src/world/stateManager";
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
        const { player, locations, npcs } = worldState;
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
        };

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
