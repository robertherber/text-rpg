import React, { useRef, useEffect, useState } from "react";

/**
 * Story message type for narrative display
 */
export interface StoryMessage {
  id: number;
  text: string;
  type: "narrative" | "action" | "system";
}

/**
 * Props for the StoryPanel component
 */
interface StoryPanelProps {
  messages: StoryMessage[];
  actionError?: string | null;
  onRetry?: () => void;
  isLoading?: boolean;
  streamingMessageId?: number | null;
}

/**
 * Thematic loading messages that fit the game's narrator tone
 */
const LOADING_MESSAGES = [
  "The narrator ponders...",
  "Fate weaves its thread...",
  "The story unfolds...",
  "A moment of contemplation...",
  "The mists of fortune swirl...",
  "Destiny takes a breath...",
  "The quill hovers...",
  "Ancient forces stir...",
];

/**
 * Segment of parsed narrative text
 */
export interface TextSegment {
  type: "narrator" | "dialog" | "speaker";
  text: string;
  speakerName?: string; // For dialog segments, the NPC name
}

/**
 * Parse narrative text into segments of narrator description and NPC dialog.
 * NPC dialog is identified by quoted text ("...") and speaker prefixes (Name: "...")
 */
export function parseNarrativeText(text: string): TextSegment[] {
  const segments: TextSegment[] = [];

  // Pattern matches: optional speaker name followed by colon, then quoted text
  // Also matches standalone quoted text
  const dialogPattern = /([A-Z][a-zA-Z\s]*?):\s*"([^"]+)"|"([^"]+)"/g;

  let lastIndex = 0;
  let match;

  while ((match = dialogPattern.exec(text)) !== null) {
    // Add narrator text before this match
    if (match.index > lastIndex) {
      const narratorText = text.slice(lastIndex, match.index).trim();
      if (narratorText) {
        segments.push({ type: "narrator", text: narratorText });
      }
    }

    // Check if we have a speaker (Name: "dialog") or just quoted text ("dialog")
    if (match[1] && match[2]) {
      // Speaker with dialog: Name: "dialog"
      const speakerName = match[1].trim();
      segments.push({ type: "speaker", text: speakerName + ":" });
      segments.push({ type: "dialog", text: ` "${match[2]}"`, speakerName });
    } else if (match[3]) {
      // Just quoted dialog (unknown speaker)
      segments.push({ type: "dialog", text: `"${match[3]}"` });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining narrator text
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex).trim();
    if (remainingText) {
      segments.push({ type: "narrator", text: remainingText });
    }
  }

  // If no segments found, treat entire text as narrator
  if (segments.length === 0) {
    segments.push({ type: "narrator", text });
  }

  return segments;
}

/**
 * Get a random loading message from the thematic variations
 */
function getRandomLoadingMessage(): string {
  const index = Math.floor(Math.random() * LOADING_MESSAGES.length);
  return LOADING_MESSAGES[index] ?? LOADING_MESSAGES[0]!;
}

/**
 * Loading indicator component with thematic pulsing text
 */
function LoadingIndicator() {
  const [message] = useState(() => getRandomLoadingMessage());

  return (
    <div className="loading-indicator">
      <span className="loading-text">{message}</span>
    </div>
  );
}

/**
 * Render narrative text with distinct styling for narrator vs NPC dialog
 */
function NarrativeText({ text }: { text: string }) {
  const segments = parseNarrativeText(text);

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === "narrator") {
          return (
            <span key={index} className="narrator-text">
              {segment.text}{" "}
            </span>
          );
        } else if (segment.type === "speaker") {
          return (
            <span key={index} className="dialog-speaker">
              {segment.text}
            </span>
          );
        } else {
          return (
            <span key={index} className="dialog-text">
              {segment.text}{" "}
            </span>
          );
        }
      })}
    </>
  );
}

/**
 * StoryPanel - Displays narrative text from the game state in a scrollable panel.
 *
 * Features:
 * - Scrollable message history
 * - New messages appear at bottom
 * - Different styles for narrative, action, and system messages
 * - Narrator text styled in italic gray, NPC dialog in normal weight
 * - Error state with retry button
 */
export default function StoryPanel({ messages, actionError, onRetry, isLoading, streamingMessageId }: StoryPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive, error appears, loading state changes, or streaming updates
  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight;
    }
  }, [messages, actionError, isLoading, streamingMessageId]);

  return (
    <div className="story-panel" ref={panelRef}>
      {messages.map((msg) => (
        <div key={msg.id} className={`story-message ${msg.type}${msg.id === streamingMessageId ? " streaming" : ""}`}>
          {msg.type === "narrative" ? (
            <>
              <NarrativeText text={msg.text} />
              {msg.id === streamingMessageId && <span className="streaming-cursor">▍</span>}
            </>
          ) : (
            msg.text
          )}
        </div>
      ))}
      {isLoading && !streamingMessageId && <LoadingIndicator />}
      {actionError && (
        <div className="story-message error">
          <span className="error-text">{actionError}</span>
          {onRetry && (
            <button className="error-retry-button" onClick={onRetry}>
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
