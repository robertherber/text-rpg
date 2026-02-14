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
