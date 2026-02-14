// GPT Service for AI-generated content
import OpenAI from "openai";
import type { WorldState, ActionResult, SuggestedAction, Location, NPC, ConversationSummary, Player, WorldItem, StateChange } from "./types";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Model configuration - prefer gpt-5-mini, fallback to gpt-4o-mini
const PRIMARY_MODEL = "gpt-5-mini";
const FALLBACK_MODEL = "gpt-4o-mini";

// Narrator personality: chaotic trickster, first person
const NARRATOR_PERSONALITY = `You are the narrator of Dragon's Bane, a fantasy medieval text RPG. You speak in first person as a chaotic trickster narrator - playful, witty, and occasionally breaking the fourth wall.

Your personality traits:
- Playful and mischievous, finding amusement in the player's choices
- Witty and quick with wordplay and clever observations
- Occasionally breaks the fourth wall with knowing winks to the audience
- Provides comic rejections for impossible or absurd actions ("Ah, you wish to fly? How delightfully ambitious. Perhaps in your next life.")
- Dramatic flair when describing combat and danger
- Warm undertones - you're rooting for the player even while teasing them

Example voice:
- "Ah, consulting your pack again? Let's see what treasures you've squirreled away..."
- "The blacksmith eyes you with the warmth of a wet forge. I'd tread carefully, were I you."
- "You push open the tavern door and the smell of... well, let's call it 'character' washes over you."

Always respond in this narrator voice. Keep high fantasy tone - reject modern or sci-fi elements with playful dismissal.`;

export interface GPTCallOptions {
  systemPrompt?: string;
  userPrompt: string;
  jsonSchema?: Record<string, unknown>;
  maxTokens?: number;
}

export interface GPTResponse<T = unknown> {
  content: T;
  model: string;
  tokensUsed: number;
}

/**
 * Call GPT with the narrator personality and optional JSON schema.
 * Uses gpt-5-mini with fallback to gpt-4o-mini if not available.
 */
export async function callGPT<T = string>(
  options: GPTCallOptions
): Promise<GPTResponse<T>> {
  const { systemPrompt, userPrompt, jsonSchema, maxTokens = 2000 } = options;

  // Build the full system prompt with narrator personality
  const fullSystemPrompt = systemPrompt
    ? `${NARRATOR_PERSONALITY}\n\n${systemPrompt}`
    : NARRATOR_PERSONALITY;

  // Try primary model first, then fallback
  let modelToUse = PRIMARY_MODEL;
  let response: OpenAI.Chat.Completions.ChatCompletion;

  try {
    if (jsonSchema) {
      // Use structured output with JSON schema
      response = await openai.chat.completions.create({
        model: modelToUse,
        messages: [
          { role: "system", content: fullSystemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: maxTokens,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "response",
            strict: true,
            schema: jsonSchema,
          },
        },
      });
    } else {
      // Plain text response
      response = await openai.chat.completions.create({
        model: modelToUse,
        messages: [
          { role: "system", content: fullSystemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: maxTokens,
      });
    }
  } catch (error: unknown) {
    // If primary model fails (model not found), try fallback
    if (
      error instanceof Error &&
      (error.message.includes("model") || error.message.includes("not found"))
    ) {
      console.log(
        `Model ${PRIMARY_MODEL} not available, falling back to ${FALLBACK_MODEL}`
      );
      modelToUse = FALLBACK_MODEL;

      if (jsonSchema) {
        response = await openai.chat.completions.create({
          model: modelToUse,
          messages: [
            { role: "system", content: fullSystemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: maxTokens,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "response",
              strict: true,
              schema: jsonSchema,
            },
          },
        });
      } else {
        response = await openai.chat.completions.create({
          model: modelToUse,
          messages: [
            { role: "system", content: fullSystemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: maxTokens,
        });
      }
    } else {
      throw error;
    }
  }

  const content = response.choices[0]?.message?.content ?? "";
  const tokensUsed = response.usage?.total_tokens ?? 0;

  // Parse JSON if schema was provided
  if (jsonSchema) {
    try {
      return {
        content: JSON.parse(content) as T,
        model: modelToUse,
        tokensUsed,
      };
    } catch {
      throw new Error(`Failed to parse GPT JSON response: ${content}`);
    }
  }

  return {
    content: content as T,
    model: modelToUse,
    tokensUsed,
  };
}

/**
 * Call GPT for a simple narrative response (no JSON).
 * Convenience wrapper around callGPT.
 */
export async function callGPTNarrative(
  userPrompt: string,
  additionalSystemPrompt?: string
): Promise<string> {
  const response = await callGPT<string>({
    userPrompt,
    systemPrompt: additionalSystemPrompt,
    maxTokens: 1500,
  });
  return response.content;
}

/**
 * Build context string for GPT action resolution.
 * Includes current location, nearby NPCs, recent events, player stats and inventory.
 * Kept under 4000 tokens for efficiency.
 */
export function buildActionContext(worldState: WorldState): string {
  const { player, locations, npcs, eventHistory } = worldState;
  const currentLocation = locations[player.currentLocationId];

  // Build location context
  const locationContext = currentLocation
    ? `CURRENT LOCATION: ${currentLocation.name}
Description: ${currentLocation.description}
Terrain: ${currentLocation.terrain}
Danger Level: ${currentLocation.dangerLevel}/10
Structures: ${currentLocation.structures.length > 0 ? currentLocation.structures.map((s) => s.name).join(", ") : "None"}
Items visible: ${currentLocation.items.length > 0 ? currentLocation.items.map((i) => i.name).join(", ") : "None"}`
    : "CURRENT LOCATION: Unknown";

  // Build NPC context - only NPCs at current location
  const presentNpcs = currentLocation?.presentNpcIds
    .map((id) => npcs[id])
    .filter((npc) => npc && npc.isAlive) || [];

  const npcContext =
    presentNpcs.length > 0
      ? `NPCS PRESENT:
${presentNpcs
          .map((npc) => {
            const attitudeDesc =
              npc.attitude >= 70
                ? "very friendly"
                : npc.attitude >= 40
                  ? "friendly"
                  : npc.attitude >= 10
                    ? "neutral"
                    : npc.attitude >= -30
                      ? "wary"
                      : "hostile";
            return `- ${npc.name}: ${npc.description} (${attitudeDesc} toward player)`;
          })
          .join("\n")}`
      : "NPCS PRESENT: None";

  // Build recent event history - last 5 events
  const recentEvents = eventHistory.slice(-5);
  const eventContext =
    recentEvents.length > 0
      ? `RECENT EVENTS:
${recentEvents.map((e) => `- ${e.description}`).join("\n")}`
      : "RECENT EVENTS: None";

  // Build player stats summary
  const playerStats = `PLAYER STATUS:
Name: ${player.name || "Unknown"}
Health: ${player.health}/${player.maxHealth}
Gold: ${player.gold}
Level: ${player.level}
Stats: STR ${player.strength}, DEF ${player.defense}, MAG ${player.magic}
Companions: ${player.companionIds.length > 0 ? player.companionIds.map((id) => npcs[id]?.name || id).join(", ") : "None"}
Transformations: ${player.transformations.length > 0 ? player.transformations.join(", ") : "None"}
Curses: ${player.curses.length > 0 ? player.curses.join(", ") : "None"}
Blessings: ${player.blessings.length > 0 ? player.blessings.join(", ") : "None"}`;

  // Build inventory summary - truncate if too long
  const inventoryItems = player.inventory.slice(0, 10); // Max 10 items shown
  const inventorySummary = `INVENTORY (${player.inventory.length} items):
${inventoryItems.length > 0 ? inventoryItems.map((i) => `- ${i.name} (${i.type})`).join("\n") : "Empty"}${player.inventory.length > 10 ? `\n... and ${player.inventory.length - 10} more items` : ""}`;

  // Build knowledge summary - brief
  const knowledgeSummary = `KNOWN LOCATIONS: ${player.knowledge.locations.length > 0 ? player.knowledge.locations.slice(0, 5).join(", ") : "None"}${player.knowledge.locations.length > 5 ? ` (+${player.knowledge.locations.length - 5} more)` : ""}
KNOWN NPCS: ${player.knowledge.npcs.length > 0 ? player.knowledge.npcs.slice(0, 5).join(", ") : "None"}${player.knowledge.npcs.length > 5 ? ` (+${player.knowledge.npcs.length - 5} more)` : ""}`;

  // Combine all context sections
  return `${locationContext}

${npcContext}

${eventContext}

${playerStats}

${inventorySummary}

${knowledgeSummary}`;
}

// JSON Schema for ActionResult response from GPT
const ACTION_RESULT_SCHEMA = {
  type: "object",
  properties: {
    narrative: {
      type: "string",
      description: "The narrator's description of what happened",
    },
    stateChanges: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [
              "move_player",
              "move_npc",
              "add_item",
              "remove_item",
              "update_npc_attitude",
              "npc_death",
              "player_damage",
              "player_heal",
              "add_knowledge",
              "add_companion",
              "remove_companion",
              "create_structure",
              "destroy_structure",
              "update_location",
              "create_npc",
              "create_location",
              "add_quest",
              "update_faction",
              "player_transform",
              "add_curse",
              "add_blessing",
              "skill_practice",
              "gold_change",
            ],
          },
          data: {
            type: "object",
            additionalProperties: true,
          },
        },
        required: ["type", "data"],
        additionalProperties: false,
      },
    },
    suggestedActions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Unique identifier for the action",
          },
          text: {
            type: "string",
            description: "Human-readable action text",
          },
          type: {
            type: "string",
            enum: [
              "move",
              "talk",
              "examine",
              "use",
              "attack",
              "craft",
              "build",
              "travel",
              "other",
            ],
          },
          targetLocationId: {
            type: "string",
            description: "Location ID if this is a movement action",
          },
          targetNpcId: {
            type: "string",
            description: "NPC ID if this targets an NPC",
          },
        },
        required: ["id", "text", "type"],
        additionalProperties: false,
      },
    },
    initiatesCombat: {
      type: "string",
      description: "NPC ID to fight if combat starts, omit if no combat",
    },
    revealsFlashback: {
      type: "string",
      description: "Flashback content to reveal, omit if none",
    },
    newKnowledge: {
      type: "array",
      items: { type: "string" },
      description: "New knowledge gained by the player",
    },
    questUpdates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          questId: { type: "string" },
          status: {
            type: "string",
            enum: ["active", "completed", "failed", "impossible"],
          },
          completedObjectives: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["questId", "status"],
        additionalProperties: false,
      },
    },
  },
  required: ["narrative", "stateChanges", "suggestedActions"],
  additionalProperties: false,
};

/**
 * Resolve a player action using GPT.
 * Takes the world state and player's action text, returns an ActionResult
 * containing narrative, state changes, and suggested follow-up actions.
 */
