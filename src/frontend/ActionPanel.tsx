import React from "react";

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
  isProcessing: boolean;
}

/**
 * ActionPanel - Renders suggested actions as clickable buttons.
 *
 * Features:
 * - Displays suggested actions from the game state
 * - Clicking a button triggers the onActionSelect callback
 * - Buttons are disabled while an action is being processed
 * - Action types determine button styling (move, talk, examine, etc.)
 */
export default function ActionPanel({
  actions,
  onActionSelect,
  isProcessing,
}: ActionPanelProps) {
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
    </div>
  );
}
