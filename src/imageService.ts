import OpenAI from "openai";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

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

// Get cached image path for a location
function getCachePath(locationId: string): string {
  return `${CACHE_DIR}/${locationId}.png`;
}

// Check if image is cached locally
export async function getCachedImage(locationId: string): Promise<string | null> {
  const cachePath = getCachePath(locationId);
  if (existsSync(cachePath)) {
    return `/image-cache/${locationId}.png`;
  }
  return null;
}

// Download and cache image locally
async function cacheImage(locationId: string, imageUrl: string): Promise<string> {
  await ensureCacheDir();
  const cachePath = getCachePath(locationId);

  try {
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    await Bun.write(cachePath, buffer);
    console.log(`Cached image for ${locationId}`);
    return `/image-cache/${locationId}.png`;
  } catch (error) {
    console.error(`Failed to cache image for ${locationId}:`, error);
    return imageUrl; // Return original URL as fallback
  }
}

export async function generateImage(locationId: string, prompt: string): Promise<string> {
  // Check local cache first
  const cached = await getCachedImage(locationId);
  if (cached) {
    console.log(`Using cached image for ${locationId}`);
    return cached;
  }

  const client = getOpenAI();
  if (!client) {
    // Return a placeholder if no API key
    console.warn("No OPENAI_API_KEY set, using placeholder image");
    return `https://placehold.co/800x500/2a1a4a/gold?text=${encodeURIComponent(prompt.slice(0, 30))}`;
  }

  console.log(`Generating image for ${locationId}...`);

  try {
    const response = await client.images.generate({
      model: "dall-e-3",
      prompt: `Fantasy RPG game scene: ${prompt}. Style: Digital painting, rich colors, atmospheric lighting, medieval fantasy aesthetic.`,
      n: 1,
      size: "1792x1024",
      quality: "standard",
    });

    const imageUrl = response.data[0]?.url;
    if (imageUrl) {
      // Download and cache the image locally
      const cachedUrl = await cacheImage(locationId, imageUrl);
      return cachedUrl;
    }

    throw new Error("No image URL returned");
  } catch (error) {
    console.error("Error generating image:", error);
    // Return placeholder on error
    return `https://placehold.co/800x500/2a1a4a/gold?text=${encodeURIComponent("Image Generation Failed")}`;
  }
}