export async function resolveAction(
  worldState: WorldState,
  action: string
): Promise<ActionResult> {
  const context = buildActionContext(worldState);

  const systemPrompt = `You are resolving player actions in a fantasy medieval RPG.

Given the current game context and the player's attempted action, determine:
1. What happens as a result (narrate it dramatically in first person as the chaotic trickster narrator)
2. What state changes occur in the world
3. What actions the player might take next (3-6 suggestions)

RULES:
- Almost anything is possible if it makes narrative sense within high fantasy
- Be the arbiter of what's reasonable - reject absurd actions playfully
- If an action would harm NPCs or steal, roll for success narratively (consider NPC vigilance, player stats)
- Combat only initiates for direct hostile actions toward capable opponents
- Movement between locations should use the 'move_player' state change
- NPCs can only be talked to if they're present at the current location
- Generate unique IDs for new suggested actions using simple lowercase strings like "action_1", "action_2"

STATE CHANGE TYPES:
- move_player: { locationId: string } - Move player to a location
- add_item: { item: WorldItem } - Add item to player inventory
- remove_item: { itemId: string } - Remove item from player inventory
- gold_change: { amount: number } - Change player gold (positive or negative)
- player_damage: { amount: number } - Damage player
- player_heal: { amount: number } - Heal player
- add_knowledge: { type: "location"|"npc"|"lore", value: string } - Add to player knowledge
- update_npc_attitude: { npcId: string, change: number } - Change NPC attitude
- move_npc: { npcId: string, locationId: string } - Move an NPC
- npc_death: { npcId: string, description: string } - Kill an NPC
- add_companion: { npcId: string } - Add NPC as companion
- remove_companion: { npcId: string } - Remove NPC as companion

SUGGESTED ACTION TYPES:
- move: Walk to an adjacent location
- talk: Speak with an NPC
- examine: Look at something closely
- use: Use an item or interact with something
- attack: Initiate combat
- craft: Try to make something
- build: Construct a structure
- travel: Fast travel to a known distant location
- other: Any other action`;

  const userPrompt = `${context}

PLAYER ACTION: ${action}

Resolve this action and return the result as JSON.`;

  const response = await callGPT<ActionResult>({
    systemPrompt,
    userPrompt,
    jsonSchema: ACTION_RESULT_SCHEMA,
    maxTokens: 2500,
  });

  return response.content;
}

// JSON Schema for SuggestedActions response from GPT
const SUGGESTED_ACTIONS_SCHEMA = {
  type: "object",
  properties: {
    actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Unique identifier for the action",
          },
          text: {
            type: "string",
            description: "Human-readable action text",
          },
          type: {
            type: "string",
            enum: [
              "move",
              "talk",
              "examine",
              "use",
              "attack",
              "craft",
              "build",
              "travel",
              "other",
            ],
          },
          targetLocationId: {
            type: "string",
            description: "Location ID if this is a movement action",
          },
          targetNpcId: {
            type: "string",
            description: "NPC ID if this targets an NPC",
          },
        },
        required: ["id", "text", "type"],
        additionalProperties: false,
      },
    },
  },
  required: ["actions"],
  additionalProperties: false,
};

/**
 * Extract potential entity references (locations, NPCs, items) from player input text.
 * Returns an array of potential references that should be validated against player knowledge.
 *
 * Uses heuristics to identify proper nouns and entity references:
 * - Capitalized words not at sentence start
 * - Quoted text
 * - Words following articles/prepositions that could be names
 */
export function extractReferences(text: string): string[] {
  const references: string[] = [];

  // Extract quoted text
  const quotedMatches = text.match(/"([^"]+)"|'([^']+)'/g);
  if (quotedMatches) {
    for (const match of quotedMatches) {
      references.push(match.replace(/['"]/g, "").trim());
    }
  }

  // Extract capitalized words (potential proper nouns)
  // Split into sentences first to avoid treating sentence-start words as proper nouns
  const sentences = text.split(/[.!?]+/);
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    // Get words after the first word (which would naturally be capitalized)
    const words = trimmed.split(/\s+/);
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      if (!word) continue;
      // Check if word starts with capital letter (and isn't "I")
      if (word.length > 1 && /^[A-Z][a-z]/.test(word)) {
        // Remove trailing punctuation
        const cleanWord = word.replace(/[,;:!?'"]+$/, "");
        if (cleanWord.length > 1) {
          references.push(cleanWord);
        }
      }
    }
  }

  // Extract phrases after certain keywords that often precede entity names
  const patterns = [
    /go to the?\s+([A-Za-z][A-Za-z\s]+?)(?:\.|,|!|\?|$)/gi,
    /travel to the?\s+([A-Za-z][A-Za-z\s]+?)(?:\.|,|!|\?|$)/gi,
    /visit the?\s+([A-Za-z][A-Za-z\s]+?)(?:\.|,|!|\?|$)/gi,
    /find the?\s+([A-Za-z][A-Za-z\s]+?)(?:\.|,|!|\?|$)/gi,
    /talk to the?\s+([A-Za-z][A-Za-z\s]+?)(?:\.|,|!|\?|$)/gi,
    /speak with the?\s+([A-Za-z][A-Za-z\s]+?)(?:\.|,|!|\?|$)/gi,
    /ask the?\s+([A-Za-z][A-Za-z\s]+?)\s+(?:about|for)/gi,
    /tell the?\s+([A-Za-z][A-Za-z\s]+?)\s+(?:about|that)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const ref = match[1];
      if (ref && ref.trim().length > 1) {
        references.push(ref.trim());
      }
    }
  }

  // Remove duplicates and filter out common words that aren't entity names
  const commonWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "it", "this", "that", "these", "those",
    "here", "there", "my", "your", "his", "her", "their", "our",
    "north", "south", "east", "west", "northeast", "northwest", "southeast", "southwest",
    "left", "right", "up", "down", "forward", "back", "around",
    "something", "someone", "nothing", "anything", "everything"
  ]);

  const uniqueRefs = [...new Set(references.map((r) => r.toLowerCase().trim()))]
    .filter((r) => r.length > 2 && !commonWords.has(r));

  return uniqueRefs;
}

/**
 * Generate a playful narrator rejection for when player references something they don't know about.
 * Uses the chaotic trickster narrator personality.
 */
export async function generateNarratorRejection(
  unknownReferences: string[],
  originalText: string
): Promise<string> {
  const refsFormatted =
    unknownReferences.length === 1
      ? `"${unknownReferences[0]}"`
      : unknownReferences.map((r) => `"${r}"`).join(", ");

  const systemPrompt = `Generate a short (1-3 sentences) playful rejection in your chaotic trickster narrator voice.

The player has mentioned something they don't know about yet in the game world. Reject their action with humor and wit, hinting they need to discover this information through gameplay.

RULES:
- Be playful, never harsh or mean
- Use your chaotic trickster voice with dramatic flair
- Gently tease the player for trying to know things they haven't discovered
- Keep it brief (1-3 sentences max)
- Don't explicitly tell them what they're missing or where to find it

EXAMPLES:
- "Ah, 'The Crimson Keep' you say? How curious that you speak of places as yet unknown to your mortal eyes. Perhaps stick to what you've actually seen, hmm?"
- "My, my! Inventing locations now, are we? I admire the creativity, truly I do, but this tale follows what YOU discover, not what you dream up."
- "Lord Vexmoor? *I* certainly haven't introduced you to any Lord Vexmoor. One might almost think you're peeking at someone else's adventure notes!"`;

  const userPrompt = `The player tried to: "${originalText}"

They mentioned these unknown references: ${refsFormatted}

Generate a brief, playful rejection in the narrator's voice.`;

  const response = await callGPTNarrative(userPrompt, systemPrompt);
  return response;
}

/**
 * Generate 3-6 contextual suggested actions based on the current world state.
 * Includes movement options (step carefully, travel to known locations),
 * NPC interactions, and item/environment interactions.
 */
export async function generateSuggestedActions(
  worldState: WorldState
): Promise<SuggestedAction[]> {
  const context = buildActionContext(worldState);
  const { player, locations, npcs } = worldState;
  const currentLocation = locations[player.currentLocationId];

  // Build additional context about possible destinations
  const adjacentDirections = ["north", "south", "east", "west"];
  const knownLocations = player.knowledge.locations
    .map((locName) => {
      const loc = Object.values(locations).find(
        (l) => l.name === locName || l.id === locName
      );
      return loc ? `${loc.name} (${loc.terrain})` : locName;
    })
    .slice(0, 5);

  // Get present NPCs for interaction options
  const presentNpcs =
    currentLocation?.presentNpcIds
      .map((id) => npcs[id])
      .filter((npc) => npc && npc.isAlive) || [];

  const systemPrompt = `You are generating contextual action suggestions for a fantasy medieval RPG.

Given the current game context, generate 3-6 suggested actions the player might take.

ACTION REQUIREMENTS:
1. ALWAYS include at least one movement option:
   - "Step carefully to the [direction]" for unexplored areas (type: "move")
   - "Travel to [known location name]" for fast travel (type: "travel", include targetLocationId)

2. If NPCs are present, include talk options:
   - "Speak with [NPC name]" (type: "talk", include targetNpcId)

3. Include contextual actions based on the situation:
   - Examine interesting features of the location
   - Use items from inventory if relevant
   - Interact with structures if present
   - Pick up items if visible

4. Actions should feel natural and contextual to the scene

AVAILABLE DIRECTIONS: ${adjacentDirections.join(", ")}
KNOWN LOCATIONS FOR TRAVEL: ${knownLocations.length > 0 ? knownLocations.join(", ") : "Only current location known"}
PRESENT NPCS: ${presentNpcs.map((npc) => `${npc.name} (ID: ${npc.id})`).join(", ") || "None"}

Generate unique IDs like "action_1", "action_2", etc.`;

  const userPrompt = `${context}

Generate 3-6 contextual suggested actions for the player. Include movement, interaction, and any situationally appropriate options.`;

  const response = await callGPT<{ actions: SuggestedAction[] }>({
    systemPrompt,
    userPrompt,
    jsonSchema: SUGGESTED_ACTIONS_SCHEMA,
    maxTokens: 1000,
  });

  return response.content.actions;
}

// JSON Schema for generated Location response from GPT
const GENERATED_LOCATION_SCHEMA = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "The name of the location (e.g., 'The Whispering Woods', 'Abandoned Mine Entrance')",
    },
    description: {
      type: "string",
      description: "A vivid, atmospheric description of the location (2-4 sentences)",
    },
    imagePrompt: {
      type: "string",
      description: "A detailed prompt for image generation, describing the visual scene",
    },
    terrain: {
      type: "string",
      enum: ["village", "forest", "mountain", "plains", "water", "cave", "dungeon", "road", "swamp", "desert"],
      description: "The type of terrain",
    },
    dangerLevel: {
      type: "number",
      description: "Danger level from 0 (safe) to 10 (extremely dangerous)",
    },
    features: {
      type: "array",
      items: { type: "string" },
      description: "Notable features or points of interest at this location",
    },
    possibleEncounters: {
      type: "array",
      items: { type: "string" },
      description: "Types of creatures or events that might occur here",
    },
  },
  required: ["name", "description", "imagePrompt", "terrain", "dangerLevel", "features", "possibleEncounters"],
  additionalProperties: false,
};

export interface GeneratedLocationData {
  name: string;
  description: string;
  imagePrompt: string;
  terrain: "village" | "forest" | "mountain" | "plains" | "water" | "cave" | "dungeon" | "road" | "swamp" | "desert";
  dangerLevel: number;
  features: string[];
  possibleEncounters: string[];
}

/**
 * Calculate new coordinates based on direction from a starting point.
 * Direction can be: "north", "south", "east", "west", "northeast", "northwest", "southeast", "southwest"
 */
