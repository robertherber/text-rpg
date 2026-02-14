import React, { useRef, useEffect } from "react";

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
}

/**
 * StoryPanel - Displays narrative text from the game state in a scrollable panel.
 *
 * Features:
 * - Scrollable message history
 * - New messages appear at bottom
 * - Different styles for narrative, action, and system messages
 */
export default function StoryPanel({ messages }: StoryPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="story-panel" ref={panelRef}>
      {messages.map((msg) => (
        <div key={msg.id} className={`story-message ${msg.type}`}>
          {msg.text}
        </div>
      ))}
    </div>
  );
}
