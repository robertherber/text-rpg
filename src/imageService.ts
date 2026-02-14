import OpenAI from "openai";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import type { Location, NPC, WorldState } from "./world/types";

const CACHE_DIR = "./image-cache";

// Ensure cache directory exists
async function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) {
    await mkdir(CACHE_DIR, { recursive: true });
  }
}

// Lazy initialization of OpenAI client
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

// Get cached image path for a location with state hash
function getCachePath(locationId: string, stateHash?: string): string {
  if (stateHash) {
    return `${CACHE_DIR}/${locationId}_${stateHash}.png`;
  }
  return `${CACHE_DIR}/${locationId}.png`;
}

// Generate a hash of the current state for cache invalidation
// This includes the location description, present NPCs, and their physical descriptions
export function generateImageStateHash(location: Location, presentNpcs: NPC[]): string {
  const stateData = {
    locationId: location.id,
    locationDescription: location.description,
    locationImagePrompt: location.imagePrompt,
    npcs: presentNpcs
      .filter(npc => npc.isAlive)
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(npc => ({
        id: npc.id,
        name: npc.name,
        physicalDescription: npc.physicalDescription,
      })),
  };

  const hash = createHash("sha256")
    .update(JSON.stringify(stateData))
    .digest("hex")
    .substring(0, 12); // Use first 12 chars for brevity

  return hash;
}

// Build image prompt from location and present NPCs
export function buildImagePromptWithNpcs(location: Location, presentNpcs: NPC[]): string {
  let prompt = location.imagePrompt || location.description;

  // Add NPC descriptions
  const aliveNpcs = presentNpcs.filter(npc => npc.isAlive);
  if (aliveNpcs.length > 0) {
    const npcDescriptions = aliveNpcs
      .map(npc => {
        // Use physical description if available, otherwise name
        if (npc.physicalDescription) {
          return npc.physicalDescription;
        }
        return npc.name;
      })
      .join("; ");

    prompt += `. Characters present: ${npcDescriptions}`;
  }

  return prompt;
}

// Check if image is cached locally with matching state hash
export async function getCachedImage(locationId: string, stateHash?: string): Promise<string | null> {
  if (stateHash) {
    const cachePath = getCachePath(locationId, stateHash);
    if (existsSync(cachePath)) {
      return `/image-cache/${locationId}_${stateHash}.png`;
    }
  }
  // Fallback to old-style cache without hash
  const oldCachePath = getCachePath(locationId);
  if (existsSync(oldCachePath)) {
    return `/image-cache/${locationId}.png`;
  }
  return null;
}

// Download and cache image locally with state hash
async function cacheImage(locationId: string, imageUrl: string, stateHash?: string): Promise<string> {
  await ensureCacheDir();
  const cachePath = getCachePath(locationId, stateHash);

  try {
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    await Bun.write(cachePath, buffer);
    console.log(`Cached image for ${locationId}${stateHash ? ` (hash: ${stateHash})` : ""}`);
    if (stateHash) {
      return `/image-cache/${locationId}_${stateHash}.png`;
    }
    return `/image-cache/${locationId}.png`;
  } catch (error) {
    console.error(`Failed to cache image for ${locationId}:`, error);
    return imageUrl; // Return original URL as fallback
  }
}

export async function generateImage(locationId: string, prompt: string, stateHash?: string): Promise<string> {
  // Check local cache first with state hash
  const cached = await getCachedImage(locationId, stateHash);
  if (cached) {
    console.log(`Using cached image for ${locationId}${stateHash ? ` (hash: ${stateHash})` : ""}`);
    return cached;
  }

  const client = getOpenAI();
  if (!client) {
    // Return a placeholder if no API key
    console.warn("No OPENAI_API_KEY set, using placeholder image");
    return `https://placehold.co/800x500/2a1a4a/gold?text=${encodeURIComponent(prompt.slice(0, 30))}`;
  }

  console.log(`Generating image for ${locationId}${stateHash ? ` (hash: ${stateHash})` : ""}...`);

  try {
    const response = await client.images.generate({
      model: "dall-e-3",
      prompt: `Fantasy RPG game scene: ${prompt}. Style: Digital painting, rich colors, atmospheric lighting, medieval fantasy aesthetic.`,
      n: 1,
      size: "1792x1024",
      quality: "standard",
    });

    const imageUrl = response.data?.[0]?.url;
    if (imageUrl) {
      // Download and cache the image locally with state hash
      const cachedUrl = await cacheImage(locationId, imageUrl, stateHash);
      return cachedUrl;
    }

    throw new Error("No image URL returned");
  } catch (error) {
    console.error("Error generating image:", error);
    // Return placeholder on error
    return `https://placehold.co/800x500/2a1a4a/gold?text=${encodeURIComponent("Image Generation Failed")}`;
  }
}