function calculateCoordinatesFromDirection(
  from: { x: number; y: number },
  direction: string
): { x: number; y: number } {
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
 * Generate a new location dynamically based on direction from a departure point.
 *
 * @param worldState - The current world state
 * @param direction - The direction traveled ("north", "south", "east", "west", etc.)
 * @param fromLocationId - The ID of the location the player is departing from
 * @returns A complete Location object ready to be added to worldState
 */
export async function generateLocation(
  worldState: WorldState,
  direction: string,
  fromLocationId: string
): Promise<Location> {
  const fromLocation = worldState.locations[fromLocationId];

  if (!fromLocation) {
    throw new Error(`generateLocation: departure location not found: ${fromLocationId}`);
  }

  // Calculate coordinates for the new location
  const newCoordinates = calculateCoordinatesFromDirection(
    fromLocation.coordinates,
    direction
  );

  // Check if a location already exists at these coordinates
  const existingLocation = Object.values(worldState.locations).find(
    (loc) => loc.coordinates.x === newCoordinates.x && loc.coordinates.y === newCoordinates.y
  );

  if (existingLocation) {
    // Return existing location instead of generating a new one
    return existingLocation;
  }

  // Build context from the departure point and surrounding area
  const adjacentLocations = Object.values(worldState.locations).filter((loc) => {
    const dx = Math.abs(loc.coordinates.x - newCoordinates.x);
    const dy = Math.abs(loc.coordinates.y - newCoordinates.y);
    return dx <= 1 && dy <= 1 && (dx > 0 || dy > 0);
  });

  const nearbyTerrains = adjacentLocations.map((loc) => loc.terrain);
  const nearbyNames = adjacentLocations.map((loc) => loc.name);

  // Calculate average danger level of nearby areas (with slight increase for unexplored)
  const avgNearbyDanger = adjacentLocations.length > 0
    ? adjacentLocations.reduce((sum, loc) => sum + loc.dangerLevel, 0) / adjacentLocations.length
    : 2;

  // Build context about recent exploration
  const recentEvents = worldState.eventHistory.slice(-3)
    .map((e) => e.description)
    .join(" ");

  const systemPrompt = `You are generating a new location for a fantasy medieval RPG world.

The player is exploring ${direction} from "${fromLocation.name}" (${fromLocation.terrain}).
Generate a location that makes sense geographically and thematically.

CONTEXT FROM DEPARTURE POINT:
- Departing from: ${fromLocation.name}
- Departure terrain: ${fromLocation.terrain}
- Departure description: ${fromLocation.description}
- Departure danger level: ${fromLocation.dangerLevel}/10

NEARBY LOCATIONS (for geographic coherence):
${adjacentLocations.length > 0
    ? adjacentLocations.map((loc) => `- ${loc.name} (${loc.terrain}, danger ${loc.dangerLevel}/10)`).join("\n")
    : "- No explored locations nearby"}

GUIDELINES:
1. Terrain should make geographic sense (forests near forests, mountains near mountains, transitions should be gradual)
2. Danger level should be similar to nearby areas (±2 levels), average nearby danger is ${avgNearbyDanger.toFixed(1)}
3. Name should be evocative and fit high fantasy (e.g., "The Whispering Glade", "Broken Bridge Crossing", "Thornwick Dell")
4. Description should be atmospheric and hint at what the player might find
5. Image prompt should be detailed for DALL-E generation, include lighting, mood, and key visual elements
6. Features should include 2-4 interesting things to interact with or examine
7. Possible encounters should hint at what creatures or events might occur

IMPORTANT:
- Keep it high fantasy medieval - no modern or sci-fi elements
- The world is coherent - locations should feel connected to their surroundings
- Vary the danger level - not everything needs to be dangerous, but wilderness should feel wild`;

  const userPrompt = `Generate a new location ${direction} of "${fromLocation.name}".

Recent events: ${recentEvents || "No recent events"}

Generate a location that feels like a natural extension of the world, considering:
- It's ${direction} of a ${fromLocation.terrain}
- Nearby terrains include: ${nearbyTerrains.length > 0 ? nearbyTerrains.join(", ") : "unknown"}
- Nearby places: ${nearbyNames.length > 0 ? nearbyNames.join(", ") : "none explored yet"}

Return the location details as JSON.`;

  const response = await callGPT<GeneratedLocationData>({
    systemPrompt,
    userPrompt,
    jsonSchema: GENERATED_LOCATION_SCHEMA,
    maxTokens: 1000,
  });

  const generatedData = response.content;

  // Generate a unique ID for the new location
  const locationId = `loc_${direction}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  // Construct the complete Location object
  const newLocation: Location = {
    id: locationId,
    name: generatedData.name,
    description: generatedData.description,
    imagePrompt: generatedData.imagePrompt,
    coordinates: newCoordinates,
    terrain: generatedData.terrain,
    dangerLevel: Math.max(0, Math.min(10, generatedData.dangerLevel)), // Clamp to 0-10
    presentNpcIds: [],
    items: [],
    structures: [],
    notes: [],
    isCanonical: false, // Dynamically generated
    lastVisitedAtAction: undefined,
    imageStateHash: undefined,
  };

  return newLocation;
}

// JSON Schema for generated NPC response from GPT
const GENERATED_NPC_SCHEMA = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "The NPC's full name (e.g., 'Marta Ironwood', 'Grimjaw the Smith')",
    },
    description: {
      type: "string",
      description: "A brief description of who this NPC is and their role (1-2 sentences)",
    },
    physicalDescription: {
      type: "string",
      description: "Detailed physical appearance for image generation (hair, build, clothing, distinguishing features)",
    },
    soulInstruction: {
      type: "string",
      description: "A comprehensive paragraph covering: background/history, goals and motivations, personality traits, speech patterns, and how gullible/trusting they are. This drives all NPC behavior.",
    },
    knowledge: {
      type: "array",
      items: { type: "string" },
      description: "Things this NPC knows about (locations, people, lore, rumors, skills they can teach)",
    },
    attitude: {
      type: "number",
      description: "Initial attitude toward the player (-100 hostile to 100 very friendly). Most NPCs start neutral (0-30).",
    },
    isAnimal: {
      type: "boolean",
      description: "Whether this is an animal rather than a humanoid",
    },
    factionIds: {
      type: "array",
      items: { type: "string" },
      description: "IDs of factions this NPC belongs to (can be empty)",
    },
    stats: {
      type: "object",
      properties: {
        health: { type: "number", description: "Current health points" },
        maxHealth: { type: "number", description: "Maximum health points" },
        strength: { type: "number", description: "Combat strength (typically 5-20)" },
        defense: { type: "number", description: "Defense rating (typically 3-15)" },
      },
      required: ["health", "maxHealth", "strength", "defense"],
      additionalProperties: false,
    },
    inventory: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Item name" },
          description: { type: "string", description: "Item description" },
          type: {
            type: "string",
            enum: ["weapon", "armor", "potion", "food", "key", "misc", "material", "book", "magic"],
          },
          value: { type: "number", description: "Gold value of the item" },
        },
        required: ["name", "description", "type", "value"],
        additionalProperties: false,
      },
      description: "Items the NPC is carrying or has for sale",
    },
    potentialQuests: {
      type: "array",
      items: { type: "string" },
      description: "Brief descriptions of quests this NPC might give (1-3 quest hooks)",
    },
  },
  required: [
    "name",
    "description",
    "physicalDescription",
    "soulInstruction",
    "knowledge",
    "attitude",
    "isAnimal",
    "factionIds",
    "stats",
    "inventory",
    "potentialQuests",
  ],
  additionalProperties: false,
};

export interface GeneratedNPCData {
  name: string;
  description: string;
  physicalDescription: string;
  soulInstruction: string;
  knowledge: string[];
  attitude: number;
  isAnimal: boolean;
  factionIds: string[];
  stats: {
    health: number;
    maxHealth: number;
    strength: number;
    defense: number;
  };
  inventory: Array<{
    name: string;
    description: string;
    type: "weapon" | "armor" | "potion" | "food" | "key" | "misc" | "material" | "book" | "magic";
    value: number;
  }>;
  potentialQuests: string[];
}

/**
 * Generate a new NPC dynamically based on context.
 *
 * @param worldState - The current world state
 * @param context - Description of why/where this NPC is needed (e.g., "a mysterious traveler at the tavern", "a bandit ambushing on the road")
 * @param locationId - Optional specific location to place the NPC (defaults to player's current location)
 * @returns A complete NPC object ready to be added to worldState
 */
// JSON Schema for conversation response from GPT
const CONVERSATION_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    npcResponse: {
      type: "string",
      description: "The NPC's spoken response in their voice and manner",
    },
    npcInternalThought: {
      type: "string",
      description: "What the NPC is thinking but not saying (for narrator color)",
    },
    attitudeChange: {
      type: "number",
      description: "How much the NPC's attitude toward player changed (-20 to +20, usually -5 to +5)",
    },
    topicsDiscussed: {
      type: "array",
      items: { type: "string" },
      description: "Key topics or questions the player asked about",
    },
    informationRevealed: {
      type: "array",
      items: { type: "string" },
      description: "New information the NPC revealed (locations, people, lore)",
    },
    conversationSummary: {
      type: "string",
      description: "Brief summary of this exchange for memory (1-2 sentences)",
    },
    suggestsEndConversation: {
      type: "boolean",
      description: "Whether the NPC wants to end the conversation",
    },
    narratorFrame: {
      type: "string",
      description: "Optional narrator commentary before/after the NPC speaks (in chaotic trickster voice)",
    },
  },
  required: [
    "npcResponse",
    "npcInternalThought",
    "attitudeChange",
    "topicsDiscussed",
    "informationRevealed",
    "conversationSummary",
    "suggestsEndConversation",
    "narratorFrame",
  ],
  additionalProperties: false,
};

export interface ConversationResponse {
  npcResponse: string;
  npcInternalThought: string;
  attitudeChange: number;
  topicsDiscussed: string[];
  informationRevealed: string[];
  conversationSummary: string;
  suggestsEndConversation: boolean;
  narratorFrame: string;
}

export interface ConversationResult {
  narrative: string; // Full narrative including narrator framing and NPC dialogue
  npcResponse: string; // Just the NPC's spoken words
  attitudeChange: number;
  newKnowledge: string[];
  conversationSummary: string;
  suggestsEndConversation: boolean;
}

/**
 * Handle an extended conversation with an NPC.
 * Uses the NPC's soul instruction and past conversation history to generate
 * contextually appropriate, personality-consistent responses.
 *
 * @param worldState - Current world state
 * @param npcId - ID of the NPC being spoken to
 * @param playerMessage - What the player says to the NPC
 * @returns ConversationResult with narrative, response, and state changes
 */
export async function handleConversation(
  worldState: WorldState,
  npcId: string,
  playerMessage: string
): Promise<ConversationResult> {
  const npc = worldState.npcs[npcId];

  if (!npc) {
    throw new Error(`handleConversation: NPC not found: ${npcId}`);
  }

  if (!npc.isAlive) {
    throw new Error(`handleConversation: Cannot talk to dead NPC: ${npc.name}`);
  }

  // Check if NPC is present at player's location
  const playerLocation = worldState.locations[worldState.player.currentLocationId];
  if (!playerLocation?.presentNpcIds.includes(npcId)) {
    throw new Error(`handleConversation: NPC ${npc.name} is not present at current location`);
  }

  // Build conversation context from past conversations with this NPC
  const pastConversations = npc.conversationHistory.slice(-5); // Last 5 conversations
  const conversationHistoryContext = pastConversations.length > 0
    ? `PAST CONVERSATIONS WITH ${npc.name.toUpperCase()}:
${pastConversations
  .map((conv, index) => {
    const actionsAgo = worldState.actionCounter - conv.actionNumber;
    return `[${actionsAgo} actions ago] ${conv.summary}${conv.playerAsked?.length ? ` Player asked about: ${conv.playerAsked.join(", ")}` : ""}${conv.npcRevealed?.length ? ` ${npc.name} revealed: ${conv.npcRevealed.join(", ")}` : ""}`;
  })
  .join("\n")}`
    : `PAST CONVERSATIONS: None - this is the first conversation with ${npc.name}`;

  // Build player context
  const playerKnownAs = npc.playerNameKnown
    ? `The NPC knows the player as "${npc.playerNameKnown}".`
    : "The NPC does not know the player's name yet.";

  // Attitude description
  const attitudeDesc =
    npc.attitude >= 70
      ? "very friendly and warm"
      : npc.attitude >= 40
        ? "friendly and receptive"
        : npc.attitude >= 10
          ? "neutral and businesslike"
          : npc.attitude >= -30
            ? "wary and guarded"
            : "hostile and distrustful";

  // Build context about what's happening
  const locationContext = `LOCATION: ${playerLocation.name} - ${playerLocation.description}`;

  // Recent events for context
  const recentEvents = worldState.eventHistory
    .slice(-3)
    .filter((e) => e.involvedNpcIds.includes(npcId) || e.locationId === playerLocation.id)
    .map((e) => e.description)
    .join(" ");

  const systemPrompt = `You are roleplaying as ${npc.name} in a fantasy medieval RPG.

CHARACTER SOUL (this is who you ARE - follow this exactly):
${npc.soulInstruction}

CURRENT STATE:
- ${npc.name} is ${attitudeDesc} toward the player (attitude: ${npc.attitude}/100)
- ${playerKnownAs}
- Physical description: ${npc.physicalDescription}
- Current health: ${npc.stats.health}/${npc.stats.maxHealth}

WHAT ${npc.name.toUpperCase()} KNOWS:
${npc.knowledge.length > 0 ? npc.knowledge.join("\n") : "Nothing notable beyond common knowledge"}

${conversationHistoryContext}

${locationContext}

${recentEvents ? `RECENT EVENTS: ${recentEvents}` : ""}

CONVERSATION RULES:
1. Stay COMPLETELY in character based on the soul instruction
2. Use the speech patterns described in the soul instruction
3. Only reveal information that ${npc.name} would actually know
4. Attitude change should be small (-5 to +5 typically, up to ±20 for major events)
5. If the player asks about something ${npc.name} doesn't know, admit ignorance or deflect naturally
6. If the player is rude or threatening, respond according to ${npc.name}'s personality
7. Animals cannot speak (isAnimal: ${npc.isAnimal}) - they communicate through actions/sounds
8. The narrator (narratorFrame) provides witty commentary in chaotic trickster voice
9. Don't repeat the player's words back to them
10. Be concise - tavern conversations are typically brief exchanges

RESPONSE STRUCTURE:
- npcResponse: What ${npc.name} actually says OUT LOUD (dialogue only)
- npcInternalThought: What they're thinking but not saying
- narratorFrame: Brief narrator commentary (can be empty string if not needed)
- conversationSummary: Brief summary for memory (1-2 sentences)`;

  const userPrompt = `The player says to ${npc.name}: "${playerMessage}"

Generate ${npc.name}'s response, staying true to their soul instruction and current attitude.`;

  const response = await callGPT<ConversationResponse>({
    systemPrompt,
    userPrompt,
    jsonSchema: CONVERSATION_RESPONSE_SCHEMA,
    maxTokens: 1200,
  });

  const data = response.content;

  // Build the full narrative with narrator framing
  let narrative = "";

  if (data.narratorFrame) {
    narrative += data.narratorFrame + "\n\n";
  }

  // Add NPC's spoken response with attribution
  narrative += `${npc.name} says, "${data.npcResponse}"`;

  // Clamp attitude change to reasonable bounds
  const clampedAttitudeChange = Math.max(-20, Math.min(20, data.attitudeChange));

  // Convert revealed information to knowledge strings
  const newKnowledge = data.informationRevealed.filter((info) => info.length > 0);

  return {
    narrative,
    npcResponse: data.npcResponse,
    attitudeChange: clampedAttitudeChange,
    newKnowledge,
    conversationSummary: data.conversationSummary,
    suggestsEndConversation: data.suggestsEndConversation,
  };
}

// JSON Schema for location simulation response from GPT
const LOCATION_SIMULATION_SCHEMA = {
  type: "object",
  properties: {
    hasChanges: {
      type: "boolean",
      description: "Whether any changes occurred since last visit",
    },
    narrative: {
      type: "string",
      description: "Description of changes woven into an atmospheric narrative (or empty if no changes)",
    },
    npcMovements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          npcId: { type: "string", description: "ID of the NPC that moved" },
          reason: { type: "string", description: "Why they moved (based on soul instruction)" },
          destinationLocationId: { type: "string", description: "Where they went" },
        },
        required: ["npcId", "reason", "destinationLocationId"],
        additionalProperties: false,
      },
      description: "NPCs that moved away from this location since last visit",
    },
    npcArrivals: {
      type: "array",
      items: {
        type: "object",
        properties: {
          npcId: { type: "string", description: "ID of the NPC that arrived" },
          reason: { type: "string", description: "Why they arrived (based on soul instruction)" },
          fromLocationId: { type: "string", description: "Where they came from" },
        },
        required: ["npcId", "reason", "fromLocationId"],
        additionalProperties: false,
      },
      description: "NPCs that arrived at this location since last visit",
    },
    environmentalChanges: {
      type: "array",
      items: { type: "string" },
      description: "Minor environmental changes (weather, time of day effects, etc.)",
    },
    newItems: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          type: {
            type: "string",
            enum: ["weapon", "armor", "potion", "food", "key", "misc", "material", "book", "magic"],
          },
          value: { type: "number" },
        },
        required: ["name", "description", "type", "value"],
        additionalProperties: false,
      },
      description: "New items that appeared at this location (dropped by travelers, washed up, etc.)",
    },
    removedItemIds: {
      type: "array",
      items: { type: "string" },
      description: "IDs of items that were taken or disappeared from this location",
    },
  },
  required: ["hasChanges", "narrative", "npcMovements", "npcArrivals", "environmentalChanges", "newItems", "removedItemIds"],
  additionalProperties: false,
};

