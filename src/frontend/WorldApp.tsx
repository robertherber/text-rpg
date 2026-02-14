import React, { useState, useEffect, useRef } from "react";
import "./worldStyles.css";
import StoryPanel, { type StoryMessage } from "./StoryPanel";
import ActionPanel, { type SuggestedAction } from "./ActionPanel";
import ImagePanel from "./ImagePanel";
import MapPanel from "./MapPanel";
import JournalPanel from "./JournalPanel";
import StatsPanel from "./StatsPanel";
import InventoryPanel, { type InventoryItem } from "./InventoryPanel";
import CharacterCreation, { type CharacterCreationResponse } from "./CharacterCreation";
import DeathScreen, { type DeceasedHeroDisplay } from "./DeathScreen";
import BackgroundMusic from "./BackgroundMusic";

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
  inventory: InventoryItem[];
}

// SuggestedAction type imported from ActionPanel

interface WorldStateResponse {
  currentLocation: WorldLocation;
  presentNpcs: NPC[];
  playerStats: PlayerStats;
  suggestedActions: SuggestedAction[];
}

// StoryMessage type imported from StoryPanel

// Suggested response type for conversation suggestions
interface SuggestedResponse {
  id: string;
  text: string;
  type: "contextual" | "generic";
}

// Conversation state type
interface ConversationState {
  npcId: string;
  npcName: string;
  suggestedResponses?: SuggestedResponse[];
}

// Death state type
interface DeathState {
  deathNarrative: string;
  deceasedHero: DeceasedHeroDisplay;
}

// Type for tracking the last action for retry functionality
type LastAction =
  | { type: "action"; action: SuggestedAction }
  | { type: "freeform"; text: string }
  | { type: "conversation"; message: string }
  | { type: "useItem"; itemId: string }
  | null;