// Generate image for a location with NPCs included
// This is the main entry point for the world system
export async function generateWorldImage(
  worldState: WorldState,
  locationId: string
): Promise<{ imageUrl: string; stateHash: string }> {
  const location = worldState.locations[locationId];
  if (!location) {
    throw new Error(`Location not found: ${locationId}`);
  }

  // Get present NPCs
  const presentNpcs = location.presentNpcIds
    .map(id => worldState.npcs[id])
    .filter((npc): npc is NPC => npc !== undefined && npc.isAlive);

  // Generate state hash
  const stateHash = generateImageStateHash(location, presentNpcs);

  // Check if we already have a cached image with this hash
  const cached = await getCachedImage(locationId, stateHash);
  if (cached) {
    console.log(`Using cached world image for ${locationId} (hash: ${stateHash})`);
    return { imageUrl: cached, stateHash };
  }

  // Build the prompt with NPCs
  const prompt = buildImagePromptWithNpcs(location, presentNpcs);

  // Generate the image
  const imageUrl = await generateImage(locationId, prompt, stateHash);

  return { imageUrl, stateHash };
}

/**
 * Pre-generate images for suggested movement destinations in the background.
 * This is non-blocking - it queues image generation tasks and returns immediately.
 *
 * @param worldState - The current world state
 * @param suggestedActions - Array of suggested actions from GPT
 */
export function preGenerateImagesForDestinations(
  worldState: WorldState,
  suggestedActions: Array<{ type: string; targetLocationId?: string }>
): void {
  // Extract unique destination location IDs from movement actions
  const destinationIds = new Set<string>();

  for (const action of suggestedActions) {
    // Check for move or travel actions with target location
    if ((action.type === "move" || action.type === "travel") && action.targetLocationId) {
      destinationIds.add(action.targetLocationId);
    }
  }

  if (destinationIds.size === 0) {
    return;
  }

  console.log(`🖼️  Pre-generating images for ${destinationIds.size} destination(s) in background...`);

  // Queue background image generation for each destination
  // Convert Set to Array for iteration compatibility
  const destinationArray = Array.from(destinationIds);
  for (const locationId of destinationArray) {
    const location = worldState.locations[locationId];

    if (!location) {
      console.log(`Pre-generation skipped: location ${locationId} not found`);
      continue;
    }

    // Get present NPCs at destination (for accurate image)
    const presentNpcs = location.presentNpcIds
      .map(id => worldState.npcs[id])
      .filter((npc): npc is NPC => npc !== undefined && npc.isAlive);

    // Generate state hash for this destination
    const stateHash = generateImageStateHash(location, presentNpcs);

    // Check if already cached (avoid unnecessary work)
    getCachedImage(locationId, stateHash).then(cached => {
      if (cached) {
        console.log(`Pre-generation skipped: ${location.name} already cached (hash: ${stateHash})`);
        return;
      }

      // Build prompt and generate image in background (fire and forget)
      const prompt = buildImagePromptWithNpcs(location, presentNpcs);

      // Generate image without awaiting - runs in background
      generateImage(locationId, prompt, stateHash)
        .then(() => {
          console.log(`✅ Pre-generated image for ${location.name} (hash: ${stateHash})`);
        })
        .catch(error => {
          console.error(`❌ Pre-generation failed for ${location.name}:`, error);
        });
    }).catch(error => {
      console.error(`Error checking cache for ${locationId}:`, error);
    });
  }
}