export interface LocationSimulationResult {
  hasChanges: boolean;
  narrative: string;
  npcMovements: Array<{
    npcId: string;
    reason: string;
    destinationLocationId: string;
  }>;
  npcArrivals: Array<{
    npcId: string;
    reason: string;
    fromLocationId: string;
  }>;
  environmentalChanges: string[];
  newItems: Array<{
    name: string;
    description: string;
    type: "weapon" | "armor" | "potion" | "food" | "key" | "misc" | "material" | "book" | "magic";
    value: number;
  }>;
  removedItemIds: string[];
}

/**
 * Simulate changes at a location since the player's last visit.
 * The world should feel alive - NPCs move based on their soul instructions,
 * items may appear or disappear, and the environment may change.
 *
 * @param worldState - The current world state
 * @param locationId - The ID of the location being entered
 * @returns LocationSimulationResult with narrative and state changes
 */
export async function simulateLocationChanges(
  worldState: WorldState,
  locationId: string
): Promise<LocationSimulationResult> {
  const location = worldState.locations[locationId];

  if (!location) {
    throw new Error(`simulateLocationChanges: location not found: ${locationId}`);
  }

  // Calculate actions elapsed since last visit
  const lastVisitedAt = location.lastVisitedAtAction ?? 0;
  const actionsElapsed = worldState.actionCounter - lastVisitedAt;

  // If the player was just here (or never left), no simulation needed
  if (actionsElapsed <= 0) {
    return {
      hasChanges: false,
      narrative: "",
      npcMovements: [],
      npcArrivals: [],
      environmentalChanges: [],
      newItems: [],
      removedItemIds: [],
    };
  }

  // Calculate chance of changes based on actions elapsed
  // Higher action count = higher chance of changes
  // At 10 actions: ~50% chance, at 50 actions: ~90% chance
  const changeChance = Math.min(0.9, 0.1 + (actionsElapsed * 0.04));
  const shouldSimulate = Math.random() < changeChance;

  // If chance fails and not too many actions elapsed, skip simulation
  if (!shouldSimulate && actionsElapsed < 20) {
    return {
      hasChanges: false,
      narrative: "",
      npcMovements: [],
      npcArrivals: [],
      environmentalChanges: [],
      newItems: [],
      removedItemIds: [],
    };
  }

  // Build context about NPCs currently at this location
  const presentNpcs = location.presentNpcIds
    .map((id) => worldState.npcs[id])
    .filter((npc): npc is NPC => npc !== undefined && npc.isAlive);

  // Find NPCs at nearby locations who might have come here
  const nearbyLocations = Object.values(worldState.locations).filter((loc) => {
    const dx = Math.abs(loc.coordinates.x - location.coordinates.x);
    const dy = Math.abs(loc.coordinates.y - location.coordinates.y);
    return dx <= 1 && dy <= 1 && loc.id !== locationId;
  });

  const nearbyNpcs: NPC[] = [];
  for (const nearbyLoc of nearbyLocations) {
    for (const npcId of nearbyLoc.presentNpcIds) {
      const npc = worldState.npcs[npcId];
      if (npc && npc.isAlive && !npc.isCompanion) {
        nearbyNpcs.push(npc);
      }
    }
  }

  // Get recent events for context
  const recentLocationEvents = worldState.eventHistory
    .filter((e) => e.locationId === locationId)
    .slice(-3);

  const systemPrompt = `You are simulating world changes at a location in a fantasy medieval RPG.

The player is entering a location they haven't visited for ${actionsElapsed} actions (game turns).
The world should feel alive - NPCs pursue their goals, items come and go, and the environment changes.

SIMULATION RULES:
1. NPCs move based on their soul instructions - merchants travel to sell, guards patrol, wanderers wander
2. The more actions elapsed, the more likely changes have occurred
3. Keep changes believable and consistent with NPC personalities
4. Environmental changes should be subtle (weather, time of day effects, seasonal hints)
5. New items might appear from travelers dropping things, nature providing, or events
6. Items might disappear if NPCs took them or they spoiled/decayed
7. The narrative should smoothly describe what changed since last visit
8. If an NPC's home is this location, they're more likely to return here
9. Companions (isCompanion: true) should NEVER move independently - they stay with the player

IMPORTANT:
- Only move NPCs to locations that actually exist (use provided location IDs)
- NPCs should only arrive from nearby locations (the ones listed)
- Keep the narrative in chaotic trickster narrator voice
- If no meaningful changes, set hasChanges: false and provide empty narrative

PRESENT NPCS (may have left):
${presentNpcs.length > 0
    ? presentNpcs.map((npc) => `- ${npc.name} (ID: ${npc.id}): ${npc.soulInstruction.substring(0, 200)}...`).join("\n")
    : "None currently here"}

NEARBY NPCS (may have arrived):
${nearbyNpcs.length > 0
    ? nearbyNpcs.map((npc) => `- ${npc.name} (ID: ${npc.id}) at ${worldState.locations[npc.currentLocationId]?.name || "unknown"}: ${npc.soulInstruction.substring(0, 200)}...`).join("\n")
    : "No NPCs nearby"}

NEARBY LOCATIONS (valid movement destinations):
${nearbyLocations.map((loc) => `- ${loc.name} (ID: ${loc.id}, ${loc.terrain})`).join("\n")}

LOCATION DETAILS:
- Name: ${location.name}
- Terrain: ${location.terrain}
- Description: ${location.description}
- Current items: ${location.items.map((i) => `${i.name} (ID: ${i.id})`).join(", ") || "None"}
- Structures: ${location.structures.map((s) => s.name).join(", ") || "None"}

RECENT EVENTS AT THIS LOCATION:
${recentLocationEvents.length > 0
    ? recentLocationEvents.map((e) => `- ${e.description}`).join("\n")
    : "No recent events"}`;

  const userPrompt = `Simulate what changed at "${location.name}" over ${actionsElapsed} actions.

Actions elapsed: ${actionsElapsed}
Change probability context: ${actionsElapsed < 5 ? "Very recent visit - minor changes only" : actionsElapsed < 15 ? "Some time has passed - moderate changes possible" : actionsElapsed < 30 ? "Significant time passed - notable changes likely" : "Long absence - expect meaningful changes"}

Generate believable world changes and describe them in an atmospheric narrative. If nothing meaningful changed, return hasChanges: false with empty narrative.`;

  const response = await callGPT<LocationSimulationResult>({
    systemPrompt,
    userPrompt,
    jsonSchema: LOCATION_SIMULATION_SCHEMA,
    maxTokens: 1200,
  });

  return response.content;
}

