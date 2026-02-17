import { useEffect, useRef } from "react";
import { useNarration } from "./NarrationContext";
import { parseNarrativeText } from "./StoryPanel";
import type { StoryMessage } from "./StoryPanel";
import { NARRATOR_VOICE, NARRATOR_INSTRUCTIONS, type TTSVoice } from "../shared/ttsTypes";

/**
 * NPC info for TTS voice lookup
 */
interface NPCVoiceInfo {
  name: string;
  voice?: string;
}

/**
 * Fallback voice for NPCs without an assigned voice
 */
const FALLBACK_NPC_VOICE: TTSVoice = "alloy";

/**
 * useAutoNarration - Automatically triggers TTS for new narrative messages.
 *
 * This hook watches the storyMessages array and triggers narration when:
 * - A new narrative message is added (not action or system messages)
 * - The message is not currently streaming (streamingMessageId is different)
 *
 * Handles both narrator prose (US-010) and NPC dialogue (US-011).
 * - Narrator prose uses NARRATOR_VOICE with NARRATOR_INSTRUCTIONS
 * - NPC dialogue uses the NPC's assigned voice from presentNpcs
 *
 * @param storyMessages - Array of story messages to watch
 * @param streamingMessageId - ID of message currently streaming, or null
 * @param presentNpcs - Array of NPCs present at current location (for voice lookup)
 */
export function useAutoNarration(
  storyMessages: StoryMessage[],
  streamingMessageId: number | null,
  presentNpcs: NPCVoiceInfo[] = []
): void {
  const { playNarration } = useNarration();

  // Track the last processed message ID to avoid re-playing
  const lastProcessedIdRef = useRef<number>(0);

  // Track message IDs that were streaming (to play them when complete)
  const pendingStreamingRef = useRef<Set<number>>(new Set());

  // Keep presentNpcs in a ref so we use the latest value in callbacks
  const presentNpcsRef = useRef<NPCVoiceInfo[]>(presentNpcs);
  presentNpcsRef.current = presentNpcs;

  useEffect(() => {
    // Process each new message
    for (const message of storyMessages) {
      // Skip if already processed
      if (message.id <= lastProcessedIdRef.current) {
        continue;
      }

      // Skip non-narrative messages (actions, system messages)
      if (message.type !== "narrative") {
        lastProcessedIdRef.current = Math.max(lastProcessedIdRef.current, message.id);
        continue;
      }

      // If this message is currently streaming, mark it as pending
      if (message.id === streamingMessageId) {
        pendingStreamingRef.current.add(message.id);
        continue;
      }

      // If this message was pending (finished streaming), play it now
      if (pendingStreamingRef.current.has(message.id)) {
        pendingStreamingRef.current.delete(message.id);
        playNarrativeSegments(message.text, playNarration, presentNpcsRef.current);
        lastProcessedIdRef.current = Math.max(lastProcessedIdRef.current, message.id);
        continue;
      }

      // New non-streaming narrative message - play it immediately
      playNarrativeSegments(message.text, playNarration, presentNpcsRef.current);
      lastProcessedIdRef.current = Math.max(lastProcessedIdRef.current, message.id);
    }
  }, [storyMessages, streamingMessageId, playNarration]);

  // Also check if a streaming message just completed
  useEffect(() => {
    if (streamingMessageId === null && pendingStreamingRef.current.size > 0) {
      // Streaming ended, play any pending messages
      for (const pendingId of pendingStreamingRef.current) {
        const message = storyMessages.find(m => m.id === pendingId);
        if (message && message.type === "narrative") {
          playNarrativeSegments(message.text, playNarration, presentNpcsRef.current);
          lastProcessedIdRef.current = Math.max(lastProcessedIdRef.current, pendingId);
        }
      }
      pendingStreamingRef.current.clear();
    }
  }, [streamingMessageId, storyMessages, playNarration]);
}

/**
 * Look up an NPC's voice by name from the present NPCs list.
 * Returns the NPC's assigned voice, or the fallback voice if not found.
 *
 * @param speakerName - The name of the NPC speaking
 * @param presentNpcs - Array of NPCs present at current location
 * @returns The TTS voice to use for this NPC
 */
function getNpcVoice(speakerName: string, presentNpcs: NPCVoiceInfo[]): TTSVoice {
  // Find NPC by name (case-insensitive partial match)
  const normalizedName = speakerName.toLowerCase().trim();
  const npc = presentNpcs.find(n =>
    n.name.toLowerCase().includes(normalizedName) ||
    normalizedName.includes(n.name.toLowerCase())
  );

  // Return NPC's voice if found and valid, otherwise fallback
  if (npc?.voice && isValidTTSVoice(npc.voice)) {
    return npc.voice as TTSVoice;
  }
  return FALLBACK_NPC_VOICE;
}

/**
 * Check if a string is a valid TTS voice
 */
function isValidTTSVoice(voice: string): voice is TTSVoice {
  const validVoices: TTSVoice[] = [
    "alloy", "ash", "ballad", "coral", "echo",
    "fable", "onyx", "nova", "sage", "shimmer", "verse"
  ];
  return validVoices.includes(voice as TTSVoice);
}

/**
 * Play all narrative segments (narrator and NPC dialogue) in order.
 * Parses the text and queues both narrator and dialog segments.
 *
 * @param text - The full narrative text
 * @param playNarration - Function to queue narration
 * @param presentNpcs - Array of NPCs present (for voice lookup)
 */
function playNarrativeSegments(
  text: string,
  playNarration: (text: string, voice: TTSVoice, instructions?: string) => void,
  presentNpcs: NPCVoiceInfo[]
): void {
  // Parse the text into segments
  const segments = parseNarrativeText(text);

  // Play all segments in order they appear
  for (const segment of segments) {
    const trimmedText = segment.text.trim();
    if (!trimmedText) continue;

    if (segment.type === "narrator") {
      // Narrator prose - use narrator voice with personality instructions
      playNarration(trimmedText, NARRATOR_VOICE, NARRATOR_INSTRUCTIONS);
    } else if (segment.type === "dialog") {
      // NPC dialogue - use NPC's assigned voice (no personality instructions)
      const npcVoice = segment.speakerName
        ? getNpcVoice(segment.speakerName, presentNpcs)
        : FALLBACK_NPC_VOICE;
      playNarration(trimmedText, npcVoice);
    }
    // Skip "speaker" segments (just the name prefix, not actual speech)
  }
}
