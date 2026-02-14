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
 * Get map data for rendering on HTML canvas.
 * Returns only visited/known locations with coordinates and terrain info.
 *
 * @param worldState - The current world state
 * @returns Array of MapLocation objects for canvas rendering
 */
export function getMapData(worldState: WorldState): MapLocation[] {
  const { player, locations } = worldState;
  const currentLocationId = player.currentLocationId;

  // Get set of known location IDs from player knowledge
  const knownLocationIds = new Set(player.knowledge.locations);

  // Also include current location even if not in knowledge (edge case)
  knownLocationIds.add(currentLocationId);

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

  return deduplicatedLocations;
}
