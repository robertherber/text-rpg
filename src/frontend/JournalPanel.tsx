import React, { useState, useEffect } from "react";

/**
 * Types for journal data from the API
 */
interface ActiveQuest {
  id: string;
  title: string;
  description: string;
  giverNpcId: string | null;
  objectives: string[];
  completedObjectives: string[];
}

interface CompletedQuest {
  id: string;
  title: string;
  description: string;
  giverNpcId: string | null;
  rewards?: string;
}

interface FailedQuest {
  id: string;
  title: string;
  description: string;
  status: string;
}

interface DeceasedHero {
  id: string;
  name: string;
  origin: string;
  deathDescription: string;
  deathLocationId: string;
  majorDeeds: string[];
  diedAtAction: number;
}

interface JournalData {
  activeQuests: ActiveQuest[];
  completedQuests: CompletedQuest[];
  failedQuests: FailedQuest[];
  knownLore: string[];
  deceasedHeroes: DeceasedHero[];
}

/**
 * JournalPanel - Displays player quests, lore, and deceased heroes.
 *
 * Features:
 * - Active quests with objective checklists
 * - Completed and failed quests
 * - Known lore entries
 * - Deceased heroes memorial
 */
export default function JournalPanel() {
  const [journalData, setJournalData] = useState<JournalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"quests" | "lore" | "heroes">("quests");

  // Fetch journal data on mount
  useEffect(() => {
    fetchJournalData();
  }, []);

  const fetchJournalData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/world/journal");
      const data = (await response.json()) as JournalData;
      setJournalData(data);
      setError(null);
    } catch (err) {
      setError("Failed to load journal");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="journal-panel journal-loading">
        <div className="loading-spinner"></div>
        <p>Loading journal...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="journal-panel journal-error">
        <p>{error}</p>
        <button onClick={fetchJournalData}>Retry</button>
      </div>
    );
  }

  if (!journalData) {
    return null;
  }

  const { activeQuests, completedQuests, failedQuests, knownLore, deceasedHeroes } = journalData;
  const hasQuests = activeQuests.length > 0 || completedQuests.length > 0 || failedQuests.length > 0;
  const hasLore = knownLore.length > 0;
  const hasHeroes = deceasedHeroes.length > 0;

  return (
    <div className="journal-panel journal-content">
      {/* Journal tabs */}
      <div className="journal-tabs">
        <button
          className={`journal-tab ${activeTab === "quests" ? "active" : ""}`}
          onClick={() => setActiveTab("quests")}
        >
          Quests {activeQuests.length > 0 && <span className="quest-count">{activeQuests.length}</span>}
        </button>
        <button
          className={`journal-tab ${activeTab === "lore" ? "active" : ""}`}
          onClick={() => setActiveTab("lore")}
        >
          Lore
        </button>
        <button
          className={`journal-tab ${activeTab === "heroes" ? "active" : ""}`}
          onClick={() => setActiveTab("heroes")}
        >
          Fallen Heroes
        </button>
      </div>

      {/* Quests tab */}
      {activeTab === "quests" && (
        <div className="journal-section">
          {!hasQuests ? (
            <p className="journal-empty">No quests yet. Talk to the villagers to find adventure...</p>
          ) : (
            <>
              {/* Active quests */}
              {activeQuests.length > 0 && (
                <div className="quest-category">
                  <h4 className="category-title">Active Quests</h4>
                  {activeQuests.map((quest) => (
                    <div key={quest.id} className="quest-item active-quest">
                      <h5 className="quest-title">{quest.title}</h5>
                      <p className="quest-description">{quest.description}</p>
                      {quest.objectives.length > 0 && (
                        <ul className="quest-objectives">
                          {quest.objectives.map((objective, idx) => (
                            <li
                              key={idx}
                              className={`quest-objective ${
                                quest.completedObjectives.includes(objective) ? "completed" : ""
                              }`}
                            >
                              <span className="objective-marker">
                                {quest.completedObjectives.includes(objective) ? "✓" : "○"}
                              </span>
                              {objective}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Completed quests */}
              {completedQuests.length > 0 && (
                <div className="quest-category">
                  <h4 className="category-title">Completed</h4>
                  {completedQuests.map((quest) => (
                    <div key={quest.id} className="quest-item completed-quest">
                      <h5 className="quest-title">{quest.title}</h5>
                      <p className="quest-description">{quest.description}</p>
                      {quest.rewards && (
                        <p className="quest-rewards">
                          <span className="rewards-label">Rewards:</span> {quest.rewards}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Failed quests */}
              {failedQuests.length > 0 && (
                <div className="quest-category">
                  <h4 className="category-title">Failed</h4>
                  {failedQuests.map((quest) => (
                    <div key={quest.id} className="quest-item failed-quest">
                      <h5 className="quest-title">{quest.title}</h5>
                      <p className="quest-description">{quest.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Lore tab */}
      {activeTab === "lore" && (
        <div className="journal-section">
          {!hasLore ? (
            <p className="journal-empty">Your knowledge of this world is limited. Explore and discover...</p>
          ) : (
            <ul className="lore-list">
              {knownLore.map((lore, idx) => (
                <li key={idx} className="lore-item">
                  <span className="lore-marker">◆</span>
                  {lore}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Fallen Heroes tab */}
      {activeTab === "heroes" && (
        <div className="journal-section">
          {!hasHeroes ? (
            <p className="journal-empty">No heroes have fallen yet. May your journey be fortunate...</p>
          ) : (
            <div className="heroes-list">
              {deceasedHeroes.map((hero) => (
                <div key={hero.id} className="hero-memorial">
                  <h5 className="hero-name">{hero.name}</h5>
                  <p className="hero-origin">
                    <em>{hero.origin}</em>
                  </p>
                  <p className="hero-death">{hero.deathDescription}</p>
                  {hero.majorDeeds.length > 0 && (
                    <div className="hero-deeds">
                      <span className="deeds-label">Remembered for:</span>
                      <ul>
                        {hero.majorDeeds.map((deed, idx) => (
                          <li key={idx}>{deed}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