// JSON Schema for new character generation response from GPT
const NEW_CHARACTER_SCHEMA = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "The character's name (can be a full name or just a first name)",
    },
    physicalDescription: {
      type: "string",
      description: "Detailed physical appearance for image generation (hair, build, clothing, distinguishing features)",
    },
    origin: {
      type: "string",
      description: "A brief description of where the character comes from (e.g., 'a small fishing village to the south', 'the streets of a distant city')",
    },
    hiddenBackstory: {
      type: "string",
      description: "A hidden backstory paragraph (4-6 sentences) containing secrets, past events, and connections that can be revealed through flashbacks during gameplay",
    },
    startingNarrative: {
      type: "string",
      description: "An atmospheric narrator introduction (2-4 sentences) in chaotic trickster voice describing how this new hero arrives in Millbrook",
    },
    knownLore: {
      type: "array",
      items: { type: "string" },
      description: "1-3 pieces of lore the character would know from their background",
    },
    connectionToFallenHeroes: {
      type: "string",
      description: "If there are deceased heroes, a brief description of any connection this character has to them (or empty string if none)",
    },
  },
  required: [
    "name",
    "physicalDescription",
    "origin",
    "hiddenBackstory",
    "startingNarrative",
    "knownLore",
    "connectionToFallenHeroes",
  ],
  additionalProperties: false,
};

export interface GeneratedCharacterData {
  name: string;
  physicalDescription: string;
  origin: string;
  hiddenBackstory: string;
  startingNarrative: string;
  knownLore: string[];
  connectionToFallenHeroes: string;
}

export interface NewCharacterResult {
  player: Player;
  narrative: string;
  npcUpdates: Array<{ npcId: string; newKnowledge: string[] }>;
}

/**
 * Generate a new character after player death.
 *
 * GPT generates an origin story based on player input. The new character starts
 * with fresh stats and empty inventory, and player knowledge resets to the
 * starting location only. NPCs who knew the previous character may reference them.
 *
 * @param worldState - The current world state (should already have death processed via handlePlayerDeath)
 * @param backstoryInput - Player's input about their character's background/hints
 * @returns NewCharacterResult with the new Player object, narrative, and any NPC knowledge updates
 */
export async function generateNewCharacter(
  worldState: WorldState,
  backstoryInput: string
): Promise<NewCharacterResult> {
  // Gather info about deceased heroes for potential connections
  const deceasedHeroes = worldState.deceasedHeroes;
  const recentDeceasedHeroes = deceasedHeroes.slice(-3); // Last 3 fallen heroes

  // Find NPCs who knew previous heroes
  const npcsWhoKnewHeroes: Array<{ npc: NPC; knewHeroNames: string[] }> = [];
  for (const hero of deceasedHeroes) {
    for (const npcId of hero.knownByNpcIds) {
      const npc = worldState.npcs[npcId];
      if (npc && npc.isAlive) {
        const existing = npcsWhoKnewHeroes.find((entry) => entry.npc.id === npcId);
        if (existing) {
          if (hero.name && !existing.knewHeroNames.includes(hero.name)) {
            existing.knewHeroNames.push(hero.name);
          }
        } else {
          npcsWhoKnewHeroes.push({
            npc,
            knewHeroNames: hero.name ? [hero.name] : [],
          });
        }
      }
    }
  }

  // Get the starting location info
  const startingLocation = worldState.locations["loc_millbrook_square"] ||
    worldState.locations["loc_village_square"] ||
    Object.values(worldState.locations).find((loc) => loc.terrain === "village");

  const startingLocationId = startingLocation?.id || "loc_village_square";
  const startingLocationName = startingLocation?.name || "Millbrook Village Square";

  // Build context about the world for GPT
  const deceasedHeroesContext = recentDeceasedHeroes.length > 0
    ? `FALLEN HEROES (your character may have heard of them or have connections):
${recentDeceasedHeroes.map((hero) => `- ${hero.name || "Unknown Hero"}: ${hero.deathDescription}. Notable deeds: ${hero.majorDeeds.slice(0, 3).join("; ") || "none recorded"}. Died at ${worldState.locations[hero.deathLocationId]?.name || "unknown location"}.`).join("\n")}`
    : "No fallen heroes in this world yet - you are among the first adventurers.";

  const systemPrompt = `You are creating a new character for a fantasy medieval RPG after the previous character died.

The player wants to create a new character and has provided some hints about their background.

WORLD CONTEXT:
- Setting: High fantasy medieval world
- Starting location: ${startingLocationName} - a modest village at the edge of civilization
- The world persists - NPCs remember previous heroes who fell

${deceasedHeroesContext}

CHARACTER CREATION RULES:
1. Build upon the player's backstory hints to create a coherent character
2. Name should fit high fantasy medieval setting
3. Physical description should be vivid and distinctive for image generation
4. Origin should explain where they come from and hint at why they're in Millbrook
5. Hidden backstory should contain secrets that can be revealed through gameplay (lost memories, hidden powers, mysterious connections)
6. Starting narrative should be in chaotic trickster narrator voice, describing their arrival
7. If deceased heroes exist, consider creating a connection (relative seeking vengeance, someone who heard tales, etc.) - but only if it makes narrative sense
8. Keep it high fantasy - no modern or sci-fi elements

IMPORTANT:
- The hiddenBackstory should NOT be immediately obvious - it's meant to be revealed through flashbacks
- The character should feel fresh but connected to the persistent world
- The knownLore should be things the character would reasonably know from their background`;

  const userPrompt = `Create a new character based on the player's background hints:

"${backstoryInput || "A traveler seeking adventure"}"

Generate a complete character with name, appearance, origin, hidden backstory, and a dramatic arrival narrative in Millbrook.`;

  const response = await callGPT<GeneratedCharacterData>({
    systemPrompt,
    userPrompt,
    jsonSchema: NEW_CHARACTER_SCHEMA,
    maxTokens: 1500,
  });

  const characterData = response.content;

  // Get starting location knowledge (all village locations)
  const villageLocations = Object.values(worldState.locations)
    .filter((loc) => loc.terrain === "village" || loc.id === startingLocationId)
    .map((loc) => loc.id);

  // Find NPCs visible at starting location
  const visibleNpcs = startingLocation?.presentNpcIds
    .filter((npcId) => {
      const npc = worldState.npcs[npcId];
      return npc && npc.isAlive;
    }) || [];

  // Create the new player
  const newPlayer: Player = {
    name: characterData.name,
    physicalDescription: characterData.physicalDescription,
    hiddenBackstory: characterData.hiddenBackstory,
    revealedBackstory: [],
    origin: characterData.origin,
    currentLocationId: startingLocationId,
    homeLocationId: undefined,
    health: 100,
    maxHealth: 100,
    strength: 10,
    defense: 10,
    magic: 5,
    level: 1,
    experience: 0,
    gold: 25, // Small starting gold
    inventory: [],
    companionIds: [],
    knowledge: {
      locations: villageLocations,
      npcs: visibleNpcs,
      lore: [
        "Millbrook is a small village at the edge of the known world.",
        ...characterData.knownLore,
      ],
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

  // Prepare NPC updates - add knowledge about the new hero to NPCs who knew fallen heroes
  // This lets them potentially reference the connection
  const npcUpdates: Array<{ npcId: string; newKnowledge: string[] }> = [];

  if (characterData.connectionToFallenHeroes && characterData.connectionToFallenHeroes.length > 0) {
    for (const { npc, knewHeroNames } of npcsWhoKnewHeroes) {
      if (knewHeroNames.length > 0) {
        npcUpdates.push({
          npcId: npc.id,
          newKnowledge: [
            `A new traveler named ${characterData.name} has arrived. ${characterData.connectionToFallenHeroes}`,
          ],
        });
      }
    }
  }

  // Build the full narrative
  let narrative = characterData.startingNarrative;

  if (characterData.connectionToFallenHeroes && characterData.connectionToFallenHeroes.length > 0) {
    narrative += `\n\n${characterData.connectionToFallenHeroes}`;
  }

  return {
    player: newPlayer,
    narrative,
    npcUpdates,
  };
}

// JSON Schema for generated Item response from GPT
const GENERATED_ITEM_SCHEMA = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "The item's name (e.g., 'Moonfire Dagger', 'Potion of Minor Healing', 'Dusty Tome of Forgotten Lore')",
    },
    description: {
      type: "string",
      description: "A vivid description of the item's appearance and any notable qualities (2-3 sentences)",
    },
    type: {
      type: "string",
      enum: ["weapon", "armor", "potion", "food", "key", "misc", "material", "book", "magic"],
      description: "The category of item",
    },
    hasEffect: {
      type: "boolean",
      description: "Whether this item provides a stat effect when used/equipped",
    },
    effectStat: {
      type: "string",
      description: "If hasEffect is true, which stat is affected (health, strength, defense, magic)",
    },
    effectValue: {
      type: "number",
      description: "If hasEffect is true, the numerical effect value (positive for buffs, negative for debuffs)",
    },
    baseValue: {
      type: "number",
      description: "The base gold value of the item before any economic adjustments (typically 1-500 for common items, 500-2000 for rare items)",
    },
  },
  required: ["name", "description", "type", "hasEffect", "baseValue"],
  additionalProperties: false,
};

export interface GeneratedItemData {
  name: string;
  description: string;
  type: "weapon" | "armor" | "potion" | "food" | "key" | "misc" | "material" | "book" | "magic";
  hasEffect: boolean;
  effectStat?: string;
  effectValue?: number;
  baseValue: number;
}

