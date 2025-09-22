import React, { useEffect, useState } from "react";
import { View, Pressable, Text, Alert, Linking } from "react-native";
import {
  useAudioRecorder,
  useAudioRecorderState,
  requestRecordingPermissionsAsync,
  RecordingPresets,
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

import { WaveformVisualizer } from "./WaveformVisualizer";
import { AudioControls } from "./AudioControls";
import { VoiceMessageTranscription } from "./VoiceMessageTranscription";
import { formatDuration } from "../utils/audioUtils";
import audioAnalysisService from "../services/audioAnalysisService";
import audioModeService from "../services/audioModeService";

interface VoiceMessageProps {
  audioUri?: string;
  duration?: number;
  onSend?: (audioUri: string, duration: number) => void;
  isRecording?: boolean;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  showWaveform?: boolean;
  // New props for enhanced playback
  messageId?: string;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  showSeekBar?: boolean;
  showPlaybackRate?: boolean;
  enableTranscription?: boolean;
  transcription?: string;
  waveformData?: number[];
}

export const VoiceMessage: React.FC<VoiceMessageProps> = ({
  audioUri,
  duration = 0,
  onSend,
  isRecording = false,
  onStartRecording,
  onStopRecording,
  showWaveform = true,
  messageId,
  onPlaybackStart,
  onPlaybackEnd,
  showSeekBar = true,
  showPlaybackRate = false,
  enableTranscription = false,
  transcription,
  waveformData: initialWaveformData,
}) => {
  const { colors } = useTheme();

  // State for enhanced features
  const [localWaveformData, setLocalWaveformData] = useState<number[]>(initialWaveformData || []);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isLoadingWaveform, setIsLoadingWaveform] = useState(false);

  // Use high-quality preset for maximum SDK 54 compatibility
  const recorder = useAudioRecorder(
    RecordingPresets?.HIGH_QUALITY ||
      ({
        extension: ".m4a",
        sampleRate: 44100,
        numberOfChannels: 2,
        bitRate: 128000,
        audioEncoder: "aac",
        outputFormat: "mpeg4",
      } as any),
  );
  const recorderState = useAudioRecorderState(recorder);

  const scale = useSharedValue(1);
  const waveformOpacity = useSharedValue(0);

  // Animation for recording button
  const recordingAnimation = useSharedValue(0);

  useEffect(() => {
    if (isRecording || recorderState.isRecording) {
      recordingAnimation.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
    } else {
      recordingAnimation.value = withTiming(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, recorderState.isRecording]);

  // Load waveform data if not provided
  useEffect(() => {
    if (audioUri && !localWaveformData.length && !isLoadingWaveform) {
      setIsLoadingWaveform(true);
      audioAnalysisService
        .generateWaveformData(audioUri)
        .then((data) => {
          setLocalWaveformData(data);
        })
        .catch((err) => {})
        .finally(() => {
          setIsLoadingWaveform(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUri, localWaveformData.length]);

  // Monitor audio levels during recording
  useEffect(() => {
    if (recorderState.isRecording) {
      const interval = setInterval(() => {
        // Simulate audio level (in production, get from recorder metering)
        const level = Math.random() * 0.5 + 0.5;
        setAudioLevel(level);
      }, 100);

      return () => clearInterval(interval);
    }
    return undefined;
  }, [recorderState.isRecording]);

  // Set up permissions and audio mode on mount
  useEffect(() => {
    const setupAudio = async () => {
      try {
        const { status } = await requestRecordingPermissionsAsync();
        if (status !== "granted") {
          // Permission not granted - silently handle
        }

        // Use centralized audio mode service
        await audioModeService.configureForRecording();
      } catch (error) {
        // Audio setup failed - silently handle
      }
    };
    setupAudio();
    // Cleanup on unmount
    return () => {
      try {
        if (recorderState?.isRecording) {
          recorder.stop?.();
        }
      } catch (error) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    try {
      const { status, canAskAgain } = await requestRecordingPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Microphone Permission Needed", "Please allow microphone access to record voice messages.", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => Linking.openSettings?.(),
          },
        ]);
        if (canAskAgain) return; // user can retry later
        return;
      }

      await audioModeService.configureForRecording();
      await recorder.prepareToRecordAsync();
      recorder.record();

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Animation
      scale.value = withSpring(1.2);
      waveformOpacity.value = withTiming(1);

      onStartRecording?.();
    } catch (error) {
      Alert.alert("Error", "Failed to start recording. Please try again.");
    }
  };

  const stopRecording = async () => {
    try {
      await recorder.stop();

      const uri = recorder.uri;
      const durationSec = Math.max(0, Math.floor((recorderState?.durationMillis || 0) / 1000));
      if (uri && durationSec >= 1) {
        onSend?.(uri, durationSec);
      } else if (uri) {
        Alert.alert("Too Short", "Voice message must be at least 1 second long.");
      }

      scale.value = withSpring(1);
      waveformOpacity.value = withTiming(0);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onStopRecording?.();
    } catch (error) {
      Alert.alert("Error", "Failed to stop recording. Please try again.");
    }
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
              <Animated.View style={[waveformStyle, { marginTop: 8 }]}>
                <WaveformVisualizer
                  mode="recording"
                  audioLevel={audioLevel}
                  primaryColor={colors.brand.red}
                  secondaryColor={colors.surface[600]}
                  height={30}
                  barCount={20}
                  isPlaying={true}
                />
              </Animated.View>
            )}
          </View>
        )}
      </View>
    );
  }

  // Playback UI
  const effectiveDuration = duration;

  return (
    <View className="rounded-lg" style={{ backgroundColor: colors.surface[700] }}>
      {/* Use AudioControls component for playback UI */}
      <AudioControls
        messageId={messageId || ""}
        audioUri={audioUri || ""}
        duration={effectiveDuration}
        primaryColor={colors.brand.red}
        secondaryColor={colors.surface[600]}
        showProgressBar={showSeekBar}
        showTimeDisplay={true}
        showPlaybackRate={showPlaybackRate}
        onPlaybackStart={onPlaybackStart}
        onPlaybackEnd={onPlaybackEnd}
      />

      {/* Use VoiceMessageTranscription component */}
      {enableTranscription && (
        <VoiceMessageTranscription
          audioUri={audioUri || ""}
          messageId={messageId || ""}
          existingTranscription={transcription}
          autoTranscribe={false}
          showToggle={true}
          showCopyButton={true}
          showLanguageIndicator={true}
        />
      )}
    </View>
  );
};

export default VoiceMessage;
