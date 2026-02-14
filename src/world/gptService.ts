// GPT Service for AI-generated content
import OpenAI from "openai";
import type { WorldState, ActionResult, SuggestedAction } from "./types";

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
