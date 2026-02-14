import React, { useState, useRef, useEffect } from "react";

// Response type from /api/world/create-character
export interface CharacterCreationResponse {
  player: {
    name: string;
    physicalDescription: string;
    origin: string;
    health: number;
    maxHealth: number;
    strength: number;
    defense: number;
    magic: number;
    gold: number;
    level: number;
    inventory: Array<{
      id: string;
      name: string;
      description: string;
      type: string;
      value: number;
    }>;
  };
  narrative: string;
  startingLocation: {
    id: string;
    name: string;
    description: string;
    terrain: string;
    coordinates: { x: number; y: number };
  } | null;
  suggestedActions: Array<{
    id: string;
    text: string;
    type: string;
  }>;
}

interface CharacterCreationProps {
  onCharacterCreated: (response: CharacterCreationResponse) => void;
}

export default function CharacterCreation({ onCharacterCreated }: CharacterCreationProps) {
  const [name, setName] = useState("");
  const [backstoryHints, setBackstoryHints] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus name input on mount
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();

    // Validate name
    if (trimmedName.length < 2) {
      setError("Your name must be at least 2 characters long.");
      return;
    }

    if (trimmedName.length > 50) {
      setError("Your name must be no more than 50 characters.");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/world/create-character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          backstoryHints: backstoryHints.trim(),
        }),
      });

      const data = await response.json() as CharacterCreationResponse & { error?: string };

      if (!response.ok || data.error) {
        setError(data.error || "Failed to create character. Please try again.");
        setIsCreating(false);
        return;
      }

      // Successfully created - transition to game
      onCharacterCreated(data);
    } catch (err) {
      console.error("Character creation error:", err);
      setError("Something went wrong. Please try again.");
      setIsCreating(false);
    }
  };

  return (
    <div className="character-creation">
      <div className="creation-container">
        <h1 className="creation-title">Dragon's Bane</h1>
        <p className="creation-subtitle">Begin Your Legend</p>

        <form onSubmit={handleSubmit} className="creation-form">
          {/* Character Name Input */}
          <div className="form-group">
            <label htmlFor="character-name" className="form-label">
              What is your name, traveler?
            </label>
            <input
              ref={nameInputRef}
              id="character-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="form-input"
              disabled={isCreating}
              maxLength={50}
              autoComplete="off"
            />
          </div>

          {/* Backstory Hints Textarea */}
          <div className="form-group">
            <label htmlFor="backstory-hints" className="form-label">
              Tell us about yourself...
            </label>
            <p className="form-hint">
              Share hints about your character's background, personality, or destiny.
              The fates will weave your story from these threads. (Optional)
            </p>
            <textarea
              id="backstory-hints"
              value={backstoryHints}
              onChange={(e) => setBackstoryHints(e.target.value)}
              placeholder="Perhaps you were once a blacksmith's apprentice... or a noble in exile... or simply a wanderer seeking purpose..."
              className="form-textarea"
              disabled={isCreating}
              rows={4}
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="creation-error">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="creation-submit"
            disabled={isCreating || name.trim().length < 2}
          >
            {isCreating ? (
              <>
                <span className="creation-spinner"></span>
                The fates are weaving your destiny...
              </>
            ) : (
              "Begin Your Journey"
            )}
          </button>
        </form>

        <p className="creation-flavor">
          In the realm of high fantasy, anything is possible.
          Your choices will shape the world, and the world will remember.
        </p>
      </div>
    </div>
  );
}
