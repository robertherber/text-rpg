import React, { useState } from "react";

// Deceased hero data from the API
export interface DeceasedHeroDisplay {
  id: string;
  name?: string;
  physicalDescription: string;
  origin: string;
  diedAtAction: number;
  deathDescription: string;
  deathLocationId: string;
  majorDeeds: string[];
}

interface DeathScreenProps {
  deathNarrative: string;
  deceasedHero: DeceasedHeroDisplay;
  onCreateNewCharacter: () => void;
  onStartFreshWorld: () => void;
}

export default function DeathScreen({
  deathNarrative,
  deceasedHero,
  onCreateNewCharacter,
  onStartFreshWorld,
}: DeathScreenProps) {
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const handleCreateNewCharacter = () => {
    onCreateNewCharacter();
  };

  const handleFreshWorldClick = () => {
    setShowConfirmReset(true);
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      // Call API to reset world
      const response = await fetch("/api/world/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        onStartFreshWorld();
      } else {
        console.error("Failed to reset world");
        setIsResetting(false);
        setShowConfirmReset(false);
      }
    } catch (err) {
      console.error("Error resetting world:", err);
      setIsResetting(false);
      setShowConfirmReset(false);
    }
  };

  const handleCancelReset = () => {
    setShowConfirmReset(false);
  };

  return (
    <div className="death-screen">
      <div className="death-container">
        {/* Skull icon / death indicator */}
        <div className="death-icon">💀</div>

        {/* Death title */}
        <h1 className="death-title">Your Legend Ends</h1>

        {/* Death narrative with narrator flair */}
        <div className="death-narrative">
          <p>{deathNarrative}</p>
        </div>

        {/* Deceased hero summary */}
        <div className="hero-summary">
          <h2 className="summary-title">In Memoriam</h2>

          <div className="hero-card">
            {deceasedHero.name && (
              <h3 className="hero-card-name">{deceasedHero.name}</h3>
            )}

            <p className="hero-card-origin">{deceasedHero.origin}</p>

            <p className="hero-card-description">
              {deceasedHero.physicalDescription}
            </p>

            {deceasedHero.majorDeeds.length > 0 && (
              <div className="hero-card-deeds">
                <span className="deeds-heading">Notable Deeds:</span>
                <ul className="deeds-list">
                  {deceasedHero.majorDeeds.map((deed, index) => (
                    <li key={index}>{deed}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="hero-card-stats">
              <span className="stat-item">
                ⚔️ Actions taken: {deceasedHero.diedAtAction}
              </span>
            </div>
          </div>
        </div>

        {/* Narrator closing comment */}
        <div className="death-closing">
          <p className="closing-text">
            <em>
              "Ah, another tale cut short by the cruel whims of fate... or perhaps by an
              unfortunate decision involving a dragon and a pointed stick. No matter!
              The world continues to turn, and new heroes are always needed."
            </em>
          </p>
        </div>

        {/* Action buttons */}
        <div className="death-actions">
          <button
            className="death-button primary"
            onClick={handleCreateNewCharacter}
            disabled={isResetting}
          >
            Rise Again — Create New Character
          </button>

          <button
            className="death-button secondary"
            onClick={handleFreshWorldClick}
            disabled={isResetting}
          >
            Begin Anew — Fresh World
          </button>
        </div>

        {/* Confirmation dialog for fresh world */}
        {showConfirmReset && (
          <div className="reset-confirm-overlay">
            <div className="reset-confirm-dialog">
              <h3 className="confirm-title">⚠️ Start Fresh World?</h3>
              <p className="confirm-text">
                This will erase ALL progress: the entire world, all NPCs, all
                locations discovered, and every fallen hero's memory. The
                world will be reborn from scratch.
              </p>
              <p className="confirm-warning">
                This action cannot be undone!
              </p>
              <div className="confirm-buttons">
                <button
                  className="confirm-button cancel"
                  onClick={handleCancelReset}
                  disabled={isResetting}
                >
                  Keep My World
                </button>
                <button
                  className="confirm-button confirm"
                  onClick={handleConfirmReset}
                  disabled={isResetting}
                >
                  {isResetting ? (
                    <>
                      <span className="death-spinner"></span>
                      Resetting...
                    </>
                  ) : (
                    "Yes, Erase Everything"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Flavor text at bottom */}
        <p className="death-flavor">
          "Death is merely a transition. The world remembers, even if you do not."
        </p>
      </div>
    </div>
  );
}
