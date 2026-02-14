// GPT Service for AI-generated content
import OpenAI from "openai";
import type { WorldState, ActionResult, SuggestedAction, Location, NPC } from "./types";

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