/**
 * Generate a contextual item dynamically.
 *
 * Item value is scaled with slight inflation based on player wealth,
 * making the economy feel dynamic and responsive to player progression.
 *
 * @param worldState - The current world state
 * @param context - Description of why/where this item is needed (e.g., "a treasure found in a dragon's hoard", "a potion sold by a traveling merchant")
 * @param itemType - Optional specific item type to generate (weapon, armor, potion, etc.)
 * @returns A complete WorldItem object ready to be added to inventory or location
 */
export async function generateItem(
  worldState: WorldState,
  context: string,
  itemType?: string
): Promise<WorldItem> {
  const { player, locations } = worldState;
  const currentLocation = locations[player.currentLocationId];

  // Calculate wealth factor for value scaling
  // Slight inflation based on player wealth - items become slightly more valuable as player accumulates wealth
  // Formula: 1.0 + (playerWealth / 1000) * 0.1, capped at 1.5x multiplier
  const playerWealth = player.gold + player.inventory.reduce((sum, item) => sum + item.value, 0);
  const wealthFactor = Math.min(1.5, 1.0 + (playerWealth / 1000) * 0.1);

  // Determine item type hint for the prompt
  const typeHint = itemType
    ? `The item MUST be of type: ${itemType}`
    : "Choose an appropriate item type based on the context";

  // Build context about the situation
  const locationContext = currentLocation
    ? `Current location: ${currentLocation.name} (${currentLocation.terrain}, danger level ${currentLocation.dangerLevel}/10)`
    : "Unknown location";

  const recentEvents = worldState.eventHistory
    .slice(-3)
    .map((e) => e.description)
    .join(" ");

  const systemPrompt = `You are generating an item for a fantasy medieval RPG world.

CONTEXT FOR ITEM GENERATION: ${context}

${locationContext}

GUIDELINES:
1. Item names should be evocative and fit high fantasy (e.g., "Silvervine Tonic", "Rusted Patrol Sword", "Enchanted Quill of Scribing")
2. Descriptions should be vivid and hint at the item's purpose or history
3. ${typeHint}
4. Items should fit the context where they're found:
   - Taverns: food, drinks, mundane supplies
   - Dungeons: weapons, armor, magical items, keys
   - Forests: herbs, materials, animal products
   - Shops: varied goods at appropriate quality
   - Quest rewards: valuable or unique items
5. Base value should reflect the item's rarity and usefulness:
   - Common items: 1-50 gold
   - Uncommon items: 50-200 gold
   - Rare items: 200-500 gold
   - Very rare items: 500-2000 gold
6. Effects should be reasonable:
   - Potions typically heal 10-50 health or boost a stat temporarily
   - Weapons might add 1-10 to strength
   - Armor might add 1-8 to defense
   - Magical items might affect any stat

IMPORTANT:
- Keep high fantasy tone - no modern or sci-fi elements
- Make items feel authentic to the medieval fantasy setting
- If hasEffect is true, you MUST provide effectStat and effectValue
- Not every item needs an effect - mundane items (food, materials, misc) often have no effect`;

  const userPrompt = `Generate an item based on this context: "${context}"

Player wealth: ${playerWealth} gold (affects economy slightly)
Recent events: ${recentEvents || "Nothing notable recently"}

Create an item that feels natural for this situation. Return the item details as JSON.`;

  const response = await callGPT<GeneratedItemData>({
    systemPrompt,
    userPrompt,
    jsonSchema: GENERATED_ITEM_SCHEMA,
    maxTokens: 600,
  });

  const generatedData = response.content;

  // Generate a unique ID for the item
  const itemId = `item_${generatedData.name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")}_${Date.now().toString(36)}`;

  // Calculate final value with wealth inflation
  const adjustedValue = Math.round(generatedData.baseValue * wealthFactor);

  // Build the effect object if applicable
  const effect = generatedData.hasEffect && generatedData.effectStat && generatedData.effectValue !== undefined
    ? {
        stat: generatedData.effectStat,
        value: generatedData.effectValue,
      }
    : undefined;

  // Construct the complete WorldItem object
  const newItem: WorldItem = {
    id: itemId,
    name: generatedData.name,
    description: generatedData.description,
    type: generatedData.type,
    effect,
    value: adjustedValue,
    isCanonical: false, // Dynamically generated
  };

  return newItem;
}

// JSON Schema for travel encounter response from GPT
const TRAVEL_ENCOUNTER_SCHEMA = {
  type: "object",
  properties: {
    encounterType: {
      type: "string",
      enum: ["combat", "discovery", "npc_meeting", "environmental", "none"],
      description: "The type of encounter that occurred during travel",
    },
    narrative: {
      type: "string",
      description: "A dramatic narrative describing the journey and encounter (3-5 sentences in chaotic trickster narrator voice)",
    },
    encounterLocationDescription: {
      type: "string",
      description: "Brief description of where the encounter takes place (e.g., 'a bend in the forest road', 'an old bridge crossing')",
    },
    combatNpcDescription: {
      type: "string",
      description: "If encounterType is 'combat', a description of the hostile creature/NPC to generate (otherwise empty string)",
    },
    discoveryDescription: {
      type: "string",
      description: "If encounterType is 'discovery', what was discovered (item, location feature, secret path, etc.) (otherwise empty string)",
    },
    npcMeetingContext: {
      type: "string",
      description: "If encounterType is 'npc_meeting', context for generating a traveler NPC (otherwise empty string)",
    },
    environmentalHazard: {
      type: "string",
      description: "If encounterType is 'environmental', description of the hazard and its effect (otherwise empty string)",
    },
    damageAmount: {
      type: "number",
      description: "If the encounter causes damage to the player (environmental or minor combat), the amount (0 if none)",
    },
    itemFound: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        type: {
          type: "string",
          enum: ["weapon", "armor", "potion", "food", "key", "misc", "material", "book", "magic"],
        },
        value: { type: "number" },
      },
      required: ["name", "description", "type", "value"],
      additionalProperties: false,
      description: "If an item is found during travel/discovery, its details (null properties if none)",
    },
    continueToDestination: {
      type: "boolean",
      description: "Whether the player continues to their destination after the encounter (false if encounter blocks travel)",
    },
  },
  required: [
    "encounterType",
    "narrative",
    "encounterLocationDescription",
    "combatNpcDescription",
    "discoveryDescription",
    "npcMeetingContext",
    "environmentalHazard",
    "damageAmount",
    "continueToDestination",
  ],
  additionalProperties: false,
};

export interface TravelEncounterData {
  encounterType: "combat" | "discovery" | "npc_meeting" | "environmental" | "none";
  narrative: string;
  encounterLocationDescription: string;
  combatNpcDescription: string;
  discoveryDescription: string;
  npcMeetingContext: string;
  environmentalHazard: string;
  damageAmount: number;
  itemFound?: {
    name: string;
    description: string;
    type: "weapon" | "armor" | "potion" | "food" | "key" | "misc" | "material" | "book" | "magic";
    value: number;
  };
  continueToDestination: boolean;
}

export interface TravelResult {
  narrative: string;
  arrived: boolean;
  finalLocationId: string;
  encounter?: {
    type: "combat" | "discovery" | "npc_meeting" | "environmental";
    combatNpcId?: string; // If combat, the generated enemy NPC ID
    metNpcId?: string; // If NPC meeting, the generated NPC ID
    itemFound?: WorldItem; // If discovery with item
    damage?: number; // If environmental hazard
  };
  stateChanges: Array<{ type: string; data: Record<string, unknown> }>;
}

/**
 * Calculate the danger level of a route between two locations.
 * Examines terrain types that would be crossed and returns an average danger value.
 */
function calculateRouteDanger(
  worldState: WorldState,
  fromLocation: Location,
  toLocation: Location
): { averageDanger: number; terrainsCrossed: string[]; distance: number } {
  // Calculate Manhattan distance
  const dx = Math.abs(toLocation.coordinates.x - fromLocation.coordinates.x);
  const dy = Math.abs(toLocation.coordinates.y - fromLocation.coordinates.y);
  const distance = dx + dy;

  // Find locations along the approximate route
  const routeLocations: Location[] = [];
  const allLocations = Object.values(worldState.locations);

  // Get the bounding box of the route
  const minX = Math.min(fromLocation.coordinates.x, toLocation.coordinates.x);
  const maxX = Math.max(fromLocation.coordinates.x, toLocation.coordinates.x);
  const minY = Math.min(fromLocation.coordinates.y, toLocation.coordinates.y);
  const maxY = Math.max(fromLocation.coordinates.y, toLocation.coordinates.y);

  // Find all known locations within or near the route
  for (const loc of allLocations) {
    const inBounds =
      loc.coordinates.x >= minX - 1 &&
      loc.coordinates.x <= maxX + 1 &&
      loc.coordinates.y >= minY - 1 &&
      loc.coordinates.y <= maxY + 1;
    if (inBounds && loc.id !== fromLocation.id && loc.id !== toLocation.id) {
      routeLocations.push(loc);
    }
  }

  // Calculate average danger from route + endpoints
  const allRouteDangers = [
    fromLocation.dangerLevel,
    toLocation.dangerLevel,
    ...routeLocations.map((loc) => loc.dangerLevel),
  ];
  const averageDanger =
    allRouteDangers.reduce((sum, d) => sum + d, 0) / allRouteDangers.length;

  // Collect unique terrains
  const terrains = new Set([
    fromLocation.terrain,
    toLocation.terrain,
    ...routeLocations.map((loc) => loc.terrain),
  ]);

  return {
    averageDanger,
    terrainsCrossed: Array.from(terrains),
    distance,
  };
}

/**
 * Terrain danger modifiers - some terrains are more likely to have encounters.
 */
const TERRAIN_DANGER_MODIFIER: Record<string, number> = {
  village: -2, // Safer, less chance of encounters
  road: -1, // Relatively safe
  plains: 0, // Neutral
  forest: 1, // Some danger
  swamp: 2, // More dangerous
  mountain: 2, // More dangerous
  cave: 3, // Dangerous
  dungeon: 4, // Very dangerous
  desert: 2, // Harsh conditions
  water: 1, // Some danger
};

/**
 * Handle fast travel to a known location with potential encounters.
 *
 * Calculates route danger from terrain types crossed and rolls for encounters.
 * Encounters can be: combat, discovery, NPC meeting, or environmental hazard.
 *
 * @param worldState - The current world state
 * @param destinationId - ID of the destination location (must be in player knowledge)
 * @returns TravelResult with narrative, arrival status, and any encounter details
 */
