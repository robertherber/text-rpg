// Shared TTS Types and Constants
// This file contains type definitions and constants that are used by both
// frontend and backend code. It should NOT have any server-side dependencies.

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
