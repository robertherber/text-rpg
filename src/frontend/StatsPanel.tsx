import React from "react";

// Player stats interface for StatsPanel props
export interface StatsPanelProps {
  name?: string;
  health: number;
  maxHealth: number;
  gold: number;
  strength: number;
  defense: number;
  magic: number;
  level: number;
  experience: number;
  companionCount: number;
}

export default function StatsPanel({
  name,
  health,
  maxHealth,
  gold,
  strength,
  defense,
  magic,
  level,
  experience,
  companionCount,
}: StatsPanelProps) {
  const healthPercent = maxHealth > 0 ? (health / maxHealth) * 100 : 0;
  const xpForNextLevel = level * 50; // 50 XP per level
  const xpPercent = xpForNextLevel > 0 ? (experience / xpForNextLevel) * 100 : 0;

  return (
    <div className="stats-panel">
      {/* Player name */}
      <div className="stats-player-name">{name || "Unnamed Hero"}</div>

      {/* Stats grid */}
      <div className="stats-grid">
        {/* Health bar */}
        <div className="stats-row stats-health-row">
          <span className="stats-icon">❤️</span>
          <div className="stats-health-bar">
            <div
              className="stats-health-fill"
              style={{ width: `${healthPercent}%` }}
            />
            <span className="stats-health-text">
              {health}/{maxHealth}
            </span>
          </div>
        </div>

        {/* Level with XP bar */}
        <div className="stats-row stats-level-row">
          <span className="stats-icon">📊</span>
          <div className="stats-level-info">
            <span className="stats-level-text">Lv.{level}</span>
            <div className="stats-xp-bar">
              <div
                className="stats-xp-fill"
                style={{ width: `${Math.min(100, xpPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Combat stats row */}
        <div className="stats-row stats-combat-row">
          <div className="stats-stat">
            <span className="stats-icon">⚔️</span>
            <span className="stats-value">{strength}</span>
            <span className="stats-label">STR</span>
          </div>
          <div className="stats-stat">
            <span className="stats-icon">🛡️</span>
            <span className="stats-value">{defense}</span>
            <span className="stats-label">DEF</span>
          </div>
          <div className="stats-stat">
            <span className="stats-icon">✨</span>
            <span className="stats-value">{magic}</span>
            <span className="stats-label">MAG</span>
          </div>
        </div>

        {/* Resources row */}
        <div className="stats-row stats-resources-row">
          <div className="stats-stat">
            <span className="stats-icon">💰</span>
            <span className="stats-value">{gold}</span>
            <span className="stats-label">Gold</span>
          </div>
          {companionCount > 0 && (
            <div className="stats-stat stats-companions">
              <span className="stats-icon">👥</span>
              <span className="stats-value">{companionCount}</span>
              <span className="stats-label">
                {companionCount === 1 ? "Companion" : "Companions"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
