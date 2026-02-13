import React, { useState, useEffect, useRef } from "react";
import type { GameState, Choice } from "../types";

import "./styles.css";

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [locationImage, setLocationImage] = useState<string>("");
  const [currentImageLocationId, setCurrentImageLocationId] = useState<string>("");
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const messageLogRef = useRef<HTMLDivElement>(null);

  // Start game
  const startGame = async () => {
    if (!playerName.trim()) return;

    const response = await fetch("/api/game/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: playerName.trim() }),
    });
    const data = await response.json();
    setGameState(data.state);
    setGameStarted(true);
    loadLocationImage(data.state.currentLocationId);
  };

  // Load location image (checks if we actually need a new image)
  const loadLocationImage = async (locationId: string) => {
    // First check what the actual image location is (resolving parents)
    try {
      const checkResponse = await fetch(`/api/game/image-location/${locationId}`);
      const checkData = await checkResponse.json();

      // Skip if we already have the right image loaded
      if (checkData.imageLocationId === currentImageLocationId && locationImage) {
        return;
      }

      setIsLoadingImage(true);
      const response = await fetch(`/api/game/image/${locationId}`);
      const data = await response.json();
      setLocationImage(data.imageUrl);
      setCurrentImageLocationId(data.imageLocationId);
    } catch (error) {
      console.error("Failed to load image:", error);
    }
    setIsLoadingImage(false);
  };

  // Handle choice selection
  const handleChoice = async (choice: Choice) => {
    if (isProcessing || !gameState) return;
    setIsProcessing(true);

    try {
      const response = await fetch("/api/game/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: gameState,
          choiceId: choice.id,
        }),
      });
      const data = await response.json();
      setGameState(data.state);

      // Load new image if location changed
      if (data.state.currentLocationId !== gameState.currentLocationId) {
        loadLocationImage(data.state.currentLocationId);
      }
    } catch (error) {
      console.error("Failed to process action:", error);
    }
    setIsProcessing(false);
  };

  // Handle combat actions
  const handleCombatAction = async (action: "attack" | "defend" | "flee" | "usePotion") => {
    if (isProcessing || !gameState) return;
    setIsProcessing(true);

    try {
      const response = await fetch("/api/game/combat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: gameState,
          action,
        }),
      });
      const data = await response.json();
      setGameState(data.state);

      // Load new image if combat ended and location changed
      if (!data.state.combatState && data.state.currentLocationId !== gameState.currentLocationId) {
        loadLocationImage(data.state.currentLocationId);
      }
    } catch (error) {
      console.error("Failed to process combat:", error);
    }
    setIsProcessing(false);
  };

  // Restart game
  const restartGame = () => {
    setGameState(null);
    setGameStarted(false);
    setPlayerName("");
    setLocationImage("");
  };

  // Scroll message log to bottom
  useEffect(() => {
    if (messageLogRef.current) {
      messageLogRef.current.scrollTop = messageLogRef.current.scrollHeight;
    }
  }, [gameState?.messageLog]);

  // Title screen
  if (!gameStarted) {
    return (
      <div className="title-screen">
        <div className="title-content">
          <h1 className="game-title">Dragon's Bane</h1>
          <p className="subtitle">A Fantasy Text Adventure</p>
          <div className="start-form">
            <input
              type="text"
              placeholder="Enter your name, hero..."
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startGame()}
              maxLength={20}
            />
            <button onClick={startGame} disabled={!playerName.trim()}>
              Begin Your Quest
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return <div className="loading">Loading...</div>;
  }

  const isGameOver = gameState.character.health <= 0;
  const currentLocation = gameState.currentLocationId;

  return (
    <div className="game-container">
      {/* Header with character stats */}
      <header className="game-header">
        <div className="character-name">{gameState.character.name}</div>
        <div className="stats-bar">
          <div className="stat">
            <span className="stat-icon">❤️</span>
            <div className="health-bar">
              <div
                className="health-fill"
                style={{
                  width: `${(gameState.character.health / gameState.character.maxHealth) * 100}%`,
                }}
              />
              <span className="health-text">
                {gameState.character.health}/{gameState.character.maxHealth}
              </span>
            </div>
          </div>
          <div className="stat">
            <span className="stat-icon">⚔️</span>
            <span>{gameState.character.strength}</span>
          </div>
          <div className="stat">
            <span className="stat-icon">🛡️</span>
            <span>{gameState.character.defense}</span>
          </div>
          <div className="stat">
            <span className="stat-icon">✨</span>
            <span>{gameState.character.magic}</span>
          </div>
          <div className="stat">
            <span className="stat-icon">💰</span>
            <span>{gameState.character.gold}</span>
          </div>
          <div className="stat">
            <span className="stat-icon">📊</span>
            <span>Lv.{gameState.character.level}</span>
          </div>
        </div>
      </header>

      <main className="game-main">
        {/* Image panel */}
        <div className="image-panel">
          {isLoadingImage ? (
            <div className="image-loading">
              <div className="spinner"></div>
              <p>Generating scene...</p>
            </div>
          ) : (
            <img src={locationImage} alt="Current location" className="location-image" />
          )}
        </div>

        {/* Story panel */}
        <div className="story-panel">
          <LocationDisplay state={gameState} />

          {/* Combat UI */}
          {gameState.combatState && (
            <CombatUI
              combatState={gameState.combatState}
              onAction={handleCombatAction}
              hasPotion={gameState.inventory.some((i) => i.type === "potion")}
              isProcessing={isProcessing}
            />
          )}

          {/* Choices */}
          {!gameState.combatState && !isGameOver && (
            <ChoicesPanel
              state={gameState}
              onChoice={handleChoice}
              isProcessing={isProcessing}
            />
          )}

          {/* Game Over */}
          {isGameOver && (
            <div className="game-over">
              <h2>Game Over</h2>
              <p>Your journey has come to an end...</p>
              <button onClick={restartGame}>Try Again</button>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="side-panel">
          {/* Inventory */}
          <div className="inventory-panel">
            <h3>Inventory</h3>
            {gameState.inventory.length === 0 ? (
              <p className="empty-inventory">Empty</p>
            ) : (
              <ul className="inventory-list">
                {gameState.inventory.map((item) => (
                  <li key={item.id} className={`item-${item.type}`}>
                    <span className="item-name">{item.name}</span>
                    <span className="item-type">{item.type}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Message Log */}
          <div className="message-log" ref={messageLogRef}>
            <h3>Event Log</h3>
            <div className="messages">
              {gameState.messageLog.slice(-10).map((msg, i) => (
                <p key={i} className="log-message">
                  {msg}
                </p>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Location display component
function LocationDisplay({ state }: { state: GameState }) {
  const [location, setLocation] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/game/location/${state.currentLocationId}`)
      .then((r) => r.json())
      .then((data) => setLocation(data.location));
  }, [state.currentLocationId]);

  if (!location) return null;

  return (
    <div className="location-display">
      <h2 className="location-name">{location.name}</h2>
      <p className="location-description">{location.description}</p>
    </div>
  );
}

// Combat UI component
function CombatUI({
  combatState,
  onAction,
  hasPotion,
  isProcessing,
}: {
  combatState: NonNullable<GameState["combatState"]>;
  onAction: (action: "attack" | "defend" | "flee" | "usePotion") => void;
  hasPotion: boolean;
  isProcessing: boolean;
}) {
  const healthPercent = (combatState.enemy.health / combatState.enemy.maxHealth) * 100;

  return (
    <div className="combat-ui">
      <div className="enemy-display">
        <h3 className="enemy-name">{combatState.enemy.name}</h3>
        <p className="enemy-description">{combatState.enemy.description}</p>
        <div className="enemy-health-bar">
          <div className="enemy-health-fill" style={{ width: `${healthPercent}%` }} />
          <span className="enemy-health-text">
            {combatState.enemy.health}/{combatState.enemy.maxHealth}
          </span>
        </div>
      </div>
      <div className="combat-actions">
        <button onClick={() => onAction("attack")} disabled={isProcessing}>
          ⚔️ Attack
        </button>
        <button onClick={() => onAction("defend")} disabled={isProcessing}>
          🛡️ Defend
        </button>
        <button onClick={() => onAction("usePotion")} disabled={isProcessing || !hasPotion}>
          🧪 Use Potion
        </button>
        <button onClick={() => onAction("flee")} disabled={isProcessing}>
          🏃 Flee
        </button>
      </div>
    </div>
  );
}

// Choices panel component
function ChoicesPanel({
  state,
  onChoice,
  isProcessing,
}: {
  state: GameState;
  onChoice: (choice: Choice) => void;
  isProcessing: boolean;
}) {
  const [choices, setChoices] = useState<(Choice & { available: boolean })[]>([]);

  useEffect(() => {
    fetch("/api/game/choices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    })
      .then((r) => r.json())
      .then((data) => setChoices(data.choices));
  }, [state.currentLocationId, state.inventory, state.character.gold]);

  return (
    <div className="choices-panel">
      {choices.map((choice) => (
        <button
          key={choice.id}
          onClick={() => onChoice(choice)}
          disabled={isProcessing || !choice.available}
          className={`choice-button ${!choice.available ? "unavailable" : ""}`}
        >
          {choice.text}
          {!choice.available && " 🔒"}
        </button>
      ))}
    </div>
  );
}
