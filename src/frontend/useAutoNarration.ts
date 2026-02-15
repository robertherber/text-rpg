import { useEffect, useRef } from "react";
import { useNarration } from "./NarrationContext";
import { parseNarrativeText } from "./StoryPanel";
import type { StoryMessage } from "./StoryPanel";
import { NARRATOR_VOICE, NARRATOR_INSTRUCTIONS, type TTSVoice } from "../world/ttsService";

/**
 * useAutoNarration - Automatically triggers TTS for new narrative messages.
 *
 * This hook watches the storyMessages array and triggers narration when:
 * - A new narrative message is added (not action or system messages)
 * - The message is not currently streaming (streamingMessageId is different)
 *
 * For US-010, this only handles narrator prose. NPC dialogue handling (US-011)
 * will extend this to parse dialogue and use NPC voices.
 *
 * @param storyMessages - Array of story messages to watch
 * @param streamingMessageId - ID of message currently streaming, or null
 */
export function useAutoNarration(
  storyMessages: StoryMessage[],
  streamingMessageId: number | null
): void {
  const { playNarration } = useNarration();

  // Track the last processed message ID to avoid re-playing
  const lastProcessedIdRef = useRef<number>(0);

  // Track message IDs that were streaming (to play them when complete)
  const pendingStreamingRef = useRef<Set<number>>(new Set());

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
        playNarratorProse(message.text, playNarration);
        lastProcessedIdRef.current = Math.max(lastProcessedIdRef.current, message.id);
        continue;
      }

      // New non-streaming narrative message - play it immediately
      playNarratorProse(message.text, playNarration);
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
          playNarratorProse(message.text, playNarration);
          lastProcessedIdRef.current = Math.max(lastProcessedIdRef.current, pendingId);
        }
      }
      pendingStreamingRef.current.clear();
    }
  }, [streamingMessageId, storyMessages, playNarration]);
}

/**
 * Play narrator prose segments from narrative text.
 * Parses the text and queues only narrator segments (not dialogue).
 *
 * @param text - The full narrative text
 * @param playNarration - Function to queue narration
 */
function playNarratorProse(
  text: string,
  playNarration: (text: string, voice: TTSVoice, instructions?: string) => void
): void {
  // Parse the text into segments
  const segments = parseNarrativeText(text);

  // Play only narrator segments (dialog is handled by US-011)
  for (const segment of segments) {
    if (segment.type === "narrator" && segment.text.trim()) {
      playNarration(segment.text.trim(), NARRATOR_VOICE, NARRATOR_INSTRUCTIONS);
    }
  }
}
