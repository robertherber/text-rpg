import React, { useState, useEffect } from "react";

/**
 * Types for inventory item from the API
 */
export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  type: "weapon" | "armor" | "potion" | "food" | "key" | "misc" | "material" | "book" | "magic";
  effect?: {
    stat: string;
    value: number;
  };
  value: number;
}

interface InventoryPanelProps {
  items: InventoryItem[];
  onUseItem?: (itemId: string) => void;
  isProcessing?: boolean;
}

/**
 * Get icon for item type
 */
function getItemIcon(type: InventoryItem["type"]): string {
  switch (type) {
    case "weapon":
      return "⚔️";
    case "armor":
      return "🛡️";
    case "potion":
      return "🧪";
    case "food":
      return "🍖";
    case "key":
      return "🔑";
    case "book":
      return "📖";
    case "magic":
      return "✨";
    case "material":
      return "🪨";
    case "misc":
    default:
      return "📦";
  }
}

/**
 * Check if an item can be used/consumed
 */
function isUsableItem(type: InventoryItem["type"]): boolean {
  return type === "potion" || type === "food" || type === "book";
}

/**
 * Check if an item can be equipped
 */
function isEquippableItem(type: InventoryItem["type"]): boolean {
  return type === "weapon" || type === "armor";
}

/**
 * InventoryPanel - Displays and manages player inventory items.
 *
 * Features:
 * - Lists all items with icons based on type
 * - Shows item details on hover
 * - Click to use/equip items
 */
export default function InventoryPanel({
  items,
  onUseItem,
  isProcessing = false,
}: InventoryPanelProps) {
  const [hoveredItem, setHoveredItem] = useState<InventoryItem | null>(null);

  // Get action label for item
  const getActionLabel = (item: InventoryItem): string | null => {
    if (isUsableItem(item.type)) {
      return item.type === "book" ? "Read" : "Use";
    }
    if (isEquippableItem(item.type)) {
      return "Equip";
    }
    return null;
  };

  // Handle item click
  const handleItemClick = (item: InventoryItem) => {
    if (isProcessing || !onUseItem) return;
    const actionLabel = getActionLabel(item);
    if (actionLabel) {
      onUseItem(item.id);
    }
  };

  if (items.length === 0) {
    return (
      <div className="inventory-panel">
        <h3 className="inventory-title">Inventory</h3>
        <p className="inventory-empty">Your pack is empty. Perhaps you'll find something useful on your travels...</p>
      </div>
    );
  }

  return (
    <div className="inventory-panel">
      <h3 className="inventory-title">
        Inventory <span className="inventory-count">{items.length}</span>
      </h3>

      <div className="inventory-list">
        {items.map((item) => {
          const actionLabel = getActionLabel(item);
          const isClickable = actionLabel && onUseItem;

          return (
            <div
              key={item.id}
              className={`inventory-item ${isClickable ? "clickable" : ""} ${hoveredItem?.id === item.id ? "hovered" : ""}`}
              onMouseEnter={() => setHoveredItem(item)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => handleItemClick(item)}
            >
              <span className="item-icon">{getItemIcon(item.type)}</span>
              <span className="item-name">{item.name}</span>
              <span className="item-type-badge">{item.type}</span>
            </div>
          );
        })}
      </div>

      {/* Tooltip showing item details */}
      {hoveredItem && (
        <div className="inventory-tooltip">
          <div className="tooltip-header">
            <span className="tooltip-icon">{getItemIcon(hoveredItem.type)}</span>
            <span className="tooltip-name">{hoveredItem.name}</span>
          </div>
          <p className="tooltip-description">{hoveredItem.description}</p>
          <div className="tooltip-details">
            <span className="tooltip-type">{hoveredItem.type}</span>
            <span className="tooltip-value">Value: {hoveredItem.value} gold</span>
          </div>
          {hoveredItem.effect && (
            <div className="tooltip-effect">
              <span className="effect-label">Effect:</span>{" "}
              {hoveredItem.effect.value > 0 ? "+" : ""}
              {hoveredItem.effect.value} {hoveredItem.effect.stat}
            </div>
          )}
          {getActionLabel(hoveredItem) && (
            <div className="tooltip-action">
              Click to {getActionLabel(hoveredItem)?.toLowerCase()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
