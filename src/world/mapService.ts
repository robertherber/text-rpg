// Map Service - Data structure for canvas map rendering

import type { WorldState, Location } from "./types";

export interface MapLocation {
  id: string;
  name: string;
  x: number;
  y: number;
  terrain: Location["terrain"];
  isCurrent: boolean;
}

/**
 * Represents a set of explored coordinates as a comma-separated key "x,y"
 */
export type ExploredCoordinate = string;

export interface MapData {
  locations: MapLocation[];
  exploredTiles: ExploredCoordinate[]; // Array of "x,y" strings
}

/**
 * Calculate explored tiles from known locations.
 * Each visited location reveals a 1-tile radius around it (9 tiles total per location).
 */
function calculateExploredTiles(
  locations: Record<string, Location>,
  knownLocationIds: Set<string>
): Set<ExploredCoordinate> {
  const exploredTiles = new Set<ExploredCoordinate>();

  for (const locationId of knownLocationIds) {
    const location = locations[locationId];
    if (!location) {
      // Try to find by name match
      const locationByName = Object.values(locations).find(
        (loc) => loc.name.toLowerCase() === locationId.toLowerCase()
      );
      if (locationByName) {
        addTilesAroundCoordinate(exploredTiles, locationByName.coordinates.x, locationByName.coordinates.y);
      }
      continue;
    }

    addTilesAroundCoordinate(exploredTiles, location.coordinates.x, location.coordinates.y);
  }

  return exploredTiles;
}

/**
 * Add tiles in a 1-tile radius around a coordinate (including the center)
 */
function addTilesAroundCoordinate(tiles: Set<ExploredCoordinate>, centerX: number, centerY: number) {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      tiles.add(`${centerX + dx},${centerY + dy}`);
    }
  }
}

/**
 * Get map data for rendering on HTML canvas.
 * Returns only visited/known locations with coordinates and terrain info,
 * plus the set of explored tile coordinates for fog of war rendering.
 *
 * @param worldState - The current world state
 * @returns MapData with locations and explored tiles
 */
export function getMapData(worldState: WorldState): MapData {
  const { player, locations } = worldState;
  const currentLocationId = player.currentLocationId;

  // Get set of known location IDs from player knowledge
  const knownLocationIds = new Set(player.knowledge.locations);

  // Also include current location even if not in knowledge (edge case)
  knownLocationIds.add(currentLocationId);

  // Calculate explored tiles (1-tile radius around each known location)
  const exploredTilesSet = calculateExploredTiles(locations, knownLocationIds);

  // Filter locations to only those the player knows about
  const mapLocations: MapLocation[] = [];

  for (const locationId of knownLocationIds) {
    const location = locations[locationId];

    // Skip if location doesn't exist (might be a location name rather than ID)
    if (!location) {
      // Try to find by name match
      const locationByName = Object.values(locations).find(
        (loc) => loc.name.toLowerCase() === locationId.toLowerCase()
      );

      if (locationByName) {
        mapLocations.push({
          id: locationByName.id,
          name: locationByName.name,
          x: locationByName.coordinates.x,
          y: locationByName.coordinates.y,
          terrain: locationByName.terrain,
          isCurrent: locationByName.id === currentLocationId,
        });
      }
      continue;
    }

    mapLocations.push({
      id: location.id,
      name: location.name,
      x: location.coordinates.x,
      y: location.coordinates.y,
      terrain: location.terrain,
      isCurrent: location.id === currentLocationId,
    });
  }

  // Deduplicate by location ID (in case both ID and name were in knowledge)
  const seenIds = new Set<string>();
  const deduplicatedLocations = mapLocations.filter((loc) => {
    if (seenIds.has(loc.id)) {
      return false;
    }
    seenIds.add(loc.id);
    return true;
  });

  return {
    locations: deduplicatedLocations,
    exploredTiles: Array.from(exploredTilesSet),
  };
}
