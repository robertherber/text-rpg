import React, { useRef, useState, useEffect, useCallback } from "react";

interface BackgroundMusicProps {
  src: string;
  defaultVolume?: number;
}

/**
 * BackgroundMusic - Plays looping background music with volume control.
 *
 * Features:
 * - Loops automatically
 * - Mute/unmute toggle
 * - Volume slider
 * - Persists mute state to localStorage
 */
export default function BackgroundMusic({ src, defaultVolume = 0.3 }: BackgroundMusicProps) {
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

  const tryPlay = useCallback(() => {
    const audio = audioRef.current;
    if (audio && hasInteractedRef.current && !audio.muted) {
      audio.play().catch(() => {
        // Ignore autoplay errors - browser may still block
      });
    }
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
      audio.volume = volume;

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
