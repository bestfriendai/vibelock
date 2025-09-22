import { create } from "zustand";
import { createAudioPlayer } from "expo-audio";
import type { AudioPlayer, AudioStatus } from "expo-audio";
import type { EventSubscription as Subscription } from "expo-modules-core";
import { subscribeWithSelector } from "zustand/middleware";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import audioModeService from "../services/audioModeService";

interface AudioPlayerState {
  currentMessageId: string | null;
  audioUri: string | null;
  player: AudioPlayer | null;
  statusSubscription: Subscription | null;
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  duration: number;
  currentTime: number;
  playbackRate: 0.5 | 1 | 1.5 | 2;
  error: string | null;
  waveformData: number[] | null;
}

interface AudioPlayerActions {
  play: (messageId: string, audioUri: string, duration: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  seek: (position: number) => Promise<void>;
  setPlaybackRate: (rate: 0.5 | 1 | 1.5 | 2) => Promise<void>;
  setError: (error: string | null) => void;
  setWaveformData: (data: number[]) => void;
  cleanup: () => Promise<void>;
  reset: () => void;
}

type AudioPlayerStore = AudioPlayerState & AudioPlayerActions;

const initialState: AudioPlayerState = {
  currentMessageId: null,
  audioUri: null,
  player: null,
  statusSubscription: null,
  isPlaying: false,
  isPaused: false,
  isLoading: false,
  duration: 0,
  currentTime: 0,
  playbackRate: 1,
  error: null,
  waveformData: null,
};

const waitForPlayerToLoad = (player: AudioPlayer, timeoutMs = 5000): Promise<void> => {
  if (player.isLoaded) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error("Timeout loading audio"));
      }
    }, timeoutMs);

    const checkLoaded = () => {
      if (player.isLoaded) {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          resolve();
        }
      } else if (!settled) {
        setTimeout(checkLoaded, 100);
      }
    };

    checkLoaded();
  });
};

const detachPlayer = async (player: AudioPlayer | null, subscription: Subscription | null) => {
  subscription?.remove();

  if (!player) {
    return;
  }

  try {
    player.pause();
  } catch (error) {
    // ignore pause errors
  }

  try {
    await player.seekTo(0);
  } catch (error) {
    // ignore seek errors
  }

  try {
    player.remove();
  } catch (error) {
    // ignore removal errors
  }
};

export const useAudioPlayerStore = create<AudioPlayerStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,

        play: async (messageId: string, audioUri: string, duration: number) => {
          try {
            const previousState = get();

            if (previousState.currentMessageId && previousState.currentMessageId !== messageId) {
              await get().stop();
            }

            const state = get();
            const existingPlayer = state.player;
            const existingSubscription = state.statusSubscription;
            const currentRate = state.playbackRate;

            if (state.currentMessageId === messageId && state.isPaused && existingPlayer) {
              existingPlayer.play();
              set({ isPlaying: true, isPaused: false, error: null });
              return;
            }

            set({
              isLoading: true,
              error: null,
              currentMessageId: messageId,
              audioUri,
              duration,
            });

            await audioModeService.configureForPlayback();

            let player = existingPlayer;
            let subscription = existingSubscription;

            if (!player || get().audioUri !== audioUri) {
              await detachPlayer(player, subscription);

              player = createAudioPlayer(audioUri, {
                updateInterval: 250,
                downloadFirst: true,
              });
              player.playbackRate = currentRate;

              subscription = player.addListener("playbackStatusUpdate", (status: AudioStatus) => {
                set((current) => ({
                  currentTime: status.currentTime ?? current.currentTime,
                  duration: status.duration || current.duration,
                  isPlaying: status.playing,
                  isPaused: !status.playing && status.isLoaded && !status.didJustFinish,
                }));

                if (status.didJustFinish && !status.loop) {
                  get()
                    .stop()
                    .catch(() => {});
                }
              });

              set({
                player,
                statusSubscription: subscription,
              });
            } else {
              player.playbackRate = currentRate;
              try {
                await player.seekTo(0);
              } catch (error) {
                // ignore seek errors when reusing the existing player
              }
            }

            await waitForPlayerToLoad(player);

            player.play();
            set({
              isPlaying: true,
              isPaused: false,
              isLoading: false,
              duration: duration || player.duration || get().duration,
            });
          } catch (error) {
            if (__DEV__) {
              console.error("Error playing audio:", error);
            }
            set({
              isLoading: false,
              isPlaying: false,
              isPaused: false,
              error: error instanceof Error ? error.message : "Failed to play audio",
            });
          }
        },

        pause: async () => {
          const { player } = get();
          if (!player) return;

          try {
            player.pause();
            set({ isPlaying: false, isPaused: true });
          } catch (error) {
            if (__DEV__) {
              console.error("Error pausing audio:", error);
            }
            set({ error: error instanceof Error ? error.message : "Failed to pause audio" });
          }
        },

        resume: async () => {
          const { player } = get();
          if (!player) return;

          try {
            player.play();
            set({ isPlaying: true, isPaused: false });
          } catch (error) {
            if (__DEV__) {
              console.error("Error resuming audio:", error);
            }
            set({ error: error instanceof Error ? error.message : "Failed to resume audio" });
          }
        },

        stop: async () => {
          const { player, statusSubscription, playbackRate } = get();

          await detachPlayer(player, statusSubscription);

          set({
            ...initialState,
            playbackRate,
          });
        },

        seek: async (position: number) => {
          const { player, duration } = get();
          if (!player || duration <= 0) return;

          try {
            const clampedPosition = Math.max(0, Math.min(position, 1));
            const targetSeconds = clampedPosition * duration;
            await player.seekTo(targetSeconds);
            set({ currentTime: targetSeconds });
          } catch (error) {
            if (__DEV__) {
              console.error("Error seeking audio:", error);
            }
            set({ error: error instanceof Error ? error.message : "Failed to seek audio" });
          }
        },

        setPlaybackRate: async (rate: 0.5 | 1 | 1.5 | 2) => {
          const { player } = get();

          try {
            if (player) {
              player.setPlaybackRate(rate);
            }
            set({ playbackRate: rate });
          } catch (error) {
            if (__DEV__) {
              console.error("Error setting playback rate:", error);
            }
            set({ error: error instanceof Error ? error.message : "Failed to set playback rate" });
          }
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
          const { player, statusSubscription } = get();
          void detachPlayer(player, statusSubscription);
          set(initialState);
        },
      }),
      {
        name: "audio-player-storage",
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          playbackRate: state.playbackRate,
        }),
      },
    ),
  ),
);