export default function WorldApp() {
  const [worldState, setWorldState] = useState<WorldStateResponse | null>(null);
  const [storyMessages, setStoryMessages] = useState<StoryMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"story" | "map" | "journal">("story");
  const [conversationState, setConversationState] = useState<ConversationState | null>(null);
  const [needsCharacterCreation, setNeedsCharacterCreation] = useState(false);
  const [deathState, setDeathState] = useState<DeathState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<LastAction>(null);
  const messageIdRef = useRef(0);

  // Fetch initial world state
  useEffect(() => {
    fetchWorldState();
  }, []);

  const fetchWorldState = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/world/state");
      const data = (await response.json()) as WorldStateResponse & {
        needsCharacterCreation?: boolean;
        deceasedHero?: DeceasedHeroDisplay;
      };

      // Check if character creation is needed (no player name or API indicates it)
      if (data.needsCharacterCreation || !data.playerStats?.name) {
        // Check if we have a deceased hero - show death screen first
        if (data.deceasedHero) {
          setDeathState({
            deathNarrative: `Alas, ${data.deceasedHero.name || "our hero"} has fallen! ${data.deceasedHero.deathDescription}`,
            deceasedHero: data.deceasedHero,
          });
          setIsLoading(false);
          return;
        }

        // No deceased hero - just show character creation
        setNeedsCharacterCreation(true);
        setIsLoading(false);
        return;
      }

      setWorldState(data);

      // Add initial location description as first story message
      addStoryMessage(data.currentLocation.description, "narrative");

      setError(null);
    } catch (err) {
      setError("Failed to load world state");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle creating a new character from death screen (in persistent world)
  const handleCreateNewCharacterFromDeath = () => {
    setDeathState(null);
    setNeedsCharacterCreation(true);
  };

  // Handle starting fresh world from death screen
  const handleStartFreshWorld = () => {
    // Reset all local state and show character creation
    setDeathState(null);
    setStoryMessages([]);
    setWorldState(null);
    setNeedsCharacterCreation(true);
  };

  const handleCharacterCreated = (response: CharacterCreationResponse) => {
    // Build world state from character creation response
    const newWorldState: WorldStateResponse = {
      currentLocation: response.startingLocation ? {
        id: response.startingLocation.id,
        name: response.startingLocation.name,
        description: response.startingLocation.description,
        terrain: response.startingLocation.terrain,
        dangerLevel: 0,
        coordinates: response.startingLocation.coordinates,
        items: [],
        structures: [],
      } : {
        id: "unknown",
        name: "Unknown Location",
        description: "You find yourself somewhere...",
        terrain: "village",
        dangerLevel: 0,
        coordinates: { x: 0, y: 0 },
        items: [],
        structures: [],
      },
      presentNpcs: [],
      playerStats: {
        name: response.player.name,
        health: response.player.health,
        maxHealth: response.player.maxHealth,
        gold: response.player.gold,
        level: response.player.level,
        strength: response.player.strength,
        defense: response.player.defense,
        magic: response.player.magic,
        experience: 0,
        companionCount: 0,
        inventoryCount: response.player.inventory.length,
        inventory: response.player.inventory.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          type: item.type as InventoryItem["type"],
          value: item.value,
          effect: undefined,
        })),
      },
      suggestedActions: response.suggestedActions.map(action => ({
        ...action,
        targetNpcId: undefined,
        targetLocationId: undefined,
      })),
    };

    setWorldState(newWorldState);
    setNeedsCharacterCreation(false);

    // Add the starting narrative as the first story message
    addStoryMessage(response.narrative, "narrative");
  };

  const addStoryMessage = (text: string, type: StoryMessage["type"]) => {
    messageIdRef.current += 1;
    setStoryMessages((prev) => [
      ...prev,
      { id: messageIdRef.current, text, type },
    ]);
  };

  // Handle retrying the last failed action
  const handleRetry = async () => {
    if (!lastAction) return;

    // Clear the error state
    setActionError(null);

    // Retry based on the type of last action
    switch (lastAction.type) {
      case "action":
        await handleAction(lastAction.action);
        break;
      case "freeform":
        await handleFreeformSubmit(lastAction.text);
        break;
      case "conversation":
        await handleConversationMessage(lastAction.message);
        break;
      case "useItem":
        await handleUseItem(lastAction.itemId);
        break;
    }
  };

  const handleAction = async (action: SuggestedAction) => {
    if (isProcessing) return;

    // Check if this is a "talk" action - enter conversation mode
    if (action.type === "talk" && action.targetNpcId) {
      const targetNpc = worldState?.presentNpcs.find(npc => npc.id === action.targetNpcId);
      if (targetNpc) {
        setConversationState({
          npcId: targetNpc.id,
          npcName: targetNpc.name,
        });
        addStoryMessage(`> ${action.text}`, "action");
        addStoryMessage(`You approach ${targetNpc.name}. What would you like to say?`, "narrative");
        return;
      }
    }

    setIsProcessing(true);
    setActionError(null);
    setLastAction({ type: "action", action });
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
          setWorldState(newState);
        }
      }
      // Clear last action on success
      setLastAction(null);
    } catch (err) {
      setActionError("Something went wrong. Retry?");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFreeformSubmit = async (text: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    setActionError(null);
    setLastAction({ type: "freeform", text });
    addStoryMessage(`> ${text}`, "action");

    try {
      const response = await fetch("/api/world/freeform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = (await response.json()) as {
        error?: string;
        narrative?: string;
        knowledgeRejection?: boolean;
        unknownReferences?: string[];
      };

      if (data.error) {
        addStoryMessage(data.error, "system");
      } else if (data.knowledgeRejection && data.narrative) {
        // Knowledge rejection - playful narrator rejection
        addStoryMessage(data.narrative, "narrative");
      } else if (data.narrative) {
        addStoryMessage(data.narrative, "narrative");
      }

      // Update world state with new suggested actions
      if (worldState) {
        // Re-fetch world state to get updated location
        const stateResponse = await fetch("/api/world/state");
        const newState = (await stateResponse.json()) as WorldStateResponse;
        setWorldState(newState);
      }
      // Clear last action on success
      setLastAction(null);
    } catch (err) {
      setActionError("Something went wrong. Retry?");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConversationMessage = async (message: string) => {
    if (isProcessing || !conversationState) return;

    setIsProcessing(true);
    setActionError(null);
    setLastAction({ type: "conversation", message });
    addStoryMessage(`> "${message}"`, "action");

    try {
      const response = await fetch("/api/world/talk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          npcId: conversationState.npcId,
          message,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        narrative?: string;
        npcResponse?: string;
        npcName?: string;
        attitudeChange?: number;
        newAttitude?: number;
        suggestsEndConversation?: boolean;
        newKnowledge?: string[];
        suggestedResponses?: SuggestedResponse[];
      };

      if (data.error) {
        addStoryMessage(data.error, "system");
      } else {
        // Display the narrator framing if present
        if (data.narrative) {
          addStoryMessage(data.narrative, "narrative");
        }
        // Display the NPC's response
        if (data.npcResponse) {
          addStoryMessage(`${data.npcName || conversationState.npcName}: "${data.npcResponse}"`, "narrative");
        }
        // Show knowledge gained
        if (data.newKnowledge && data.newKnowledge.length > 0) {
          addStoryMessage(`[Learned: ${data.newKnowledge.join(", ")}]`, "system");
        }
        // Auto-end conversation if NPC suggests it
        if (data.suggestsEndConversation) {
          addStoryMessage(`${conversationState.npcName} seems to have nothing more to say.`, "narrative");
          setConversationState(null);
        } else {
          // Update conversation state with new suggested responses
          setConversationState(prev => prev ? {
            ...prev,
            suggestedResponses: data.suggestedResponses || [],
          } : null);
        }
      }

      // Re-fetch world state to keep it up to date
      const stateResponse = await fetch("/api/world/state");
      const newState = (await stateResponse.json()) as WorldStateResponse;
      setWorldState(newState);
      // Clear last action on success
      setLastAction(null);
    } catch (err) {
      setActionError("Something went wrong. Retry?");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEndConversation = () => {
    if (conversationState) {
      addStoryMessage(`You end your conversation with ${conversationState.npcName}.`, "narrative");
      setConversationState(null);
    }
  };

  const handleUseItem = async (itemId: string) => {
    if (isProcessing) return;

    // Find the item in inventory
    const item = worldState?.playerStats.inventory.find((i) => i.id === itemId);
    if (!item) return;

    setIsProcessing(true);
    setActionError(null);
    setLastAction({ type: "useItem", itemId });
    addStoryMessage(`> Use ${item.name}`, "action");

    try {
      const response = await fetch("/api/world/freeform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `use ${item.name} from my inventory` }),
      });

      const data = (await response.json()) as {
        error?: string;
        narrative?: string;
      };

      if (data.error) {
        addStoryMessage(data.error, "system");
      } else if (data.narrative) {
        addStoryMessage(data.narrative, "narrative");
      }

      // Re-fetch world state to get updated inventory
      const stateResponse = await fetch("/api/world/state");
      const newState = (await stateResponse.json()) as WorldStateResponse;
      setWorldState(newState);
      // Clear last action on success
      setLastAction(null);
    } catch (err) {
      setActionError("Something went wrong. Retry?");
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

  // Show death screen if player has died
  if (deathState) {
    return (
      <DeathScreen
        deathNarrative={deathState.deathNarrative}
        deceasedHero={deathState.deceasedHero}
        onCreateNewCharacter={handleCreateNewCharacterFromDeath}
        onStartFreshWorld={handleStartFreshWorld}
      />
    );
  }

  // Show character creation screen if needed
  if (needsCharacterCreation) {
    return <CharacterCreation onCharacterCreated={handleCharacterCreated} />;
  }

  if (!worldState) {
    return null;
  }

  return (
    <div className="world-container">
      {/* Background music */}
      <BackgroundMusic src="/audio/Emerald Sky Citadel.mp3" defaultVolume={0.3} />

      {/* Header with player stats */}
      <StatsPanel
        name={worldState.playerStats.name}
        health={worldState.playerStats.health}
        maxHealth={worldState.playerStats.maxHealth}
        gold={worldState.playerStats.gold}
        strength={worldState.playerStats.strength}
        defense={worldState.playerStats.defense}
        magic={worldState.playerStats.magic}
        level={worldState.playerStats.level}
        experience={worldState.playerStats.experience}
        companionCount={worldState.playerStats.companionCount}
      />

      {/* Main content area */}
      <main className="world-main">
        {/* Left column - Image panel */}
        <ImagePanel location={worldState.currentLocation} />

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
            <StoryPanel
              messages={storyMessages}
              actionError={actionError}
              onRetry={handleRetry}
              isLoading={isProcessing}
            />
          )}

          {/* Map panel */}
          {activePanel === "map" && (
            <MapPanel />
          )}

          {/* Journal panel */}
          {activePanel === "journal" && (
            <JournalPanel />
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

          {/* Suggested actions with free-form input */}
          <ActionPanel
            actions={worldState.suggestedActions}
            onActionSelect={handleAction}
            onFreeformSubmit={handleFreeformSubmit}
            isProcessing={isProcessing}
            conversationMode={conversationState}
            onConversationMessage={handleConversationMessage}
            onEndConversation={handleEndConversation}
          />

          {/* Inventory panel */}
          <InventoryPanel
            items={worldState.playerStats.inventory}
            onUseItem={handleUseItem}
            isProcessing={isProcessing}
          />
        </section>
      </main>
    </div>
  );
}
