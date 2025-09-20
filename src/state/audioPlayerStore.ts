import { create } from "zustand";
import { Audio, AVPlaybackStatus } from "expo-av";
import { subscribeWithSelector } from "zustand/middleware";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import audioModeService from "../services/audioModeService";

interface AudioPlayerState {
  currentMessageId: string | null;
  audioUri: string | null;
  sound: Audio.Sound | null;
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  duration: number;
  currentTime: number;
  playbackRate: 0.5 | 1 | 1.5 | 2;
  error: string | null;
  waveformData: number[] | null;
  progressInterval: NodeJS.Timeout | null;
}

interface AudioPlayerActions {
  play: (messageId: string, audioUri: string, duration: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  seek: (position: number) => Promise<void>;
  setPlaybackRate: (rate: 0.5 | 1 | 1.5 | 2) => Promise<void>;
  updateProgress: (currentTime: number) => void;
  setError: (error: string | null) => void;
  setWaveformData: (data: number[]) => void;
  cleanup: () => Promise<void>;
  reset: () => void;
  onPlaybackStatusUpdate: (status: AVPlaybackStatus) => void;
}

type AudioPlayerStore = AudioPlayerState & AudioPlayerActions;

const initialState: AudioPlayerState = {
  currentMessageId: null,
  audioUri: null,
  sound: null,
  isPlaying: false,
  isPaused: false,
  isLoading: false,
  duration: 0,
  currentTime: 0,
  playbackRate: 1,
  error: null,
  waveformData: null,
  progressInterval: null,
};

export const useAudioPlayerStore = create<AudioPlayerStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,

        play: async (messageId: string, audioUri: string, duration: number) => {
          const state = get();

          try {
            // Stop current playback if different message
            if (state.currentMessageId && state.currentMessageId !== messageId) {
              await get().stop();
            }

            // If same message and paused, just resume
            if (state.currentMessageId === messageId && state.isPaused) {
              await get().resume();
              return;
            }

            // Set loading state
            set({
              isLoading: true,
              error: null,
              currentMessageId: messageId,
              audioUri,
              duration,
            });

            // Configure audio mode for playback using centralized service
            await audioModeService.configureForPlayback();

            // Load and play audio
            const { sound } = await Audio.Sound.createAsync(
              { uri: audioUri },
              {
                shouldPlay: true,
                rate: state.playbackRate,
                progressUpdateIntervalMillis: 250,
              },
              (status) => get().onPlaybackStatusUpdate(status)
            );

            // Clear any existing interval before assigning a new one
            const existingInterval = get().progressInterval;
            if (existingInterval) {
              clearInterval(existingInterval);
            }

            // Start progress tracking using get().sound
            const progressInterval = setInterval(() => {
              const currentSound = get().sound;
              if (currentSound) {
                currentSound.getStatusAsync().then((status) => {
                  if (status.isLoaded && status.positionMillis !== undefined) {
                    get().updateProgress(status.positionMillis / 1000);
                  }
                });
              }
            }, 250);

            set({
              sound,
              isPlaying: true,
              isPaused: false,
              isLoading: false,
              progressInterval,
            });
          } catch (error) {
            console.error("Error playing audio:", error);
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : "Failed to play audio",
            });
          }
        },

        pause: async () => {
          const { sound } = get();
          if (!sound) return;

          try {
            await sound.pauseAsync();
            set({ isPlaying: false, isPaused: true });
          } catch (error) {
            console.error("Error pausing audio:", error);
            set({ error: error instanceof Error ? error.message : "Failed to pause audio" });
          }
        },

        resume: async () => {
          const { sound } = get();
          if (!sound) return;

          try {
            await sound.playAsync();
            set({ isPlaying: true, isPaused: false });
          } catch (error) {
            console.error("Error resuming audio:", error);
            set({ error: error instanceof Error ? error.message : "Failed to resume audio" });
          }
        },

        stop: async () => {
          const { sound, progressInterval } = get();

          if (progressInterval) {
            clearInterval(progressInterval);
          }

          if (sound) {
            try {
              await sound.stopAsync();
              await sound.unloadAsync();
            } catch (error) {
              console.error("Error stopping audio:", error);
            }
          }

          set({
            ...initialState,
            playbackRate: get().playbackRate, // Preserve playback rate preference
          });
        },

        seek: async (position: number) => {
          const { sound, duration } = get();
          if (!sound) return;

          try {
            const positionMillis = Math.max(0, Math.min(position * duration * 1000, duration * 1000));
            await sound.setPositionAsync(positionMillis);
            set({ currentTime: position * duration });
          } catch (error) {
            console.error("Error seeking audio:", error);
            set({ error: error instanceof Error ? error.message : "Failed to seek audio" });
          }
        },

        setPlaybackRate: async (rate: 0.5 | 1 | 1.5 | 2) => {
          const { sound } = get();

          try {
            if (sound) {
              await sound.setRateAsync(rate, true);
            }
            set({ playbackRate: rate });
          } catch (error) {
            console.error("Error setting playback rate:", error);
            set({ error: error instanceof Error ? error.message : "Failed to set playback rate" });
          }
        },

        updateProgress: (currentTime: number) => {
          set({ currentTime });
        },

        setError: (error: string | null) => {
          set({ error });
        },

        setWaveformData: (data: number[]) => {
          set({ waveformData: data });
        },

        cleanup: async () => {
          await get().stop();
        },

        reset: () => {
          const { progressInterval } = get();
          if (progressInterval) {
            clearInterval(progressInterval);
          }
          set(initialState);
        },

        onPlaybackStatusUpdate: (status: AVPlaybackStatus) => {
          if (!status.isLoaded) {
            if (status.error) {
              console.error("Playback error:", status.error);
              set({ error: status.error });
            }
            return;
          }

          const currentTime = (status.positionMillis || 0) / 1000;
          const duration = (status.durationMillis || 0) / 1000;

          set({
            currentTime,
            duration: duration || get().duration,
            isPlaying: status.isPlaying || false,
          });

          // Handle playback completion
          if (status.didJustFinish && !status.isLooping) {
            get().stop();
          }
        },
      }),
      {
        name: "audio-player-storage",
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          playbackRate: state.playbackRate,
        }),
      }
    )
  )
);