export async function handleTravel(
  worldState: WorldState,
  destinationId: string
): Promise<TravelResult> {
  const { player, locations } = worldState;
  const fromLocation = locations[player.currentLocationId];
  const toLocation = locations[destinationId];

  if (!fromLocation) {
    throw new Error(`handleTravel: current location not found: ${player.currentLocationId}`);
  }

  if (!toLocation) {
    throw new Error(`handleTravel: destination not found: ${destinationId}`);
  }

  // If already at destination, return immediately
  if (fromLocation.id === toLocation.id) {
    return {
      narrative: "Ah, look around you - you're already here! Sometimes the journey is measured in steps, and yours today numbers precisely zero.",
      arrived: true,
      finalLocationId: destinationId,
      stateChanges: [],
    };
  }

  // Calculate route danger
  const routeInfo = calculateRouteDanger(worldState, fromLocation, toLocation);

  // Calculate encounter chance based on route danger and distance
  // Base chance: 10% per distance unit, modified by average danger
  // Higher danger = higher chance, capped at 90%
  const baseDangerChance = routeInfo.averageDanger / 10; // 0-1 based on 0-10 danger scale
  const distanceModifier = Math.min(routeInfo.distance * 0.05, 0.3); // Up to +30% for long distances

  // Apply terrain modifiers
  const terrainModifier = routeInfo.terrainsCrossed.reduce((sum, terrain) => {
    return sum + (TERRAIN_DANGER_MODIFIER[terrain] || 0) * 0.02;
  }, 0);

  const encounterChance = Math.min(0.9, Math.max(0.05,
    0.15 + baseDangerChance * 0.4 + distanceModifier + terrainModifier
  ));

  // Roll for encounter
  const encounterRoll = Math.random();
  const hasEncounter = encounterRoll < encounterChance;

  // If no encounter, simple travel
  if (!hasEncounter) {
    const simpleNarrative = await generateSimpleTravelNarrative(
      worldState,
      fromLocation,
      toLocation,
      routeInfo.terrainsCrossed
    );

    return {
      narrative: simpleNarrative,
      arrived: true,
      finalLocationId: destinationId,
      stateChanges: [
        { type: "move_player", data: { locationId: destinationId } },
      ],
    };
  }

  // Generate encounter
  const encounterData = await generateTravelEncounter(
    worldState,
    fromLocation,
    toLocation,
    routeInfo
  );

  // Build the result based on encounter type
  const result: TravelResult = {
    narrative: encounterData.narrative,
    arrived: encounterData.continueToDestination,
    finalLocationId: encounterData.continueToDestination ? destinationId : fromLocation.id,
    stateChanges: [],
  };

  // Handle different encounter types
  switch (encounterData.encounterType) {
    case "combat": {
      // Generate a hostile NPC for combat
      if (encounterData.combatNpcDescription) {
        const combatNpc = await generateNPC(
          worldState,
          `A hostile creature/bandit encountered during travel: ${encounterData.combatNpcDescription}`,
          fromLocation.id // Spawn at departure point since combat interrupts travel
        );
        // Make the NPC hostile
        combatNpc.attitude = -80;

        result.encounter = {
          type: "combat",
          combatNpcId: combatNpc.id,
        };
        result.stateChanges.push({
          type: "create_npc",
          data: { ...combatNpc },
        });
        // Don't move player - combat happens on the road
        result.arrived = false;
        result.finalLocationId = fromLocation.id;
      }
      break;
    }

    case "discovery": {
      // Handle discovery - might include an item
      result.encounter = { type: "discovery" };

      if (encounterData.itemFound && encounterData.itemFound.name) {
        const itemId = `item_found_${Date.now().toString(36)}`;
        const foundItem: WorldItem = {
          id: itemId,
          name: encounterData.itemFound.name,
          description: encounterData.itemFound.description,
          type: encounterData.itemFound.type,
          value: encounterData.itemFound.value,
          isCanonical: false,
        };
        result.encounter.itemFound = foundItem;
        result.stateChanges.push({
          type: "add_item",
          data: { item: foundItem },
        });
      }

      // Player continues to destination after discovery
      if (encounterData.continueToDestination) {
        result.stateChanges.push({
          type: "move_player",
          data: { locationId: destinationId },
        });
      }
      break;
    }

    case "npc_meeting": {
      // Generate a friendly/neutral traveler NPC
      if (encounterData.npcMeetingContext) {
        const travelerNpc = await generateNPC(
          worldState,
          `A traveler met on the road: ${encounterData.npcMeetingContext}`,
          toLocation.id // They're heading the same way or coming from there
        );

        result.encounter = {
          type: "npc_meeting",
          metNpcId: travelerNpc.id,
        };
        result.stateChanges.push({
          type: "create_npc",
          data: { ...travelerNpc },
        });
        // Add to player knowledge
        result.stateChanges.push({
          type: "add_knowledge",
          data: { type: "npc", value: travelerNpc.name },
        });
      }

      // Player continues to destination after meeting
      if (encounterData.continueToDestination) {
        result.stateChanges.push({
          type: "move_player",
          data: { locationId: destinationId },
        });
      }
      break;
    }

    case "environmental": {
      // Environmental hazard - might cause damage
      result.encounter = {
        type: "environmental",
        damage: encounterData.damageAmount,
      };

      if (encounterData.damageAmount > 0) {
        result.stateChanges.push({
          type: "player_damage",
          data: { amount: encounterData.damageAmount },
        });
      }

      // Player might or might not continue
      if (encounterData.continueToDestination) {
        result.stateChanges.push({
          type: "move_player",
          data: { locationId: destinationId },
        });
      }
      break;
    }

    case "none":
    default:
      // No encounter after all, just move
      result.stateChanges.push({
        type: "move_player",
        data: { locationId: destinationId },
      });
      break;
  }

  return result;
}

/**
 * Generate a simple travel narrative when no encounter occurs.
 */
async function generateSimpleTravelNarrative(
  worldState: WorldState,
  from: Location,
  to: Location,
  terrainsCrossed: string[]
): Promise<string> {
  const systemPrompt = `Generate a brief (2-3 sentences) travel narrative in chaotic trickster narrator voice.
The player is traveling safely from one location to another. Make it atmospheric but uneventful.
Keep high fantasy tone. Mention the terrain types crossed if relevant.`;

  const userPrompt = `The player travels from "${from.name}" (${from.terrain}) to "${to.name}" (${to.terrain}).
Terrains along the way: ${terrainsCrossed.join(", ")}.

Generate a brief, atmospheric narrative describing the uneventful journey.`;

  return await callGPTNarrative(userPrompt, systemPrompt);
}

/**
 * Generate a travel encounter based on route danger.
 */
async function generateTravelEncounter(
  worldState: WorldState,
  from: Location,
  to: Location,
  routeInfo: { averageDanger: number; terrainsCrossed: string[]; distance: number }
): Promise<TravelEncounterData> {
  // Determine likely encounter types based on terrain and danger
  const dangerLevel = routeInfo.averageDanger;
  const terrains = routeInfo.terrainsCrossed;

  // Build context for GPT
  const recentEvents = worldState.eventHistory
    .slice(-3)
    .map((e) => e.description)
    .join(" ");

  const systemPrompt = `You are generating a travel encounter for a fantasy medieval RPG.

The player is traveling between two locations and something happens along the way.
Choose an encounter type that fits the danger level and terrain:

ENCOUNTER TYPES:
- combat: Bandits, wild beasts, monsters ambush the player (use for danger level 4+)
- discovery: Player finds something interesting - a hidden item, secret path, old ruins (use for exploration)
- npc_meeting: Player meets a traveler, merchant, or wanderer on the road (good for social/story)
- environmental: Weather hazard, dangerous terrain, natural obstacle (storms, rockslides, quicksand)
- none: Nothing happens (only use if explicitly told)

GUIDELINES:
1. Combat encounters should match the terrain (wolves in forest, bandits on roads, etc.)
2. Discovery encounters are positive - finding useful items or interesting locations
3. NPC meetings create story opportunities - the traveler might have information or needs help
4. Environmental hazards should fit the terrain (no sandstorms in forest)
5. Higher danger level = more likely combat or serious environmental hazard
6. Lower danger level = more likely discovery or peaceful meeting
7. The narrative should be in chaotic trickster narrator voice, dramatic but fun
8. continueToDestination should be false for serious combat, true for everything else usually

DANGER CONTEXT:
- Average route danger: ${dangerLevel.toFixed(1)}/10
- Distance: ${routeInfo.distance} grid units
- Terrains: ${terrains.join(", ")}

${dangerLevel >= 6 ? "HIGH DANGER - Combat or serious hazard is appropriate" :
    dangerLevel >= 3 ? "MODERATE DANGER - Any encounter type works" :
    "LOW DANGER - Discovery or peaceful encounter preferred"}`;

  const userPrompt = `Generate an encounter for travel from "${from.name}" (${from.terrain}) to "${to.name}" (${to.terrain}).

Route details:
- Average danger: ${dangerLevel.toFixed(1)}/10
- Distance: ${routeInfo.distance} units
- Terrains crossed: ${terrains.join(", ")}

Recent events: ${recentEvents || "Nothing notable"}

Player stats:
- Health: ${worldState.player.health}/${worldState.player.maxHealth}
- Strength: ${worldState.player.strength}, Defense: ${worldState.player.defense}
- Level: ${worldState.player.level}

Generate an appropriate travel encounter. Make it dramatic and memorable!`;

  const response = await callGPT<TravelEncounterData>({
    systemPrompt,
    userPrompt,
    jsonSchema: TRAVEL_ENCOUNTER_SCHEMA,
    maxTokens: 1000,
  });

  return response.content;
}

export async function generateNPC(
  worldState: WorldState,
  context: string,
  locationId?: string
): Promise<NPC> {
  const targetLocationId = locationId || worldState.player.currentLocationId;
  const targetLocation = worldState.locations[targetLocationId];

  if (!targetLocation) {
    throw new Error(`generateNPC: target location not found: ${targetLocationId}`);
  }

  // Gather context about the location and nearby NPCs
  const presentNpcs = targetLocation.presentNpcIds
    .map((id) => worldState.npcs[id])
    .filter((npc): npc is NPC => npc !== undefined && npc.isAlive);

  // Get nearby locations for knowledge context
  const nearbyLocations = Object.values(worldState.locations).filter((loc) => {
    const dx = Math.abs(loc.coordinates.x - targetLocation.coordinates.x);
    const dy = Math.abs(loc.coordinates.y - targetLocation.coordinates.y);
    return dx <= 2 && dy <= 2;
  });

  // Get existing factions for potential membership
  const existingFactions = Object.values(worldState.factions).map(
    (f) => `${f.name} (${f.id})`
  );

  // Build context about the current situation
  const recentEvents = worldState.eventHistory
    .slice(-3)
    .map((e) => e.description)
    .join(" ");

  const systemPrompt = `You are generating a new NPC for a fantasy medieval RPG world.

CONTEXT FOR NPC GENERATION: ${context}

LOCATION CONTEXT:
- Location: ${targetLocation.name} (${targetLocation.terrain})
- Description: ${targetLocation.description}
- Danger Level: ${targetLocation.dangerLevel}/10
- Present NPCs: ${presentNpcs.length > 0 ? presentNpcs.map((n) => n.name).join(", ") : "None"}

NEARBY AREAS (for knowledge):
${nearbyLocations.map((loc) => `- ${loc.name} (${loc.terrain})`).join("\n")}

EXISTING FACTIONS (NPC can belong to if appropriate):
${existingFactions.length > 0 ? existingFactions.join(", ") : "No established factions yet"}

SOUL INSTRUCTION GUIDELINES:
The soulInstruction is the most important field - it should be a comprehensive paragraph (4-6 sentences) covering:
1. BACKGROUND: Where they come from, their history, how they ended up here
2. GOALS: What they want in life, short-term and long-term
3. PERSONALITY: Their temperament, quirks, fears, values
4. SPEECH: How they talk (formal, casual, accent, verbal tics, education level)
5. TRUST: How gullible/suspicious they are, what would make them trust or distrust someone

GUIDELINES:
- Create a unique, memorable character that fits the context
- Name should fit high fantasy medieval setting
- Physical description should be vivid and distinctive for image generation
- Knowledge should include nearby locations and relevant lore they'd know
- Stats should reflect their role (merchant = low stats, guard = higher stats, etc.)
- Attitude should make sense for their personality and the context
- Inventory should fit their role (merchant has wares, traveler has supplies, etc.)
- If they could give quests, include 1-3 potential quest hooks
- Keep high fantasy tone - no modern elements

IMPORTANT:
- The soulInstruction MUST be a single coherent paragraph, not bullet points
- Make the NPC feel like a real person with depth
- Their knowledge should be believable for who they are`;

  const userPrompt = `Generate an NPC for this context: "${context}"

The NPC will be placed at "${targetLocation.name}" (${targetLocation.terrain}).

Recent events nearby: ${recentEvents || "Nothing notable recently"}

Create a unique, believable character with a compelling soul instruction that will drive their behavior in conversations and interactions.

Return the NPC details as JSON.`;

  const response = await callGPT<GeneratedNPCData>({
    systemPrompt,
    userPrompt,
    jsonSchema: GENERATED_NPC_SCHEMA,
    maxTokens: 1500,
  });

  const generatedData = response.content;

  // Generate a unique ID for the NPC
  const npcId = `npc_${generatedData.name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")}_${Date.now().toString(36)}`;

  // Convert inventory items to WorldItem format with IDs
  const inventoryItems = generatedData.inventory.map((item, index) => ({
    id: `item_${npcId}_${index}`,
    name: item.name,
    description: item.description,
    type: item.type,
    value: item.value,
    isCanonical: false,
  }));

  // Construct the complete NPC object
  const newNPC: NPC = {
    id: npcId,
    name: generatedData.name,
    description: generatedData.description,
    physicalDescription: generatedData.physicalDescription,
    soulInstruction: generatedData.soulInstruction,
    currentLocationId: targetLocationId,
    homeLocationId: targetLocationId, // They live where they were generated
    knowledge: generatedData.knowledge,
    conversationHistory: [],
    attitude: Math.max(-100, Math.min(100, generatedData.attitude)), // Clamp to -100 to 100
    isCompanion: false,
    isAnimal: generatedData.isAnimal,
    inventory: inventoryItems,
    stats: {
      health: Math.max(1, generatedData.stats.health),
      maxHealth: Math.max(1, generatedData.stats.maxHealth),
      strength: Math.max(1, generatedData.stats.strength),
      defense: Math.max(1, generatedData.stats.defense),
    },
    isAlive: true,
    isCanonical: false, // Dynamically generated
    factionIds: generatedData.factionIds,
  };

  return newNPC;
}

