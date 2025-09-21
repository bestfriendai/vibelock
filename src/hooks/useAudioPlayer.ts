import { useEffect, useCallback, useMemo } from "react";
import { useAudioPlayerStore } from "../state/audioPlayerStore";
import { debounce } from "lodash";
import { AppState, AppStateStatus } from "react-native";

interface UseAudioPlayerOptions {
  messageId?: string;
  audioUri?: string;
  duration?: number;
  autoCleanup?: boolean;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  onError?: (error: string) => void;
}

interface UseAudioPlayerReturn {
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  error: string | null;
  isCurrentMessage: boolean;
  playbackRate: 0.5 | 1 | 1.5 | 2;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  seek: (position: number) => void;
  setPlaybackRate: (rate: 0.5 | 1 | 1.5 | 2) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  retry: () => Promise<void>;
}

export const useAudioPlayer = ({
  messageId,
  audioUri,
  duration: initialDuration = 0,
  autoCleanup = false,
  onPlaybackStart,
  onPlaybackEnd,
  onError,
}: UseAudioPlayerOptions = {}): UseAudioPlayerReturn => {
  const {
    currentMessageId,
    isPlaying,
    isPaused,
    isLoading,
    duration: storeDuration,
    currentTime,
    playbackRate,
    error,
    play: storePlay,
    pause: storePause,
    resume: storeResume,
    stop: storeStop,
    seek: storeSeek,
    setPlaybackRate: storeSetPlaybackRate,
    cleanup,
    setError,
  } = useAudioPlayerStore();

  const isCurrentMessage = messageId ? currentMessageId === messageId : false;
  const duration = isCurrentMessage ? storeDuration : initialDuration;
  const progress = duration > 0 ? currentTime / duration : 0;

  // Debounced seek function to prevent excessive seeking
  const debouncedSeek = useMemo(
    () =>
      debounce((position: number) => {
        storeSeek(position);
      }, 100),
    [storeSeek],
  );

  // Play function with error handling and retry logic
  const play = useCallback(async () => {
    if (!messageId || !audioUri) {
      setError("Missing message ID or audio URI");
      return;
    }

    try {
      await storePlay(messageId, audioUri, initialDuration);
      onPlaybackStart?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to play audio";
      setError(errorMessage);
      onError?.(errorMessage);

      // Automatic retry for transient failures
      setTimeout(() => {
        storePlay(messageId, audioUri, initialDuration).catch((retryErr) => {
          if (__DEV__) {
            console.error("Audio playback retry failed:", retryErr);
          }
        });
      }, 1000);
    }
  }, [messageId, audioUri, initialDuration, storePlay, setError, onPlaybackStart, onError]);

  // Pause function
  const pause = useCallback(async () => {
    if (isCurrentMessage) {
      await storePause();
    }
  }, [isCurrentMessage, storePause]);

  // Resume function
  const resume = useCallback(async () => {
    if (isCurrentMessage) {
      await storeResume();
    }
  }, [isCurrentMessage, storeResume]);

  // Stop function with cleanup
  const stop = useCallback(async () => {
    if (isCurrentMessage) {
      await storeStop();
      onPlaybackEnd?.();
    }
  }, [isCurrentMessage, storeStop, onPlaybackEnd]);

  // Seek function with validation
  const seek = useCallback(
    (position: number) => {
      if (isCurrentMessage && position >= 0 && position <= 1) {
        debouncedSeek(position);
      }
    },
    [isCurrentMessage, debouncedSeek],
  );

  // Set playback rate
  const setPlaybackRate = useCallback(
    async (rate: 0.5 | 1 | 1.5 | 2) => {
      await storeSetPlaybackRate(rate);
    },
    [storeSetPlaybackRate],
  );

  // Toggle play/pause
  const togglePlayPause = useCallback(async () => {
    if (!isCurrentMessage) {
      await play();
    } else if (isPlaying) {
      await pause();
    } else if (isPaused) {
      await resume();
    } else {
      await play();
    }
  }, [isCurrentMessage, isPlaying, isPaused, play, pause, resume]);

  // Retry function for error recovery
  const retry = useCallback(async () => {
    if (error && messageId && audioUri) {
      setError(null);
      await play();
    }
  }, [error, messageId, audioUri, setError, play]);

  // Handle playback completion
  useEffect(() => {
    if (isCurrentMessage && !isPlaying && !isPaused && !isLoading && currentTime > 0) {
      // Playback completed
      onPlaybackEnd?.();
    }
  }, [isCurrentMessage, isPlaying, isPaused, isLoading, currentTime, onPlaybackEnd]);

  // Handle app state changes (pause when app goes to background)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "background" && isCurrentMessage && isPlaying) {
        pause();
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isCurrentMessage, isPlaying, pause]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoCleanup) {
        debouncedSeek.cancel();
        if (isCurrentMessage) {
          cleanup();
        }
      }
    };
  }, [autoCleanup, isCurrentMessage, cleanup, debouncedSeek]);

  // Handle errors
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  return {
    isPlaying: isCurrentMessage ? isPlaying : false,
    isPaused: isCurrentMessage ? isPaused : false,
    isLoading: isCurrentMessage ? isLoading : false,
    currentTime: isCurrentMessage ? currentTime : 0,
    duration,
    progress,
    error: isCurrentMessage ? error : null,
    isCurrentMessage,
    playbackRate,
    play,
    pause,
    resume,
    stop,
    seek,
    setPlaybackRate,
    togglePlayPause,
    retry,
  };
};
