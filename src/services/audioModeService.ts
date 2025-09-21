import { setAudioModeAsync, requestRecordingPermissionsAsync, getRecordingPermissionsAsync } from "expo-audio";
import { Platform } from "react-native";

/**
 * Centralized service for managing audio mode configuration
 * Ensures consistent settings across recording and playback
 */
class AudioModeService {
  private currentMode: "recording" | "playback" | "idle" = "idle";
  private isConfigured = false;

  /**
   * Configure audio mode for recording
   */
  async configureForRecording(): Promise<void> {
    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: Platform.OS === "ios",
        interruptionMode: "doNotMix",
        interruptionModeAndroid: "doNotMix",
        shouldRouteThroughEarpiece: false,
      });

      this.currentMode = "recording";
      this.isConfigured = true;
    } catch (error) {
      console.error("Failed to configure audio mode for recording:", error);
      throw error;
    }
  }

  /**
   * Configure audio mode for playback
   */
  async configureForPlayback(): Promise<void> {
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: "duckOthers",
        interruptionModeAndroid: "duckOthers",
        shouldRouteThroughEarpiece: false,
      });

      this.currentMode = "playback";
      this.isConfigured = true;
    } catch (error) {
      console.error("Failed to configure audio mode for playback:", error);
      throw error;
    }
  }

  /**
   * Reset audio mode to idle state
   */
  async resetToIdle(): Promise<void> {
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: "mixWithOthers",
        interruptionModeAndroid: "duckOthers",
        shouldRouteThroughEarpiece: false,
      });

      this.currentMode = "idle";
    } catch (error) {
      console.error("Failed to reset audio mode:", error);
    }
  }

  /**
   * Get current audio mode
   */
  getCurrentMode(): "recording" | "playback" | "idle" {
    return this.currentMode;
  }

  /**
   * Check if audio mode is configured
   */
  isAudioModeConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Switch between recording and playback modes
   */
  async switchMode(mode: "recording" | "playback" | "idle"): Promise<void> {
    if (this.currentMode === mode) {
      return;
    }

    switch (mode) {
      case "recording":
        await this.configureForRecording();
        break;
      case "playback":
        await this.configureForPlayback();
        break;
      case "idle":
        await this.resetToIdle();
        break;
    }
  }

  /**
   * Request microphone permissions
   */
  async requestMicrophonePermissions(): Promise<boolean> {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      return granted;
    } catch (error) {
      console.error("Failed to request microphone permissions:", error);
      return false;
    }
  }

  /**
   * Check if microphone permissions are granted
   */
  async hasMicrophonePermissions(): Promise<boolean> {
    try {
      const { granted } = await getRecordingPermissionsAsync();
      return granted;
    } catch (error) {
      console.error("Failed to check microphone permissions:", error);
      return false;
    }
  }
}

export default new AudioModeService();
