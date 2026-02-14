import React, { useRef, useEffect, useState } from "react";

/**
 * Map location type for canvas rendering (matches API response)
 */
export interface MapLocation {
  id: string;
  name: string;
  x: number;
  y: number;
  terrain: string;
  isCurrent: boolean;
}

/**
 * Props for the MapPanel component
 */
interface MapPanelProps {
  onLocationClick?: (locationId: string) => void;
}

// Terrain color mapping for visual distinction
const TERRAIN_COLORS: Record<string, string> = {
  village: "#4a9c6d",     // Green
  road: "#8b7355",        // Brown
  forest: "#2d5a27",      // Dark green
  plains: "#a8c686",      // Light green
  mountains: "#6b6b6b",   // Gray
  swamp: "#5c6b4a",       // Murky green
  dungeon: "#4a3a5c",     // Purple-ish
  cave: "#3d3d3d",        // Dark gray
  ruins: "#7a6a5a",       // Sandy brown
  water: "#4a7a9c",       // Blue
  desert: "#c9a962",      // Sandy
  tavern: "#8b4513",      // Saddle brown
  shop: "#cd853f",        // Peru
  castle: "#708090",      // Slate gray
  temple: "#daa520",      // Goldenrod
};

// Grid settings
const CELL_SIZE = 60;
const PADDING = 40;
const CURRENT_MARKER_SIZE = 10;
const ICON_SIZE = 24; // Size of terrain icons

// Parchment color palette
const PARCHMENT_COLORS = {
  base: "#d4c4a8",
  light: "#e8dcc8",
  medium: "#c9b896",
  dark: "#b8a88c",
  stain: "#a89878",
  ink: "#4a3a2a",
  inkLight: "#6b5a4a",
  gridLine: "rgba(74, 58, 42, 0.3)",
};

/**
 * Draw a hand-drawn style village icon (small houses with a tower)
 */
function drawVillageIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 24;
  ctx.save();
  ctx.strokeStyle = PARCHMENT_COLORS.ink;
  ctx.fillStyle = PARCHMENT_COLORS.ink;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Main house
  ctx.beginPath();
  ctx.moveTo(x - 8 * s, y + 6 * s);
  ctx.lineTo(x - 8 * s, y - 2 * s);
  ctx.lineTo(x, y - 10 * s);
  ctx.lineTo(x + 8 * s, y - 2 * s);
  ctx.lineTo(x + 8 * s, y + 6 * s);
  ctx.stroke();

  // Door
  ctx.beginPath();
  ctx.moveTo(x - 2 * s, y + 6 * s);
  ctx.lineTo(x - 2 * s, y);
  ctx.lineTo(x + 2 * s, y);
  ctx.lineTo(x + 2 * s, y + 6 * s);
  ctx.stroke();

  // Small house to the side
  ctx.beginPath();
  ctx.moveTo(x + 10 * s, y + 6 * s);
  ctx.lineTo(x + 10 * s, y + 2 * s);
  ctx.lineTo(x + 14 * s, y - 2 * s);
  ctx.lineTo(x + 18 * s, y + 2 * s);
  ctx.lineTo(x + 18 * s, y + 6 * s);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw a hand-drawn style forest icon (trees)
 */
function drawForestIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 24;
  ctx.save();
  ctx.strokeStyle = PARCHMENT_COLORS.ink;
  ctx.fillStyle = PARCHMENT_COLORS.ink;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Left tree
  ctx.beginPath();
  ctx.moveTo(x - 8 * s, y + 8 * s);
  ctx.lineTo(x - 8 * s, y + 2 * s);
  ctx.moveTo(x - 14 * s, y + 2 * s);
  ctx.lineTo(x - 8 * s, y - 8 * s);
  ctx.lineTo(x - 2 * s, y + 2 * s);
  ctx.stroke();

  // Center tree (taller)
  ctx.beginPath();
  ctx.moveTo(x, y + 8 * s);
  ctx.lineTo(x, y);
  ctx.moveTo(x - 8 * s, y);
  ctx.lineTo(x, y - 12 * s);
  ctx.lineTo(x + 8 * s, y);
  ctx.stroke();

  // Right tree
  ctx.beginPath();
  ctx.moveTo(x + 8 * s, y + 8 * s);
  ctx.lineTo(x + 8 * s, y + 2 * s);
  ctx.moveTo(x + 2 * s, y + 2 * s);
  ctx.lineTo(x + 8 * s, y - 6 * s);
  ctx.lineTo(x + 14 * s, y + 2 * s);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw a hand-drawn style mountains icon
 */
function drawMountainsIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 24;
  ctx.save();
  ctx.strokeStyle = PARCHMENT_COLORS.ink;
  ctx.fillStyle = PARCHMENT_COLORS.ink;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Back mountain
  ctx.beginPath();
  ctx.moveTo(x - 14 * s, y + 8 * s);
  ctx.lineTo(x - 4 * s, y - 6 * s);
  ctx.lineTo(x + 6 * s, y + 8 * s);
  ctx.stroke();

  // Front mountain (larger)
  ctx.beginPath();
  ctx.moveTo(x - 8 * s, y + 8 * s);
  ctx.lineTo(x + 4 * s, y - 10 * s);
  ctx.lineTo(x + 16 * s, y + 8 * s);
  ctx.stroke();

  // Snow cap on front mountain
  ctx.beginPath();
  ctx.moveTo(x, y - 4 * s);
  ctx.lineTo(x + 4 * s, y - 10 * s);
  ctx.lineTo(x + 8 * s, y - 4 * s);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw a hand-drawn style plains/grassland icon
 */
function drawPlainsIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 24;
  ctx.save();
  ctx.strokeStyle = PARCHMENT_COLORS.ink;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";

  // Grass tufts
  for (let i = -1; i <= 1; i++) {
    const baseX = x + i * 8 * s;
    ctx.beginPath();
    ctx.moveTo(baseX - 3 * s, y + 6 * s);
    ctx.quadraticCurveTo(baseX - 4 * s, y - 2 * s, baseX - 2 * s, y - 6 * s);
    ctx.moveTo(baseX, y + 6 * s);
    ctx.quadraticCurveTo(baseX, y - 4 * s, baseX, y - 8 * s);
    ctx.moveTo(baseX + 3 * s, y + 6 * s);
    ctx.quadraticCurveTo(baseX + 4 * s, y - 2 * s, baseX + 2 * s, y - 6 * s);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw a hand-drawn style road/path icon
 */
function drawRoadIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 24;
  ctx.save();
  ctx.strokeStyle = PARCHMENT_COLORS.ink;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";

  // Winding path
  ctx.beginPath();
  ctx.moveTo(x - 4 * s, y + 10 * s);
  ctx.quadraticCurveTo(x - 8 * s, y + 2 * s, x, y);
  ctx.quadraticCurveTo(x + 8 * s, y - 2 * s, x + 4 * s, y - 10 * s);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + 4 * s, y + 10 * s);
  ctx.quadraticCurveTo(x, y + 2 * s, x + 8 * s, y);
  ctx.quadraticCurveTo(x + 16 * s, y - 2 * s, x + 12 * s, y - 10 * s);
  ctx.stroke();

  // Path stones
  ctx.fillStyle = PARCHMENT_COLORS.ink;
  ctx.beginPath();
  ctx.arc(x, y + 4 * s, 1.5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 6 * s, y - 2 * s, 1.5 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draw a hand-drawn style swamp icon
 */
function drawSwampIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 24;
  ctx.save();
  ctx.strokeStyle = PARCHMENT_COLORS.ink;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";

  // Wavy water lines
  for (let i = 0; i < 3; i++) {
    const yOffset = y + (i - 1) * 6 * s;
    ctx.beginPath();
    ctx.moveTo(x - 12 * s, yOffset);
    ctx.quadraticCurveTo(x - 6 * s, yOffset - 3 * s, x, yOffset);
    ctx.quadraticCurveTo(x + 6 * s, yOffset + 3 * s, x + 12 * s, yOffset);
    ctx.stroke();
  }

  // Reeds
  ctx.beginPath();
  ctx.moveTo(x - 8 * s, y + 4 * s);
  ctx.lineTo(x - 8 * s, y - 8 * s);
  ctx.moveTo(x - 10 * s, y - 6 * s);
  ctx.lineTo(x - 8 * s, y - 8 * s);
  ctx.lineTo(x - 6 * s, y - 6 * s);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw a hand-drawn style water/lake icon
 */
function drawWaterIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 24;
  ctx.save();
  ctx.strokeStyle = PARCHMENT_COLORS.ink;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";

  // Waves
  for (let i = 0; i < 3; i++) {
    const yOffset = y + (i - 1) * 5 * s;
    ctx.beginPath();
    ctx.moveTo(x - 10 * s, yOffset);
    ctx.quadraticCurveTo(x - 5 * s, yOffset - 3 * s, x, yOffset);
    ctx.quadraticCurveTo(x + 5 * s, yOffset + 3 * s, x + 10 * s, yOffset);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw a hand-drawn style dungeon/cave entrance icon
 */
function drawDungeonIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 24;
  ctx.save();
  ctx.strokeStyle = PARCHMENT_COLORS.ink;
  ctx.fillStyle = PARCHMENT_COLORS.ink;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Cave entrance arch
  ctx.beginPath();
  ctx.moveTo(x - 10 * s, y + 8 * s);
  ctx.lineTo(x - 10 * s, y - 2 * s);
  ctx.quadraticCurveTo(x - 10 * s, y - 10 * s, x, y - 10 * s);
  ctx.quadraticCurveTo(x + 10 * s, y - 10 * s, x + 10 * s, y - 2 * s);
  ctx.lineTo(x + 10 * s, y + 8 * s);
  ctx.stroke();

  // Dark interior (filled arch)
  ctx.beginPath();
  ctx.moveTo(x - 6 * s, y + 8 * s);
  ctx.lineTo(x - 6 * s, y);
  ctx.quadraticCurveTo(x - 6 * s, y - 6 * s, x, y - 6 * s);
  ctx.quadraticCurveTo(x + 6 * s, y - 6 * s, x + 6 * s, y);
  ctx.lineTo(x + 6 * s, y + 8 * s);
  ctx.fill();

  ctx.restore();
}

/**
 * Draw a hand-drawn style cave icon (similar to dungeon but more natural)
 */
function drawCaveIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 24;
  ctx.save();
  ctx.strokeStyle = PARCHMENT_COLORS.ink;
  ctx.fillStyle = PARCHMENT_COLORS.ink;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";

  // Rough rock outline
  ctx.beginPath();
  ctx.moveTo(x - 12 * s, y + 8 * s);
  ctx.lineTo(x - 14 * s, y - 4 * s);
  ctx.lineTo(x - 8 * s, y - 10 * s);
  ctx.lineTo(x, y - 8 * s);
  ctx.lineTo(x + 8 * s, y - 10 * s);
  ctx.lineTo(x + 14 * s, y - 4 * s);
  ctx.lineTo(x + 12 * s, y + 8 * s);
  ctx.stroke();

  // Dark cave opening
  ctx.beginPath();
  ctx.ellipse(x, y + 2 * s, 6 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draw a hand-drawn style ruins icon
 */
function drawRuinsIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 24;
  ctx.save();
  ctx.strokeStyle = PARCHMENT_COLORS.ink;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";

  // Broken pillars
  ctx.beginPath();
  ctx.moveTo(x - 10 * s, y + 8 * s);
  ctx.lineTo(x - 10 * s, y - 4 * s);
  ctx.lineTo(x - 8 * s, y - 6 * s);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - 4 * s, y + 8 * s);
  ctx.lineTo(x - 4 * s, y - 8 * s);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + 4 * s, y + 8 * s);
  ctx.lineTo(x + 4 * s, y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + 10 * s, y + 8 * s);
  ctx.lineTo(x + 10 * s, y - 2 * s);
  ctx.lineTo(x + 12 * s, y - 4 * s);
  ctx.stroke();

  // Fallen stones
  ctx.fillStyle = PARCHMENT_COLORS.ink;
  ctx.beginPath();
  ctx.ellipse(x + 2 * s, y + 6 * s, 3 * s, 2 * s, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draw a hand-drawn style desert icon
 */
function drawDesertIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 24;
  ctx.save();
  ctx.strokeStyle = PARCHMENT_COLORS.ink;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";

  // Sand dunes
  ctx.beginPath();
  ctx.moveTo(x - 14 * s, y + 6 * s);
  ctx.quadraticCurveTo(x - 8 * s, y - 2 * s, x, y + 2 * s);
  ctx.quadraticCurveTo(x + 8 * s, y + 6 * s, x + 14 * s, y + 4 * s);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - 10 * s, y + 8 * s);
  ctx.quadraticCurveTo(x - 4 * s, y + 2 * s, x + 4 * s, y + 6 * s);
  ctx.stroke();

  // Cactus or sun lines
  ctx.beginPath();
  ctx.moveTo(x + 8 * s, y - 8 * s);
  ctx.lineTo(x + 8 * s, y - 2 * s);
  ctx.moveTo(x + 4 * s, y - 4 * s);
  ctx.lineTo(x + 8 * s, y - 4 * s);
  ctx.lineTo(x + 8 * s, y - 6 * s);
  ctx.moveTo(x + 12 * s, y - 6 * s);
  ctx.lineTo(x + 8 * s, y - 6 * s);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw a hand-drawn style tavern icon
 */
function drawTavernIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 24;
  ctx.save();
  ctx.strokeStyle = PARCHMENT_COLORS.ink;
  ctx.fillStyle = PARCHMENT_COLORS.ink;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Building
  ctx.beginPath();
  ctx.moveTo(x - 10 * s, y + 8 * s);
  ctx.lineTo(x - 10 * s, y - 2 * s);
  ctx.lineTo(x, y - 10 * s);
  ctx.lineTo(x + 10 * s, y - 2 * s);
  ctx.lineTo(x + 10 * s, y + 8 * s);
  ctx.stroke();

  // Door
  ctx.beginPath();
  ctx.moveTo(x - 3 * s, y + 8 * s);
  ctx.lineTo(x - 3 * s, y + 2 * s);
  ctx.lineTo(x + 3 * s, y + 2 * s);
  ctx.lineTo(x + 3 * s, y + 8 * s);
  ctx.stroke();

  // Sign hanging
  ctx.beginPath();
  ctx.moveTo(x + 10 * s, y - 2 * s);
  ctx.lineTo(x + 14 * s, y - 2 * s);
  ctx.moveTo(x + 12 * s, y - 2 * s);
  ctx.lineTo(x + 12 * s, y + 2 * s);
  ctx.stroke();

  // Mug on sign
  ctx.beginPath();
  ctx.arc(x + 12 * s, y + 4 * s, 2 * s, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw a hand-drawn style shop icon
 */
function drawShopIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 24;
  ctx.save();
  ctx.strokeStyle = PARCHMENT_COLORS.ink;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Building with awning
  ctx.beginPath();
  ctx.moveTo(x - 10 * s, y + 8 * s);
  ctx.lineTo(x - 10 * s, y - 6 * s);
  ctx.lineTo(x + 10 * s, y - 6 * s);
  ctx.lineTo(x + 10 * s, y + 8 * s);
  ctx.stroke();

  // Awning
  ctx.beginPath();
  ctx.moveTo(x - 12 * s, y - 6 * s);
  ctx.lineTo(x - 12 * s, y);
  ctx.lineTo(x + 12 * s, y);
  ctx.lineTo(x + 12 * s, y - 6 * s);
  ctx.stroke();

  // Awning stripes
  for (let i = -8; i <= 8; i += 4) {
    ctx.beginPath();
    ctx.moveTo(x + i * s, y - 6 * s);
    ctx.lineTo(x + i * s, y);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw a hand-drawn style castle icon
 */
function drawCastleIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 24;
  ctx.save();
  ctx.strokeStyle = PARCHMENT_COLORS.ink;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Main wall
  ctx.beginPath();
  ctx.moveTo(x - 12 * s, y + 8 * s);
  ctx.lineTo(x - 12 * s, y - 4 * s);
  // Battlements
  ctx.lineTo(x - 10 * s, y - 4 * s);
  ctx.lineTo(x - 10 * s, y - 6 * s);
  ctx.lineTo(x - 6 * s, y - 6 * s);
  ctx.lineTo(x - 6 * s, y - 4 * s);
  ctx.lineTo(x - 2 * s, y - 4 * s);
  ctx.lineTo(x - 2 * s, y - 6 * s);
  ctx.lineTo(x + 2 * s, y - 6 * s);
  ctx.lineTo(x + 2 * s, y - 4 * s);
  ctx.lineTo(x + 6 * s, y - 4 * s);
  ctx.lineTo(x + 6 * s, y - 6 * s);
  ctx.lineTo(x + 10 * s, y - 6 * s);
  ctx.lineTo(x + 10 * s, y - 4 * s);
  ctx.lineTo(x + 12 * s, y - 4 * s);
  ctx.lineTo(x + 12 * s, y + 8 * s);
  ctx.stroke();

  // Tower
  ctx.beginPath();
  ctx.moveTo(x - 4 * s, y - 4 * s);
  ctx.lineTo(x - 4 * s, y - 10 * s);
  ctx.lineTo(x, y - 12 * s);
  ctx.lineTo(x + 4 * s, y - 10 * s);
  ctx.lineTo(x + 4 * s, y - 4 * s);
  ctx.stroke();

  // Gate
  ctx.beginPath();
  ctx.moveTo(x - 3 * s, y + 8 * s);
  ctx.lineTo(x - 3 * s, y + 2 * s);
  ctx.quadraticCurveTo(x - 3 * s, y - 2 * s, x, y - 2 * s);
  ctx.quadraticCurveTo(x + 3 * s, y - 2 * s, x + 3 * s, y + 2 * s);
  ctx.lineTo(x + 3 * s, y + 8 * s);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw a hand-drawn style temple icon
 */
function drawTempleIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 24;
  ctx.save();
  ctx.strokeStyle = PARCHMENT_COLORS.ink;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Triangular roof
  ctx.beginPath();
  ctx.moveTo(x - 14 * s, y - 2 * s);
  ctx.lineTo(x, y - 12 * s);
  ctx.lineTo(x + 14 * s, y - 2 * s);
  ctx.stroke();

  // Columns
  ctx.beginPath();
  ctx.moveTo(x - 10 * s, y - 2 * s);
  ctx.lineTo(x - 10 * s, y + 8 * s);
  ctx.moveTo(x - 4 * s, y - 2 * s);
  ctx.lineTo(x - 4 * s, y + 8 * s);
  ctx.moveTo(x + 4 * s, y - 2 * s);
  ctx.lineTo(x + 4 * s, y + 8 * s);
  ctx.moveTo(x + 10 * s, y - 2 * s);
  ctx.lineTo(x + 10 * s, y + 8 * s);
  ctx.stroke();

  // Base
  ctx.beginPath();
  ctx.moveTo(x - 12 * s, y + 8 * s);
  ctx.lineTo(x + 12 * s, y + 8 * s);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw a generic location marker (fallback)
 */
function drawGenericMarker(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 24;
  ctx.save();
  ctx.strokeStyle = PARCHMENT_COLORS.ink;
  ctx.fillStyle = PARCHMENT_COLORS.ink;
  ctx.lineWidth = 1.5;

  // Circle with dot
  ctx.beginPath();
  ctx.arc(x, y, 8 * s, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, 3 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draw terrain icon based on terrain type
 */
function drawTerrainIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, terrain: string) {
  const iconDrawers: Record<string, (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void> = {
    village: drawVillageIcon,
    forest: drawForestIcon,
    mountains: drawMountainsIcon,
    plains: drawPlainsIcon,
    road: drawRoadIcon,
    swamp: drawSwampIcon,
    water: drawWaterIcon,
    dungeon: drawDungeonIcon,
    cave: drawCaveIcon,
    ruins: drawRuinsIcon,
    desert: drawDesertIcon,
    tavern: drawTavernIcon,
    shop: drawShopIcon,
    castle: drawCastleIcon,
    temple: drawTempleIcon,
  };

  const drawer = iconDrawers[terrain] || drawGenericMarker;
  drawer(ctx, x, y, size);
}

/**
 * Draw a hand-drawn style player position marker (compass/adventurer)
 */
function drawPlayerMarker(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 12;
  ctx.save();

  // Outer glow/shadow
  ctx.shadowColor = "rgba(139, 69, 19, 0.5)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  // Compass rose / star shape
  ctx.fillStyle = "#8b4513"; // Saddle brown
  ctx.strokeStyle = "#4a3a2a";
  ctx.lineWidth = 1;

  ctx.beginPath();
  // Four-pointed star
  ctx.moveTo(x, y - 10 * s); // Top point
  ctx.lineTo(x + 3 * s, y - 3 * s);
  ctx.lineTo(x + 10 * s, y); // Right point
  ctx.lineTo(x + 3 * s, y + 3 * s);
  ctx.lineTo(x, y + 10 * s); // Bottom point
  ctx.lineTo(x - 3 * s, y + 3 * s);
  ctx.lineTo(x - 10 * s, y); // Left point
  ctx.lineTo(x - 3 * s, y - 3 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner circle highlight
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#d4a843";
  ctx.beginPath();
  ctx.arc(x, y, 3 * s, 0, Math.PI * 2);
  ctx.fill();

  // Tiny "N" indicator for north (top)
  ctx.fillStyle = "#4a3a2a";
  ctx.font = `bold ${6 * s}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("N", x, y - 10 * s - 2);

  ctx.restore();
}

/**
 * Draw parchment texture background on canvas
 */
function drawParchmentBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Base parchment gradient
  const baseGradient = ctx.createLinearGradient(0, 0, width, height);
  baseGradient.addColorStop(0, PARCHMENT_COLORS.base);
  baseGradient.addColorStop(0.25, PARCHMENT_COLORS.light);
  baseGradient.addColorStop(0.5, PARCHMENT_COLORS.medium);
  baseGradient.addColorStop(0.75, PARCHMENT_COLORS.dark);
  baseGradient.addColorStop(1, PARCHMENT_COLORS.base);

  ctx.fillStyle = baseGradient;
  ctx.fillRect(0, 0, width, height);

  // Add paper fiber texture with subtle noise
  ctx.save();
  for (let i = 0; i < 800; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * 2 + 0.5;
    const alpha = Math.random() * 0.05 + 0.02;

    ctx.fillStyle = `rgba(139, 119, 85, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.3, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Add subtle coffee stain effect in random spots
  const stainCount = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < stainCount; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = 20 + Math.random() * 40;

    const stainGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    stainGradient.addColorStop(0, "rgba(168, 152, 120, 0.15)");
    stainGradient.addColorStop(0.5, "rgba(168, 152, 120, 0.08)");
    stainGradient.addColorStop(1, "rgba(168, 152, 120, 0)");

    ctx.fillStyle = stainGradient;
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Add age spots / foxing
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * 3 + 1;

    ctx.fillStyle = `rgba(139, 109, 75, ${Math.random() * 0.1 + 0.03})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draw worn/torn parchment edges
 */
function drawParchmentEdges(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const edgeWidth = 15;

  // Create worn edge effect with irregular shadows
  ctx.save();

  // Top edge - darker burn/wear
  const topGradient = ctx.createLinearGradient(0, 0, 0, edgeWidth);
  topGradient.addColorStop(0, "rgba(92, 77, 61, 0.4)");
  topGradient.addColorStop(0.3, "rgba(92, 77, 61, 0.2)");
  topGradient.addColorStop(1, "rgba(92, 77, 61, 0)");
  ctx.fillStyle = topGradient;
  ctx.fillRect(0, 0, width, edgeWidth);

  // Bottom edge
  const bottomGradient = ctx.createLinearGradient(0, height, 0, height - edgeWidth);
  bottomGradient.addColorStop(0, "rgba(92, 77, 61, 0.4)");
  bottomGradient.addColorStop(0.3, "rgba(92, 77, 61, 0.2)");
  bottomGradient.addColorStop(1, "rgba(92, 77, 61, 0)");
  ctx.fillStyle = bottomGradient;
  ctx.fillRect(0, height - edgeWidth, width, edgeWidth);

  // Left edge
  const leftGradient = ctx.createLinearGradient(0, 0, edgeWidth, 0);
  leftGradient.addColorStop(0, "rgba(92, 77, 61, 0.4)");
  leftGradient.addColorStop(0.3, "rgba(92, 77, 61, 0.2)");
  leftGradient.addColorStop(1, "rgba(92, 77, 61, 0)");
  ctx.fillStyle = leftGradient;
  ctx.fillRect(0, 0, edgeWidth, height);

  // Right edge
  const rightGradient = ctx.createLinearGradient(width, 0, width - edgeWidth, 0);
  rightGradient.addColorStop(0, "rgba(92, 77, 61, 0.4)");
  rightGradient.addColorStop(0.3, "rgba(92, 77, 61, 0.2)");
  rightGradient.addColorStop(1, "rgba(92, 77, 61, 0)");
  ctx.fillStyle = rightGradient;
  ctx.fillRect(width - edgeWidth, 0, edgeWidth, height);

  // Add irregular torn edge marks along borders
  ctx.fillStyle = "rgba(92, 77, 61, 0.3)";

  // Top edge tears
  for (let x = 0; x < width; x += 8 + Math.random() * 12) {
    const tearHeight = Math.random() * 4 + 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 3, tearHeight);
    ctx.lineTo(x + 6, 0);
    ctx.fill();
  }

  // Bottom edge tears
  for (let x = 0; x < width; x += 8 + Math.random() * 12) {
    const tearHeight = Math.random() * 4 + 1;
    ctx.beginPath();
    ctx.moveTo(x, height);
    ctx.lineTo(x + 3, height - tearHeight);
    ctx.lineTo(x + 6, height);
    ctx.fill();
  }

  // Left edge tears
  for (let y = 0; y < height; y += 8 + Math.random() * 12) {
    const tearWidth = Math.random() * 4 + 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(tearWidth, y + 3);
    ctx.lineTo(0, y + 6);
    ctx.fill();
  }

  // Right edge tears
  for (let y = 0; y < height; y += 8 + Math.random() * 12) {
    const tearWidth = Math.random() * 4 + 1;
    ctx.beginPath();
    ctx.moveTo(width, y);
    ctx.lineTo(width - tearWidth, y + 3);
    ctx.lineTo(width, y + 6);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * LegendIcon - Renders a small terrain icon for the legend
 */
function LegendIcon({ terrain }: { terrain: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, 24, 24);

    // Draw terrain icon centered in the small canvas
    drawTerrainIcon(ctx, 12, 12, 18, terrain);
  }, [terrain]);

  return (
    <canvas
      ref={canvasRef}
      width={24}
      height={24}
      className="legend-icon-canvas"
    />
  );
}

/**
 * LegendPlayerIcon - Renders the player marker icon for the legend
 */
function LegendPlayerIcon() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, 24, 24);

    // Draw player marker centered in the small canvas
    drawPlayerMarker(ctx, 12, 12, 8);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={24}
      height={24}
      className="legend-icon-canvas"
    />
  );
}

/**
 * MapPanel - Renders explored areas on an HTML canvas.
 *
 * Features:
 * - Fetches data from /api/world/map
 * - Renders locations on HTML canvas at their coordinates
 * - Different colors for terrain types
 * - Current location highlighted
 */
export default function MapPanel({ onLocationClick }: MapPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapData, setMapData] = useState<MapLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredLocation, setHoveredLocation] = useState<MapLocation | null>(null);

  // Fetch map data
  useEffect(() => {
    const fetchMapData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/world/map");
        const data = (await response.json()) as MapLocation[];
        setMapData(data);
        setError(null);
      } catch (err) {
        setError("Failed to load map data");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMapData();
  }, []);

  // Calculate canvas bounds from map data
  const getBounds = () => {
    if (mapData.length === 0) {
      return { minX: -2, maxX: 2, minY: -2, maxY: 2 };
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const loc of mapData) {
      if (loc.x < minX) minX = loc.x;
      if (loc.x > maxX) maxX = loc.x;
      if (loc.y < minY) minY = loc.y;
      if (loc.y > maxY) maxY = loc.y;
    }

    // Add some buffer around the edges
    return {
      minX: minX - 1,
      maxX: maxX + 1,
      minY: minY - 1,
      maxY: maxY + 1,
    };
  };

  // Convert grid coordinates to canvas coordinates
  const gridToCanvas = (gridX: number, gridY: number, bounds: ReturnType<typeof getBounds>) => {
    const canvasWidth = (bounds.maxX - bounds.minX + 1) * CELL_SIZE;
    const canvasHeight = (bounds.maxY - bounds.minY + 1) * CELL_SIZE;

    const x = PADDING + (gridX - bounds.minX) * CELL_SIZE + CELL_SIZE / 2;
    // Invert Y so north is up
    const y = PADDING + (bounds.maxY - gridY) * CELL_SIZE + CELL_SIZE / 2;

    return { x, y, canvasWidth: canvasWidth + PADDING * 2, canvasHeight: canvasHeight + PADDING * 2 };
  };

  // Draw the map on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || mapData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bounds = getBounds();
    const { canvasWidth, canvasHeight } = gridToCanvas(0, 0, bounds);

    // Set canvas size
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Draw parchment background texture
    drawParchmentBackground(ctx, canvasWidth, canvasHeight);

    // Draw worn parchment edges
    drawParchmentEdges(ctx, canvasWidth, canvasHeight);

    // Draw grid lines in parchment-appropriate ink color
    ctx.strokeStyle = PARCHMENT_COLORS.gridLine;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]); // Dashed lines for hand-drawn feel

    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      const { x: canvasX } = gridToCanvas(x, bounds.minY, bounds);
      ctx.beginPath();
      ctx.moveTo(canvasX, PADDING);
      ctx.lineTo(canvasX, canvasHeight - PADDING);
      ctx.stroke();
    }

    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      const { y: canvasY } = gridToCanvas(bounds.minX, y, bounds);
      ctx.beginPath();
      ctx.moveTo(PADDING, canvasY);
      ctx.lineTo(canvasWidth - PADDING, canvasY);
      ctx.stroke();
    }

    // Reset line dash for location rendering
    ctx.setLineDash([]);

    // Draw locations
    for (const location of mapData) {
      const { x, y } = gridToCanvas(location.x, location.y, bounds);
      const nodeSize = CELL_SIZE / 2 - 5;

      // Draw subtle background circle for location area
      ctx.save();
      ctx.fillStyle = "rgba(232, 220, 200, 0.6)";
      ctx.beginPath();
      ctx.arc(x, y, nodeSize, 0, Math.PI * 2);
      ctx.fill();

      // Add hand-drawn style border
      ctx.strokeStyle = "rgba(74, 58, 42, 0.3)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.arc(x, y, nodeSize, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Draw terrain icon
      drawTerrainIcon(ctx, x, y, ICON_SIZE, location.terrain);

      // Draw player marker if current location
      if (location.isCurrent) {
        // Position the player marker above and to the right of the location
        const markerX = x + nodeSize - 4;
        const markerY = y - nodeSize + 4;
        drawPlayerMarker(ctx, markerX, markerY, CURRENT_MARKER_SIZE);
      }

      // Draw location name in ink with hand-drawn style
      ctx.fillStyle = PARCHMENT_COLORS.ink;
      ctx.font = "italic 9px Georgia, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      // Truncate long names
      let displayName = location.name;
      if (displayName.length > 14) {
        displayName = displayName.substring(0, 12) + "...";
      }
      ctx.fillText(displayName, x, y + nodeSize + 2);
    }

  }, [mapData]);

  // Handle mouse move for hover state
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || mapData.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const bounds = getBounds();

    // Check if hovering over any location
    for (const location of mapData) {
      const { x, y } = gridToCanvas(location.x, location.y, bounds);
      const nodeSize = CELL_SIZE / 2 - 5;

      if (
        mouseX >= x - nodeSize &&
        mouseX <= x + nodeSize &&
        mouseY >= y - nodeSize &&
        mouseY <= y + nodeSize
      ) {
        setHoveredLocation(location);
        return;
      }
    }

    setHoveredLocation(null);
  };

  // Handle click for location selection
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onLocationClick || !hoveredLocation) return;
    onLocationClick(hoveredLocation.id);
  };

  if (isLoading) {
    return (
      <div className="map-panel map-loading">
        <div className="loading-spinner" />
        <p>Loading map...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="map-panel map-error">
        <p>{error}</p>
      </div>
    );
  }

  if (mapData.length === 0) {
    return (
      <div className="map-panel">
        <p className="placeholder-text">No locations discovered yet...</p>
      </div>
    );
  }

  return (
    <div className="map-panel map-container" ref={containerRef}>
      <div className="map-canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="map-canvas"
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          style={{ cursor: hoveredLocation ? "pointer" : "default" }}
        />
      </div>

      {/* Tooltip for hovered location */}
      {hoveredLocation && (
        <div className="map-tooltip">
          <div className="tooltip-name">{hoveredLocation.name}</div>
          <div className="tooltip-terrain">{hoveredLocation.terrain}</div>
          <div className="tooltip-coords">
            ({hoveredLocation.x}, {hoveredLocation.y})
          </div>
          {hoveredLocation.isCurrent && (
            <div className="tooltip-current">You are here</div>
          )}
        </div>
      )}

      {/* Legend with hand-drawn icons */}
      <div className="map-legend">
        <div className="legend-title">Legend</div>
        <div className="legend-items">
          {["village", "forest", "mountains", "plains", "tavern", "castle"].map((terrain) => (
            <div key={terrain} className="legend-item">
              <LegendIcon terrain={terrain} />
              <span>{terrain}</span>
            </div>
          ))}
        </div>
        <div className="legend-player">
          <LegendPlayerIcon />
          <span>You are here</span>
        </div>
      </div>
    </div>
  );
}
