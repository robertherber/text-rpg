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

    // Clear canvas
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines
    ctx.strokeStyle = "#3d405b";
    ctx.lineWidth = 1;

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

    // Draw locations
    for (const location of mapData) {
      const { x, y } = gridToCanvas(location.x, location.y, bounds);
      const color = TERRAIN_COLORS[location.terrain] || "#666666";
      const nodeSize = CELL_SIZE / 2 - 5;

      // Draw location node
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x - nodeSize, y - nodeSize, nodeSize * 2, nodeSize * 2, 8);
      ctx.fill();

      // Draw border
      ctx.strokeStyle = location.isCurrent ? "#ffd700" : "#e8d5b7";
      ctx.lineWidth = location.isCurrent ? 3 : 1;
      ctx.beginPath();
      ctx.roundRect(x - nodeSize, y - nodeSize, nodeSize * 2, nodeSize * 2, 8);
      ctx.stroke();

      // Draw current location marker
      if (location.isCurrent) {
        ctx.fillStyle = "#ffd700";
        ctx.beginPath();
        ctx.arc(x, y - nodeSize - CURRENT_MARKER_SIZE - 2, CURRENT_MARKER_SIZE, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw location name
      ctx.fillStyle = "#e8d5b7";
      ctx.font = "10px Georgia, serif";
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
