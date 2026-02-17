import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import type { TTSVoice } from "../shared/ttsTypes";

// Queue item for narration requests
interface NarrationQueueItem {
  text: string;
  voice: TTSVoice;
  instructions?: string;
}

// Context value interface
interface NarrationContextValue {
  // Current playback state
  isPlaying: boolean;
  currentText: string | null;

  // Playback control functions
  playNarration: (text: string, voice: TTSVoice, instructions?: string) => void;
  skipCurrent: () => void;

  // Music volume control callback (for ducking)
  setMusicVolume: (callback: (volume: number) => void) => void;
}

// Create context with default values
const NarrationContext = createContext<NarrationContextValue | null>(null);

// Provider props
interface NarrationProviderProps {
  children: React.ReactNode;
}

/**
 * NarrationProvider - Manages audio narration state and coordinates with background music.
 *
 * This provider handles:
 * - Queueing narration requests
 * - Coordinating playback (isPlaying, currentText)
 * - Providing skip functionality
 * - Music volume ducking coordination
 */
export function NarrationProvider({ children }: NarrationProviderProps) {
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentText, setCurrentText] = useState<string | null>(null);

  // Queue for narration requests
  const queueRef = useRef<NarrationQueueItem[]>([]);

  // Current audio element reference
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Music volume control callback
  const musicVolumeCallbackRef = useRef<((volume: number) => void) | null>(null);

  // Register the music volume callback
  const setMusicVolume = useCallback((callback: (volume: number) => void) => {
    musicVolumeCallbackRef.current = callback;
  }, []);

  // Process the next item in the queue
  const processQueue = useCallback(async () => {
    const item = queueRef.current[0];
    if (!item) {
      setIsPlaying(false);
      setCurrentText(null);
      // Restore music volume
      if (musicVolumeCallbackRef.current) {
        musicVolumeCallbackRef.current(1.0);
      }
      return;
    }

    setIsPlaying(true);
    setCurrentText(item.text);

    // Duck background music
    if (musicVolumeCallbackRef.current) {
      musicVolumeCallbackRef.current(0.2);
    }

    try {
      // Fetch audio from TTS API
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: item.text,
          voice: item.voice,
          instructions: item.instructions,
        }),
      });

      if (!response.ok) {
        console.error("TTS request failed:", response.status);
        // Remove from queue and process next
        queueRef.current.shift();
        processQueue();
        return;
      }

      // Create audio from response
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play audio element
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Handle playback end
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        queueRef.current.shift();
        processQueue();
      };

      // Handle playback error
      audio.onerror = () => {
        console.error("Audio playback error");
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        queueRef.current.shift();
        processQueue();
      };

      // Start playback
      await audio.play();
    } catch (error) {
      console.error("TTS playback error:", error);
      // Remove from queue and continue
      queueRef.current.shift();
      processQueue();
    }
  }, []);

  // Add narration to queue
  const playNarration = useCallback((text: string, voice: TTSVoice, instructions?: string) => {
    queueRef.current.push({ text, voice, instructions });

    // If not currently playing, start processing
    if (!isPlaying) {
      processQueue();
    }
  }, [isPlaying, processQueue]);

  // Skip current audio and move to next
  const skipCurrent = useCallback(() => {
    if (audioRef.current) {
      // Stop current audio - this will trigger onended which processes next item
      audioRef.current.pause();
      audioRef.current.currentTime = 0;

      // Clean up current audio
      const currentSrc = audioRef.current.src;
      audioRef.current = null;
      URL.revokeObjectURL(currentSrc);

      // Remove current item and process next
      queueRef.current.shift();
      processQueue();
    }
  }, [processQueue]);

  const contextValue: NarrationContextValue = {
    isPlaying,
    currentText,
    playNarration,
    skipCurrent,
    setMusicVolume,
  };

  return (
    <NarrationContext.Provider value={contextValue}>
      {children}
    </NarrationContext.Provider>
  );
}

/**
 * useNarration - Hook to access narration context.
 *
 * @returns NarrationContextValue with playback state and control functions
 * @throws Error if used outside of NarrationProvider
 */
export function useNarration(): NarrationContextValue {
  const context = useContext(NarrationContext);

  if (!context) {
    throw new Error("useNarration must be used within a NarrationProvider");
  }

  return context;
}
