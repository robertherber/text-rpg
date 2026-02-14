import React, { useState, useEffect } from "react";

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

/**
 * ImagePanel - Displays the current location image with loading state.
 *
 * Features:
 * - Displays current location image from /api/game/image/:id
 * - Shows loading spinner while image generates
 * - Updates automatically when location changes
 * - Falls back to terrain placeholder when no image available
 */
export default function ImagePanel({ location }: ImagePanelProps) {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Load image when location changes
  useEffect(() => {
    if (!location.id) return;

    const loadImage = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/game/image/${location.id}`);
        const data = (await response.json()) as { imageUrl?: string };
        if (data.imageUrl) {
          setImageUrl(data.imageUrl);
        } else {
          // Clear image if none available
          setImageUrl("");
        }
      } catch (err) {
        console.error("Failed to load image:", err);
        setImageUrl("");
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [location.id]);

  return (
    <section className="image-panel">
      {isLoading ? (
        <div className="image-loading">
          <div className="loading-spinner"></div>
          <p>Generating scene...</p>
        </div>
      ) : imageUrl ? (
        <img src={imageUrl} alt={location.name} className="location-image" />
      ) : (
        <div className="image-placeholder">
          <span className="location-terrain">{location.terrain}</span>
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
