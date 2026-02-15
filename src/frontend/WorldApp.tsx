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
import NarrationPlayer from "./NarrationPlayer";
import { useAutoNarration } from "./useAutoNarration";

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
  voice?: string; // TTS voice for NPC dialogue
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
  const [activePanel, setActivePanel] = useState<"story" | "map" | "journal" | "inventory">("story");
  const [conversationState, setConversationState] = useState<ConversationState | null>(null);
  const [needsCharacterCreation, setNeedsCharacterCreation] = useState(false);
  const [deathState, setDeathState] = useState<DeathState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<LastAction>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<number | null>(null);
  const messageIdRef = useRef(0);

  // Auto-narration hook - plays TTS for new narrative messages (narrator and NPC dialogue)
  useAutoNarration(storyMessages, streamingMessageId, worldState?.presentNpcs);

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
    return messageIdRef.current;
  };

  // Update an existing message by ID (used for streaming)
  const updateMessageText = (messageId: number, newText: string) => {
    setStoryMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, text: newText } : msg
      )
    );
  };

  // Append text to an existing message by ID (used for streaming)
  const appendToMessage = (messageId: number, textChunk: string) => {
    setStoryMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, text: msg.text + textChunk } : msg
      )
    );
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
      // Use streaming endpoint
      const response = await fetch("/api/world/freeform/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || "Request failed");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      // Create a streaming narrative message
      const narrativeId = addStoryMessage("", "narrative");
      setStreamingMessageId(narrativeId);

      // Process the SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events (each ends with \n\n)
        const events = buffer.split("\n\n");
        buffer = events.pop() || ""; // Keep incomplete event in buffer

        for (const event of events) {
          if (!event.trim() || !event.startsWith("data: ")) continue;

          const jsonStr = event.slice(6); // Remove "data: " prefix
          try {
            const data = JSON.parse(jsonStr) as {
              type: "narrative" | "complete" | "error";
              content?: string;
              error?: string;
              suggestedActions?: SuggestedAction[];
              knowledgeRejection?: boolean;
              unknownReferences?: string[];
            };

            if (data.type === "narrative" && data.content) {
              // Append narrative chunk to the streaming message
              appendToMessage(narrativeId, data.content);
            } else if (data.type === "complete") {
              // Stream complete - clear streaming state and refresh world state
              setStreamingMessageId(null);

              // Re-fetch world state to get updated location and actions
              const stateResponse = await fetch("/api/world/state");
              const newState = (await stateResponse.json()) as WorldStateResponse;
              setWorldState(newState);

              // Clear last action on success
              setLastAction(null);
            } else if (data.type === "error") {
              // Error during streaming
              setStreamingMessageId(null);
              updateMessageText(narrativeId, data.error || "An error occurred");
              setActionError("Something went wrong. Retry?");
            }
          } catch {
            // Ignore JSON parse errors for incomplete chunks
          }
        }
      }

      // Clear streaming state in case stream ended without "complete" event
      setStreamingMessageId(null);
    } catch (err) {
      setStreamingMessageId(null);
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
      // Use streaming endpoint
      const response = await fetch("/api/world/talk/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          npcId: conversationState.npcId,
          message,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || "Request failed");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      // Create a streaming narrative message
      const narrativeId = addStoryMessage("", "narrative");
      setStreamingMessageId(narrativeId);

      // Process the SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events (each ends with \n\n)
        const events = buffer.split("\n\n");
        buffer = events.pop() || ""; // Keep incomplete event in buffer

        for (const event of events) {
          if (!event.trim() || !event.startsWith("data: ")) continue;

          const jsonStr = event.slice(6); // Remove "data: " prefix
          try {
            const data = JSON.parse(jsonStr) as {
              type: "narrative" | "complete" | "error";
              content?: string;
              error?: string;
              npcResponse?: string;
              npcName?: string;
              attitudeChange?: number;
              newAttitude?: number;
              suggestsEndConversation?: boolean;
              newKnowledge?: string[];
              suggestedResponses?: SuggestedResponse[];
            };

            if (data.type === "narrative" && data.content) {
              // Append narrative chunk to the streaming message
              appendToMessage(narrativeId, data.content);
            } else if (data.type === "complete") {
              // Stream complete - clear streaming state
              setStreamingMessageId(null);

              // Display the NPC's response (from final structured data)
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

              // Re-fetch world state to keep it up to date
              const stateResponse = await fetch("/api/world/state");
              const newState = (await stateResponse.json()) as WorldStateResponse;
              setWorldState(newState);

              // Clear last action on success
              setLastAction(null);
            } else if (data.type === "error") {
              // Error during streaming
              setStreamingMessageId(null);
              updateMessageText(narrativeId, data.error || "An error occurred");
              setActionError("Something went wrong. Retry?");
            }
          } catch {
            // Ignore JSON parse errors for incomplete chunks
          }
        }
      }

      // Clear streaming state in case stream ended without "complete" event
      setStreamingMessageId(null);
    } catch (err) {
      setStreamingMessageId(null);
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

  const hasNpcs = worldState.presentNpcs.length > 0;

  return (
    <div className="world-container">
      {/* Background music */}
      <BackgroundMusic src="/audio/Emerald Sky Citadel.mp3" defaultVolume={0.3} />

      {/* Narration player - shows skip button when audio is playing */}
      <NarrationPlayer />

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
      <main className={`world-main ${hasNpcs ? '' : 'no-right-column'}`}>
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
            <button
              className={`tab ${activePanel === "inventory" ? "active" : ""}`}
              onClick={() => setActivePanel("inventory")}
            >
              Inventory
            </button>
          </div>

          {/* Story panel with actions below */}
          {activePanel === "story" && (
            <>
              <StoryPanel
                messages={storyMessages}
                actionError={actionError}
                onRetry={handleRetry}
                isLoading={isProcessing}
                streamingMessageId={streamingMessageId}
              />
              <ActionPanel
                actions={worldState.suggestedActions}
                onActionSelect={handleAction}
                onFreeformSubmit={handleFreeformSubmit}
                isProcessing={isProcessing}
                conversationMode={conversationState}
                onConversationMessage={handleConversationMessage}
                onEndConversation={handleEndConversation}
              />
            </>
          )}

          {/* Map panel */}
          {activePanel === "map" && (
            <MapPanel />
          )}

          {/* Journal panel */}
          {activePanel === "journal" && (
            <JournalPanel />
          )}

          {/* Inventory panel */}
          {activePanel === "inventory" && (
            <InventoryPanel
              items={worldState.playerStats.inventory}
              onUseItem={handleUseItem}
              isProcessing={isProcessing}
            />
          )}
        </section>

        {/* Right column - Present NPCs (hidden when no NPCs) */}
        {hasNpcs && (
          <section className="actions-panel">
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
          </section>
        )}
      </main>
    </div>
  );
}
