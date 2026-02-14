// World State Persistence Functions
// Save and load world state from world-state.json using Bun.file

import type { WorldState } from "./types";

const WORLD_STATE_PATH = "world-state.json";

/**
 * Saves the world state to world-state.json
 * @param state - The WorldState to save
 */
export async function saveWorldState(state: WorldState): Promise<void> {
  const json = JSON.stringify(state, null, 2);
  await Bun.write(WORLD_STATE_PATH, json);
}

/**
 * Loads the world state from world-state.json
 * @returns The WorldState if file exists, null otherwise
 */
export async function loadWorldState(): Promise<WorldState | null> {
  const file = Bun.file(WORLD_STATE_PATH);
  const exists = await file.exists();

  if (!exists) {
    return null;
  }

  const text = await file.text();
  const state = JSON.parse(text) as WorldState;
  return state;
}
