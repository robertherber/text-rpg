import React, { useState, useRef, useEffect } from "react";

/**
 * Suggested action type for action buttons
 */
export interface SuggestedAction {
  id: string;
  text: string;
  type: string;
  targetLocationId?: string;
  targetNpcId?: string;
}

/**
 * Props for the ActionPanel component
 */
interface ActionPanelProps {
  actions: SuggestedAction[];
  onActionSelect: (action: SuggestedAction) => void;
  onFreeformSubmit: (text: string) => void;
  isProcessing: boolean;
}

/**
 * ActionPanel - Renders suggested actions as clickable buttons and free-form text input.
 *
 * Features:
 * - Displays suggested actions from the game state
 * - Clicking a button triggers the onActionSelect callback
 * - Free-form text input allows typing custom actions
 * - Submit on Enter key or button click calls onFreeformSubmit
 * - Buttons and input are disabled while an action is being processed
 * - Action types determine button styling (move, talk, examine, etc.)
 */
export default function ActionPanel({
  actions,
  onActionSelect,
  onFreeformSubmit,
  isProcessing,
}: ActionPanelProps) {
  const [freeformText, setFreeformText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Clear input when processing finishes (action completed)
  useEffect(() => {
    if (!isProcessing && freeformText === "") {
      // Focus input after action completes for quick follow-up
      inputRef.current?.focus();
    }
  }, [isProcessing]);

  const handleFreeformSubmit = () => {
    const trimmedText = freeformText.trim();
    if (trimmedText && !isProcessing) {
      onFreeformSubmit(trimmedText);
      setFreeformText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleFreeformSubmit();
    }
  };

  return (
    <div className="actions-section">
      <h3>Actions</h3>
      <div className="action-buttons">
        {actions.map((action) => (
          <button
            key={action.id}
            className={`action-button ${action.type}`}
            onClick={() => onActionSelect(action)}
            disabled={isProcessing}
          >
            {action.text}
          </button>
        ))}
      </div>

      {/* Free-form text input */}
      <div className="freeform-section">
        <div className="freeform-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            placeholder="Or type your own action..."
            className="freeform-input"
            value={freeformText}
            onChange={(e) => setFreeformText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
          />
          <button
            className="freeform-submit"
            onClick={handleFreeformSubmit}
            disabled={isProcessing || !freeformText.trim()}
            title="Submit action"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
