import React, { useState, useEffect, useRef } from "react";
import "./worldStyles.css";
import StoryPanel, { type StoryMessage } from "./StoryPanel";

// Types for world state data
interface WorldLocation {
  id: string;
  name: string;
  description: string;
  terrain: string;
  dangerLevel: number;
  coordinates: { x: number; y: number };
  items: any[];
  structures: any[];
}

interface NPC {
  id: string;
  name: string;
  description: string;
  physicalDescription: string;
  attitude: number;
  isCompanion: boolean;
  isAnimal: boolean;
}

interface PlayerStats {
  name: string;
  health: number;
  maxHealth: number;
  gold: number;
  level: number;
  strength: number;
  defense: number;
  magic: number;
  experience: number;
  companionCount: number;
  inventoryCount: number;
}

interface SuggestedAction {
  id: string;
  text: string;
  type: string;
  targetLocationId?: string;
  targetNpcId?: string;
}

interface WorldStateResponse {
  currentLocation: WorldLocation;
  presentNpcs: NPC[];
  playerStats: PlayerStats;
  suggestedActions: SuggestedAction[];
}

// StoryMessage type imported from StoryPanel

export default function WorldApp() {
  const [worldState, setWorldState] = useState<WorldStateResponse | null>(null);
  const [storyMessages, setStoryMessages] = useState<StoryMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"story" | "map" | "journal">("story");
  const [locationImage, setLocationImage] = useState<string>("");
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const messageIdRef = useRef(0);

  // Fetch initial world state
  useEffect(() => {
    fetchWorldState();
  }, []);

  const fetchWorldState = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/world/state");
      const data = (await response.json()) as WorldStateResponse;
      setWorldState(data);

      // Add initial location description as first story message
      addStoryMessage(data.currentLocation.description, "narrative");

      // Load location image
      loadLocationImage(data.currentLocation.id);

      setError(null);
    } catch (err) {
      setError("Failed to load world state");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLocationImage = async (locationId: string) => {
    try {
      setIsLoadingImage(true);
      const response = await fetch(`/api/game/image/${locationId}`);
      const data = (await response.json()) as { imageUrl?: string };
      if (data.imageUrl) {
        setLocationImage(data.imageUrl);
      }
    } catch (err) {
      console.error("Failed to load image:", err);
    } finally {
      setIsLoadingImage(false);
    }
  };

  const addStoryMessage = (text: string, type: StoryMessage["type"]) => {
    messageIdRef.current += 1;
    setStoryMessages((prev) => [
      ...prev,
      { id: messageIdRef.current, text, type },
    ]);
  };

  const handleAction = async (action: SuggestedAction) => {
    if (isProcessing) return;

    setIsProcessing(true);
    addStoryMessage(`> ${action.text}`, "action");

    try {
      const response = await fetch("/api/world/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: action.id }),
      });

      const data = (await response.json()) as { error?: string; narrative?: string };

      if (data.error) {
        addStoryMessage(data.error, "system");
      } else if (data.narrative) {
        addStoryMessage(data.narrative, "narrative");

        // Update world state with new suggested actions
        if (worldState) {
          // Re-fetch world state to get updated location
          const stateResponse = await fetch("/api/world/state");
          const newState = (await stateResponse.json()) as WorldStateResponse;

          // Check if location changed
          if (newState.currentLocation.id !== worldState.currentLocation.id) {
            loadLocationImage(newState.currentLocation.id);
          }

          setWorldState(newState);
        }
      }
    } catch (err) {
      addStoryMessage("Something went wrong...", "system");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="world-loading">
        <div className="loading-spinner"></div>
        <p>Loading world...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="world-error">
        <p>{error}</p>
        <button onClick={fetchWorldState}>Retry</button>
      </div>
    );
  }

  if (!worldState) {
    return null;
  }

  return (
    <div className="world-container">
      {/* Header with player stats */}
      <header className="world-header">
        <div className="player-name">{worldState.playerStats.name || "Unnamed Hero"}</div>
        <div className="player-stats">
          <div className="stat">
            <span className="stat-icon">❤️</span>
            <div className="health-bar">
              <div
                className="health-fill"
                style={{
                  width: `${(worldState.playerStats.health / worldState.playerStats.maxHealth) * 100}%`,
                }}
              />
              <span className="health-text">
                {worldState.playerStats.health}/{worldState.playerStats.maxHealth}
              </span>
            </div>
          </div>
          <div className="stat">
            <span className="stat-icon">⚔️</span>
            <span>{worldState.playerStats.strength}</span>
          </div>
          <div className="stat">
            <span className="stat-icon">🛡️</span>
            <span>{worldState.playerStats.defense}</span>
          </div>
          <div className="stat">
            <span className="stat-icon">✨</span>
            <span>{worldState.playerStats.magic}</span>
          </div>
          <div className="stat">
            <span className="stat-icon">💰</span>
            <span>{worldState.playerStats.gold}</span>
          </div>
          <div className="stat">
            <span className="stat-icon">📊</span>
            <span>Lv.{worldState.playerStats.level}</span>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className="world-main">
        {/* Left column - Image panel */}
        <section className="image-panel">
          {isLoadingImage ? (
            <div className="image-loading">
              <div className="loading-spinner"></div>
              <p>Generating scene...</p>
            </div>
          ) : locationImage ? (
            <img src={locationImage} alt={worldState.currentLocation.name} className="location-image" />
          ) : (
            <div className="image-placeholder">
              <span className="location-terrain">{worldState.currentLocation.terrain}</span>
            </div>
          )}
          <div className="location-info">
            <h2 className="location-name">{worldState.currentLocation.name}</h2>
            <span className="location-coords">
              ({worldState.currentLocation.coordinates.x}, {worldState.currentLocation.coordinates.y})
            </span>
          </div>
        </section>

        {/* Center column - Story/Map/Journal panels */}
        <section className="content-panel">
          {/* Panel tabs */}
          <div className="panel-tabs">
            <button
              className={`tab ${activePanel === "story" ? "active" : ""}`}
              onClick={() => setActivePanel("story")}
            >
              Story
            </button>
            <button
              className={`tab ${activePanel === "map" ? "active" : ""}`}
              onClick={() => setActivePanel("map")}
            >
              Map
            </button>
            <button
              className={`tab ${activePanel === "journal" ? "active" : ""}`}
              onClick={() => setActivePanel("journal")}
            >
              Journal
            </button>
          </div>

          {/* Story panel */}
          {activePanel === "story" && (
            <StoryPanel messages={storyMessages} />
          )}

          {/* Map panel placeholder */}
          {activePanel === "map" && (
            <div className="map-panel">
              <p className="placeholder-text">Map coming soon...</p>
            </div>
          )}

          {/* Journal panel placeholder */}
          {activePanel === "journal" && (
            <div className="journal-panel">
              <p className="placeholder-text">Journal coming soon...</p>
            </div>
          )}
        </section>

        {/* Right column - Actions and NPCs */}
        <section className="actions-panel">
          {/* Present NPCs */}
          {worldState.presentNpcs.length > 0 && (
            <div className="npcs-section">
              <h3>Present</h3>
              <ul className="npc-list">
                {worldState.presentNpcs.map((npc) => (
                  <li key={npc.id} className="npc-item">
                    <span className="npc-name">{npc.name}</span>
                    {npc.isCompanion && <span className="companion-badge">Companion</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggested actions */}
          <div className="actions-section">
            <h3>Actions</h3>
            <div className="action-buttons">
              {worldState.suggestedActions.map((action) => (
                <button
                  key={action.id}
                  className={`action-button ${action.type}`}
                  onClick={() => handleAction(action)}
                  disabled={isProcessing}
                >
                  {action.text}
                </button>
              ))}
            </div>
          </div>

          {/* Free-form input placeholder */}
          <div className="freeform-section">
            <input
              type="text"
              placeholder="Or type your own action..."
              className="freeform-input"
              disabled={isProcessing}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.currentTarget.value.trim()) {
                  // TODO: Implement free-form action handling
                  e.currentTarget.value = "";
                }
              }}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
