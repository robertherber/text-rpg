import React, { useRef, useState, useEffect, useCallback } from "react";

interface BackgroundMusicProps {
  src: string;
  defaultVolume?: number;
  onVolumeControl?: (registerCallback: (multiplier: number) => void) => void;
}

/**
 * Duration for volume fade transitions in milliseconds
 */
const FADE_DURATION_MS = 300;

/**
 * Number of steps for smooth volume transitions
 */
const FADE_STEPS = 15;

/**
 * BackgroundMusic - Plays looping background music with volume control.
 *
 * Features:
 * - Loops automatically
 * - Mute/unmute toggle
 * - Volume slider
 * - Persists mute state to localStorage
 * - Supports external volume control for ducking (smooth 300ms transitions)
 */
export default function BackgroundMusic({ src, defaultVolume = 0.3, onVolumeControl }: BackgroundMusicProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasInteractedRef = useRef(false);
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem("bgMusicMuted");
    return saved === "true";
  });
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("bgMusicVolume");
    return saved ? parseFloat(saved) : defaultVolume;
  });

  // Track the target volume multiplier for ducking (1.0 = full, 0.2 = ducked)
  const volumeMultiplierRef = useRef(1.0);
  // Track the current actual multiplier (for smooth transitions)
  const currentMultiplierRef = useRef(1.0);
  // Track active fade animation
  const fadeAnimationRef = useRef<number | null>(null);

  const tryPlay = useCallback(() => {
    const audio = audioRef.current;
    if (audio && hasInteractedRef.current && !audio.muted) {
      audio.play().catch(() => {
        // Ignore autoplay errors - browser may still block
      });
    }
  }, []);

  /**
   * Smoothly transition volume to a target multiplier over FADE_DURATION_MS
   */
  const fadeToMultiplier = useCallback((targetMultiplier: number) => {
    // Cancel any ongoing fade
    if (fadeAnimationRef.current !== null) {
      cancelAnimationFrame(fadeAnimationRef.current);
    }

    const startMultiplier = currentMultiplierRef.current;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / FADE_DURATION_MS, 1);

      // Ease-out transition for smooth feel
      const easeOut = 1 - Math.pow(1 - progress, 2);
      const newMultiplier = startMultiplier + (targetMultiplier - startMultiplier) * easeOut;

      currentMultiplierRef.current = newMultiplier;

      // Apply to audio element
      const audio = audioRef.current;
      if (audio) {
        audio.volume = volume * newMultiplier;
      }

      // Continue animation if not complete
      if (progress < 1) {
        fadeAnimationRef.current = requestAnimationFrame(animate);
      } else {
        fadeAnimationRef.current = null;
        currentMultiplierRef.current = targetMultiplier;
      }
    };

    fadeAnimationRef.current = requestAnimationFrame(animate);
  }, [volume]);

  /**
   * Handle external volume control requests (for ducking during narration)
   */
  const handleVolumeMultiplier = useCallback((multiplier: number) => {
    volumeMultiplierRef.current = multiplier;
    fadeToMultiplier(multiplier);
  }, [fadeToMultiplier]);

  // Register the volume control callback with parent
  useEffect(() => {
    if (onVolumeControl) {
      onVolumeControl(handleVolumeMultiplier);
    }
  }, [onVolumeControl, handleVolumeMultiplier]);

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (fadeAnimationRef.current !== null) {
        cancelAnimationFrame(fadeAnimationRef.current);
      }
    };
  }, []);

  // Start playing after user interaction (browser autoplay policy)
  useEffect(() => {
    const handleInteraction = () => {
      if (hasInteractedRef.current) return;
      hasInteractedRef.current = true;
      tryPlay();
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
    };

    document.addEventListener("click", handleInteraction);
    document.addEventListener("keydown", handleInteraction);

    return () => {
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
    };
  }, [tryPlay]);

  // Handle audio element ready state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleCanPlay = () => {
      tryPlay();
    };

    audio.addEventListener("canplaythrough", handleCanPlay);
    return () => {
      audio.removeEventListener("canplaythrough", handleCanPlay);
    };
  }, [tryPlay]);

  // Update audio element when mute/volume changes
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.muted = isMuted;
      // Apply both user volume and current multiplier
      audio.volume = volume * currentMultiplierRef.current;

      if (!isMuted && hasInteractedRef.current) {
        tryPlay();
      }
    }
    localStorage.setItem("bgMusicMuted", String(isMuted));
    localStorage.setItem("bgMusicVolume", String(volume));
  }, [isMuted, volume, tryPlay]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  return (
    <div className="background-music">
      <audio
        ref={audioRef}
        src={src}
        loop
        preload="auto"
      />
      <button
        className="music-toggle"
        onClick={toggleMute}
        title={isMuted ? "Unmute music" : "Mute music"}
      >
        {isMuted ? "🔇" : "🎵"}
      </button>
      {!isMuted && (
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={handleVolumeChange}
          className="volume-slider"
          title="Volume"
        />
      )}
    </div>
  );
}