// ========== CRAFTING SYSTEM ==========

// Interface for crafting result data from GPT
interface CraftingResultData {
  isFeasible: boolean;
  rejectionReason: string; // Empty if feasible
  narrativeRejection: string; // Playful narrator rejection if not feasible
  craftedItemName: string; // Empty if not feasible
  craftedItemDescription: string;
  craftedItemType: "weapon" | "armor" | "potion" | "food" | "key" | "misc" | "material" | "book" | "magic";
  craftedItemBaseValue: number;
  hasEffect: boolean;
  effectStat: string;
  effectValue: number;
  materialsUsed: string[]; // Item IDs that were consumed
  narrativeSuccess: string; // Dramatic crafting narrative if successful
  skillImprovement: string; // Description of any skill improvement from crafting
}

// JSON Schema for crafting resolution
const CRAFTING_RESULT_SCHEMA = {
  type: "object",
  properties: {
    isFeasible: {
      type: "boolean",
      description: "Whether the crafting is possible with the player's current inventory",
    },
    rejectionReason: {
      type: "string",
      description: "If not feasible, the logical reason why (e.g., 'missing iron ore'). Empty string if feasible.",
    },
    narrativeRejection: {
      type: "string",
      description: "If not feasible, a playful chaotic trickster narrator rejection (3-4 sentences). Empty string if feasible.",
    },
    craftedItemName: {
      type: "string",
      description: "The name of the crafted item. Empty string if not feasible.",
    },
    craftedItemDescription: {
      type: "string",
      description: "A vivid description of the crafted item. Empty string if not feasible.",
    },
    craftedItemType: {
      type: "string",
      enum: ["weapon", "armor", "potion", "food", "key", "misc", "material", "book", "magic"],
      description: "The type of crafted item. Defaults to 'misc' if not feasible.",
    },
    craftedItemBaseValue: {
      type: "number",
      description: "The base gold value of the crafted item. 0 if not feasible.",
    },
    hasEffect: {
      type: "boolean",
      description: "Whether the crafted item has a special effect",
    },
    effectStat: {
      type: "string",
      description: "If hasEffect is true, which stat the effect applies to (health, strength, defense, magic). Empty if no effect.",
    },
    effectValue: {
      type: "number",
      description: "If hasEffect is true, the magnitude of the effect. 0 if no effect.",
    },
    materialsUsed: {
      type: "array",
      items: { type: "string" },
      description: "Array of item IDs from the player's inventory that were consumed in crafting. Empty array if not feasible.",
    },
    narrativeSuccess: {
      type: "string",
      description: "If feasible, a dramatic narrative describing the crafting process (3-5 sentences in chaotic trickster narrator voice). Empty string if not feasible.",
    },
    skillImprovement: {
      type: "string",
      description: "A brief description of any crafting skill improvement gained (e.g., 'Your metalworking improves slightly'). Empty if none.",
    },
  },
  required: [
    "isFeasible",
    "rejectionReason",
    "narrativeRejection",
    "craftedItemName",
    "craftedItemDescription",
    "craftedItemType",
    "craftedItemBaseValue",
    "hasEffect",
    "effectStat",
    "effectValue",
    "materialsUsed",
    "narrativeSuccess",
    "skillImprovement",
  ],
  additionalProperties: false,
};

// Result returned from handleCrafting
export interface CraftingResult {
  success: boolean;
  narrative: string;
  craftedItem?: WorldItem;
  materialsConsumed: string[]; // Item IDs
  stateChanges: StateChange[];
  skillImprovement?: string;
}

/**
 * Handle a crafting attempt based on player description.
 * GPT judges if crafting is feasible given inventory, removes materials if successful,
 * and creates the crafted item. Returns playful rejection if not feasible.
 */
export async function handleCrafting(
  worldState: WorldState,
  description: string
): Promise<CraftingResult> {
  const { player, locations } = worldState;
  const currentLocation = locations[player.currentLocationId];

  // Build inventory context for GPT
  const inventoryContext = player.inventory
    .map((item) => `- ${item.name} (ID: ${item.id}, Type: ${item.type}): ${item.description}`)
    .join("\n");

  // Check for crafting-relevant skills
  const craftingSkills = Object.entries(player.knowledge.skills)
    .filter(([skill]) =>
      ["crafting", "smithing", "alchemy", "cooking", "leatherworking", "carpentry", "enchanting"].some(
        (s) => skill.toLowerCase().includes(s)
      )
    )
    .map(([skill, level]) => `${skill}: ${level}`)
    .join(", ");

  // Check known recipes
  const knownRecipes = player.knowledge.recipes.length > 0
    ? player.knowledge.recipes.join(", ")
    : "None";

  // Location context (some locations are better for crafting)
  const locationContext = currentLocation
    ? `Current location: ${currentLocation.name} (${currentLocation.terrain})`
    : "Unknown location";

  // Check for structures that might aid crafting
  const craftingStructures = currentLocation?.structures
    .filter((s) =>
      ["forge", "anvil", "workbench", "alchemy table", "kitchen", "campfire"].some((term) =>
        s.name.toLowerCase().includes(term) || s.description.toLowerCase().includes(term)
      )
    )
    .map((s) => s.name)
    .join(", ") || "None available";

  const systemPrompt = `You are evaluating a crafting attempt in a fantasy medieval RPG.

THE PLAYER WANTS TO CRAFT: "${description}"

PLAYER'S INVENTORY:
${inventoryContext || "Empty inventory"}

PLAYER'S CRAFTING SKILLS: ${craftingSkills || "No formal crafting training"}
KNOWN RECIPES: ${knownRecipes}
${locationContext}
CRAFTING FACILITIES: ${craftingStructures}

CRAFTING RULES:
1. Be GENEROUS but LOGICAL about what can be crafted:
   - If the player has reasonable materials, allow the craft
   - Materials don't need to be exact - leather scraps can make a pouch, bones can make tools
   - Common sense crafting should work (combining herbs, basic woodworking, etc.)

2. Things that CANNOT be crafted:
   - Items requiring materials clearly not in inventory
   - Magical items without magical components or enchanting skill
   - Complex mechanical devices without proper materials
   - Modern or sci-fi items (always reject these with humor)

3. REJECTION should be playful and helpful:
   - Use the chaotic trickster narrator voice
   - Suggest what materials might help
   - Be encouraging while explaining the limitation

4. SUCCESS should feel rewarding:
   - Describe the crafting process dramatically
   - Make the item feel earned and special
   - Consider skill level in item quality

5. MATERIAL CONSUMPTION:
   - Only consume materials that would logically be used
   - Don't consume more than necessary
   - Return the item IDs of consumed materials

6. ITEM VALUES should reflect:
   - Complexity of craft: simple items 5-50 gold, medium 50-200, complex 200+
   - Quality of materials used
   - Player's skill level (higher skill = better items)`;

  const userPrompt = `Evaluate whether the player can craft: "${description}"

Review their inventory and determine:
1. Is this feasible with available materials?
2. If yes, what materials are consumed and what is created?
3. If no, provide a playful rejection that hints at what's needed.

Consider:
- High fantasy only - no modern/sci-fi items
- Be generous with interpretation (a "knife" could be made from bone, metal scraps, obsidian, etc.)
- Account for player skill level
- Some crafts need specific locations/tools (smithing needs a forge)`;

  const response = await callGPT<CraftingResultData>({
    systemPrompt,
    userPrompt,
    jsonSchema: CRAFTING_RESULT_SCHEMA,
    maxTokens: 800,
  });

  const result = response.content;

  // Handle rejection case
  if (!result.isFeasible) {
    return {
      success: false,
      narrative: result.narrativeRejection,
      materialsConsumed: [],
      stateChanges: [],
    };
  }

  // Create the crafted item
  const itemId = `item_${result.craftedItemName.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")}_${Date.now().toString(36)}`;

  const effect = result.hasEffect && result.effectStat && result.effectValue
    ? { stat: result.effectStat, value: result.effectValue }
    : undefined;

  const craftedItem: WorldItem = {
    id: itemId,
    name: result.craftedItemName,
    description: result.craftedItemDescription,
    type: result.craftedItemType,
    effect,
    value: result.craftedItemBaseValue,
    isCanonical: false,
  };

  // Build state changes
  const stateChanges: StateChange[] = [];

  // Remove consumed materials
  for (const materialId of result.materialsUsed) {
    stateChanges.push({
      type: "remove_item",
      data: { itemId: materialId },
    });
  }

  // Add crafted item to player inventory
  stateChanges.push({
    type: "add_item",
    data: { item: craftedItem },
  });

  // Add skill improvement if applicable
  if (result.skillImprovement && result.skillImprovement.trim()) {
    stateChanges.push({
      type: "add_knowledge",
      data: {
        skill: "Crafting",
        skillLevel: result.skillImprovement,
      },
    });
  }

  return {
    success: true,
    narrative: result.narrativeSuccess,
    craftedItem,
    materialsConsumed: result.materialsUsed,
    stateChanges,
    skillImprovement: result.skillImprovement || undefined,
  };
}
