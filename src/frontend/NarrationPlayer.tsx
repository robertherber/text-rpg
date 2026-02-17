import React from "react";
import { useNarration } from "./NarrationContext";

/**
 * NarrationPlayer - UI component for audio narration controls.
 *
 * Displays a skip button when narration is playing, allowing users
 * to skip to the next item in the audio queue.
 *
 * The actual audio playback logic is handled by NarrationContext.
 * This component provides the visual UI and user interaction.
 */
export default function NarrationPlayer() {
  const { isPlaying, currentText, skipCurrent } = useNarration();

  // Don't render anything if no audio is playing
  if (!isPlaying) {
    return null;
  }

  return (
    <div className="narration-player">
      <div className="narration-indicator">
        <span className="narration-icon">🔊</span>
        <span className="narration-status">Speaking...</span>
      </div>
      <button
        className="narration-skip-button"
        onClick={skipCurrent}
        aria-label="Skip current narration"
      >
        Skip ⏭
      </button>
    </div>
  );
}
