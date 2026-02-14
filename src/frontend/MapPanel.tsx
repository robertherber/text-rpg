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
const CURRENT_MARKER_SIZE = 8;

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
      const color = TERRAIN_COLORS[location.terrain] || "#666666";
      const nodeSize = CELL_SIZE / 2 - 5;

      // Draw location node with subtle shadow for depth
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x - nodeSize, y - nodeSize, nodeSize * 2, nodeSize * 2, 8);
      ctx.fill();
      ctx.restore();

      // Draw border in ink style
      ctx.strokeStyle = location.isCurrent ? "#8b4513" : PARCHMENT_COLORS.ink;
      ctx.lineWidth = location.isCurrent ? 3 : 1.5;
      ctx.beginPath();
      ctx.roundRect(x - nodeSize, y - nodeSize, nodeSize * 2, nodeSize * 2, 8);
      ctx.stroke();

      // Draw current location marker (compass rose style)
      if (location.isCurrent) {
        ctx.fillStyle = "#8b4513";
        ctx.beginPath();
        // Draw a small X marker above location
        const markerY = y - nodeSize - CURRENT_MARKER_SIZE - 4;
        ctx.moveTo(x, markerY - CURRENT_MARKER_SIZE);
        ctx.lineTo(x + CURRENT_MARKER_SIZE * 0.6, markerY);
        ctx.lineTo(x, markerY + CURRENT_MARKER_SIZE * 0.6);
        ctx.lineTo(x - CURRENT_MARKER_SIZE * 0.6, markerY);
        ctx.closePath();
        ctx.fill();

        // Add inner highlight
        ctx.fillStyle = "#d4a843";
        ctx.beginPath();
        ctx.arc(x, markerY, CURRENT_MARKER_SIZE * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw location name in ink
      ctx.fillStyle = PARCHMENT_COLORS.ink;
      ctx.font = "bold 10px Georgia, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      // Truncate long names
      let displayName = location.name;
      if (displayName.length > 12) {
        displayName = displayName.substring(0, 10) + "...";
      }
      ctx.fillText(displayName, x, y + nodeSize + 4);
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

      {/* Legend */}
      <div className="map-legend">
        <div className="legend-title">Legend</div>
        <div className="legend-items">
          {Object.entries(TERRAIN_COLORS).slice(0, 6).map(([terrain, color]) => (
            <div key={terrain} className="legend-item">
              <div className="legend-color" style={{ backgroundColor: color }} />
              <span>{terrain}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
