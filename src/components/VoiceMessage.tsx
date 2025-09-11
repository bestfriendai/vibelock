import React, { useState, useRef, useEffect } from "react";
import { View, Pressable, Text, Alert } from "react-native";
import {
  useAudioRecorder,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorderState,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
  type RecordingOptions,
} from "expo-audio";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../providers/ThemeProvider";

interface VoiceMessageProps {
  audioUri?: string;
  duration?: number;
  onSend?: (audioUri: string, duration: number) => void;
  isRecording?: boolean;
  isPlaying?: boolean;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  showWaveform?: boolean;
}

export const VoiceMessage: React.FC<VoiceMessageProps> = ({
  audioUri,
  duration = 0,
  onSend,
  isRecording = false,
  onStartRecording,
  onStopRecording,
  onPlay,
  onPause,
  showWaveform = true,
}) => {
  const { colors } = useTheme();
  const recordingOptions: RecordingOptions = RecordingPresets.HIGH_QUALITY || {
    extension: ".m4a",
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
    android: {
      outputFormat: "mpeg4",
      audioEncoder: "aac",
    },
    ios: {
      outputFormat: "aac ",
      audioQuality: 127,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
  };
  const recorder = useAudioRecorder(recordingOptions);
  const recorderState = useAudioRecorderState(recorder);
  const player = useAudioPlayer(audioUri || null);
  const playerStatus = useAudioPlayerStatus(player);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const scale = useSharedValue(1);
  const waveformOpacity = useSharedValue(0);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);

  // Animation for recording button
  const recordingAnimation = useSharedValue(0);

  useEffect(() => {
    if (isRecording) {
      recordingAnimation.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
    } else {
      recordingAnimation.value = withTiming(0);
    }
  }, [isRecording]);

  // Set up permissions on mount
  useEffect(() => {
    const setupAudio = async () => {
      const { status } = await requestRecordingPermissionsAsync();
      if (status !== "granted") {
        console.log("Recording permission not granted");
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    };
    setupAudio();
  }, []);

  const startRecording = async () => {
    try {
      const { status } = await requestRecordingPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please grant microphone permission to record voice messages.");
        return;
      }

      await recorder.prepareToRecordAsync();
      recorder.record();

      setRecordingDuration(0);

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Animation
      scale.value = withSpring(1.2);
      waveformOpacity.value = withTiming(1);

      // Timer for duration
      recordingTimer.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      onStartRecording?.();
    } catch (err) {
      console.error("Failed to start recording", err);
      Alert.alert("Error", "Failed to start recording. Please try again.");
    }
  };

  const stopRecording = async () => {
    try {
      await recorder.stop();

      const uri = recorder.uri;
      if (uri && recordingDuration > 1) {
        onSend?.(uri, recordingDuration);
      }

      scale.value = withSpring(1);
      waveformOpacity.value = withTiming(0);

      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onStopRecording?.();
    } catch (error) {
      console.error("Failed to stop recording", error);
    }
  };

  const playAudio = () => {
    if (!audioUri) return;

    try {
      player.play();
      onPlay?.();
    } catch (error) {
      console.error("Failed to play audio", error);
    }
  };

  const pauseAudio = () => {
    try {
      player.pause();
      onPause?.();
    } catch (error) {
      console.error("Failed to pause audio", error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const recordingButtonStyle = useAnimatedStyle(() => {
    const animatedScale = interpolate(recordingAnimation.value, [0, 1], [1, 1.1]);

    return {
      transform: [{ scale: scale.value * animatedScale }],
    };
  });

  const waveformStyle = useAnimatedStyle(() => ({
    opacity: waveformOpacity.value,
  }));

  // Recording UI
  if (!audioUri) {
    return (
      <View className="flex-row items-center">
        <Animated.View style={recordingButtonStyle}>
          <Pressable
            onPressIn={startRecording}
            onPressOut={stopRecording}
            className="w-12 h-12 rounded-full items-center justify-center"
            style={{
              backgroundColor: recorderState.isRecording ? colors.brand.red : colors.brand.red,
            }}
          >
            <Ionicons name={recorderState.isRecording ? "stop" : "mic"} size={24} color="white" />
          </Pressable>
        </Animated.View>

        {recorderState.isRecording && (
          <View className="ml-3 flex-1">
            <Text className="font-mono text-base" style={{ color: colors.brand.red }}>
              {formatDuration(Math.floor(recorderState.durationMillis / 1000))}
            </Text>
            <Text className="text-xs" style={{ color: colors.text.muted }}>
              Recording...
            </Text>

            {showWaveform && (
              <Animated.View style={[waveformStyle, { flexDirection: "row", alignItems: "center", marginTop: 8 }]}>
                {Array.from({ length: 20 }).map((_, index) => (
                  <View
                    key={index}
                    className="w-1 bg-red-500 rounded-full mr-1"
                    style={{
                      height: Math.random() * 20 + 5,
                      opacity: Math.random() * 0.8 + 0.2,
                    }}
                  />
                ))}
              </Animated.View>
            )}
          </View>
        )}
      </View>
    );
  }

  // Playback UI
  const progress = playerStatus.duration > 0 ? playerStatus.currentTime / playerStatus.duration : 0;

  return (
    <View className="flex-row items-center p-3 rounded-lg" style={{ backgroundColor: colors.surface[700] }}>
      <Pressable
        onPress={playerStatus.playing ? pauseAudio : playAudio}
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: colors.brand.red }}
      >
        <Ionicons name={playerStatus.playing ? "pause" : "play"} size={20} color="white" />
      </Pressable>

      <View className="flex-1">
        {/* Progress Bar */}
        <View className="h-1 rounded-full mb-1" style={{ backgroundColor: colors.surface[600] }}>
          <View
            className="h-1 rounded-full"
            style={{
              backgroundColor: colors.brand.red,
              width: `${progress * 100}%`,
            }}
          />
        </View>

        {/* Duration */}
        <Text className="text-xs" style={{ color: colors.text.muted }}>
          {formatDuration(playerStatus.currentTime)} / {formatDuration(duration)}
        </Text>
      </View>
    </View>
  );
};

export default VoiceMessage;
