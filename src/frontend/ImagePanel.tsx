import React, { useState, useEffect, useCallback } from "react";

/**
 * Location data for the image panel
 */
export interface ImagePanelLocation {
  id: string;
  name: string;
  terrain: string;
  coordinates: { x: number; y: number };
}

/**
 * Props for the ImagePanel component
 */
interface ImagePanelProps {
  location: ImagePanelLocation;
}

// Thematic loading messages for image generation
const LOADING_MESSAGES = [
  "Revealing...",
  "The scene unfolds...",
  "Visions materialize...",
  "The mists clear...",
  "Reality takes shape...",
];

// Get a random loading message
function getRandomLoadingMessage(): string {
  const index = Math.floor(Math.random() * LOADING_MESSAGES.length);
  return LOADING_MESSAGES[index] ?? "Revealing...";
}

/**
 * ImagePanel - Displays the current location image with enhanced loading states.
 *
 * Features:
 * - Displays current location image from /api/world/image/:id
 * - Parchment texture placeholder with thematic "Revealing..." text while loading
 * - Error state with retry button if image fails
 * - Graceful fallback with styled placeholder if image unavailable
 * - Loading is non-blocking (other UI remains responsive)
 */
export default function ImagePanel({ location }: ImagePanelProps) {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [loadingMessage] = useState<string>(() => getRandomLoadingMessage());

  // Load image function, extracted for retry capability
  const loadImage = useCallback(async () => {
    if (!location.id) return;

    try {
      setIsLoading(true);
      setHasError(false);
      const response = await fetch(`/api/world/image/${location.id}`);

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = (await response.json()) as { imageUrl?: string };
      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
      } else {
        // No image available - show placeholder
        setImageUrl("");
      }
    } catch (err) {
      console.error("Failed to load image:", err);
      setHasError(true);
      setImageUrl("");
    } finally {
      setIsLoading(false);
    }
  }, [location.id]);

  // Load image when location changes
  useEffect(() => {
    loadImage();
  }, [loadImage]);

  // Handle image load error (e.g., broken URL)
  const handleImageError = () => {
    console.error("Image failed to load from URL:", imageUrl);
    setImageUrl("");
    setHasError(true);
  };

  // Handle retry button click
  const handleRetry = () => {
    loadImage();
  };

  return (
    <section className="image-panel">
      {isLoading ? (
        // Parchment loading state with thematic message
        <div className="image-loading parchment-loading">
          <div className="parchment-overlay"></div>
          <div className="loading-content">
            <span className="loading-quill">✦</span>
            <p className="loading-reveal-text">{loadingMessage}</p>
          </div>
        </div>
      ) : hasError ? (
        // Error state with retry button
        <div className="image-error">
          <span className="error-icon">⚠</span>
          <p className="error-message">The vision fades...</p>
          <button className="image-retry-button" onClick={handleRetry}>
            Try Again
          </button>
        </div>
      ) : imageUrl ? (
        // Successfully loaded image
        <img
          src={imageUrl}
          alt={location.name}
          className="location-image"
          onError={handleImageError}
        />
      ) : (
        // Graceful fallback - styled placeholder (not broken image)
        <div className="image-placeholder parchment-placeholder">
          <div className="parchment-overlay"></div>
          <div className="placeholder-content">
            <span className="terrain-icon">{getTerrainIcon(location.terrain)}</span>
            <span className="location-terrain">{location.terrain}</span>
          </div>
        </div>
      )}
      <div className="location-info">
        <h2 className="location-name">{location.name}</h2>
        <span className="location-coords">
          ({location.coordinates.x}, {location.coordinates.y})
        </span>
      </div>
    </section>
  );
}

/**
 * Get an appropriate icon for the terrain type
 */
function getTerrainIcon(terrain: string): string {
  const terrainIcons: Record<string, string> = {
    village: "🏘️",
    forest: "🌲",
    mountain: "⛰️",
    plains: "🌾",
    desert: "🏜️",
    swamp: "🌿",
    coast: "🌊",
    cave: "🕳️",
    ruins: "🏛️",
    castle: "🏰",
    town: "🏙️",
    road: "🛤️",
  };
  return terrainIcons[terrain.toLowerCase()] || "📍";
}
