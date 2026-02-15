// Text-to-Speech Service for AI-generated narration
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// TTS Model configuration
const TTS_MODEL = "gpt-4o-mini-tts";

// Available voices for TTS
export type TTSVoice =
  | "alloy"
  | "ash"
  | "ballad"
  | "coral"
  | "echo"
  | "fable"
  | "onyx"
  | "nova"
  | "sage"
  | "shimmer"
  | "verse";

// Narrator configuration
export const NARRATOR_VOICE: TTSVoice = "fable";
export const NARRATOR_INSTRUCTIONS = "Speak with playful, mischievous energy. You are a chaotic trickster narrator - witty, theatrical, occasionally breaking the fourth wall. Vary your pacing for dramatic effect.";

// Voice pool for NPCs (excludes fable which is reserved for narrator)
export const NPC_VOICE_POOL: TTSVoice[] = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "onyx",
  "nova",
  "sage",
  "shimmer",
  "verse",
];

/**
 * Assigns a random voice from the NPC voice pool.
 * Used when an NPC speaks for the first time and doesn't have a voice yet.
 *
 * @returns A random TTSVoice from the NPC voice pool
 */
export function assignNpcVoice(): TTSVoice {
  const randomIndex = Math.floor(Math.random() * NPC_VOICE_POOL.length);
  // NPC_VOICE_POOL is guaranteed to have elements, so this is safe
  return NPC_VOICE_POOL[randomIndex] as TTSVoice;
}

/**
 * Generate speech audio from text using OpenAI's TTS API
 *
 * @param text - The text to convert to speech (max 4096 characters)
 * @param voice - The voice to use for generation
 * @param instructions - Optional personality/style instructions (only works with gpt-4o-mini-tts)
 * @returns ArrayBuffer containing MP3 audio data, or null on failure
 */
export async function generateSpeech(
  text: string,
  voice: TTSVoice,
  instructions?: string
): Promise<ArrayBuffer | null> {
  try {
    // Validate text length (API limit is 4096 characters)
    if (text.length > 4096) {
      console.error(`TTS error: Text exceeds maximum length of 4096 characters (got ${text.length})`);
      return null;
    }

    // Skip empty text
    if (!text.trim()) {
      console.warn("TTS warning: Empty text provided, skipping generation");
      return null;
    }

    const response = await openai.audio.speech.create({
      model: TTS_MODEL,
      voice,
      input: text,
      response_format: "mp3",
      ...(instructions && { instructions }),
    });

    // Get the audio data as ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();

    return arrayBuffer;
  } catch (error) {
    console.error("TTS error: Failed to generate speech", error);
    return null;
  }
}
