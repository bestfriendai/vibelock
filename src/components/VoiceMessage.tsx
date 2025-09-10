import React, { useState, useRef, useEffect } from "react";
import { View, Pressable, Text, Alert } from "react-native";
import { Audio } from "expo-av";
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
  isPlaying = false,
  onStartRecording,
  onStopRecording,
  onPlay,
  onPause,
  showWaveform = true,
}) => {
  const { colors } = useTheme();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);

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

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permission Required", "Please grant microphone permission to record voice messages.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);

      setRecording(recording);
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
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();

      const uri = recording.getURI();
      if (uri && recordingDuration > 1) {
        onSend?.(uri, recordingDuration);
      }

      setRecording(null);
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

  const playAudio = async () => {
    if (!audioUri) return;

    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync({ uri: audioUri }, { shouldPlay: true });

      setSound(newSound);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPlaybackPosition(status.positionMillis || 0);
          setPlaybackDuration(status.durationMillis || 0);

          if (status.didJustFinish) {
            onPause?.();
          }
        }
      });

      onPlay?.();
    } catch (error) {
      console.error("Failed to play audio", error);
    }
  };

  const pauseAudio = async () => {
    if (sound) {
      await sound.pauseAsync();
      onPause?.();
    }
  };

  const formatDuration = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
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
              backgroundColor: isRecording ? colors.status.error : colors.brand.red,
            }}
          >
            <Ionicons name={isRecording ? "stop" : "mic"} size={24} color="white" />
          </Pressable>
        </Animated.View>

        {isRecording && (
          <View className="ml-3 flex-1">
            <Text className="font-mono text-base" style={{ color: colors.status.error }}>
              {formatDuration(recordingDuration * 1000)}
            </Text>
            <Text className="text-xs" style={{ color: colors.text.muted }}>
              Recording...
            </Text>

            {showWaveform && (
              <Animated.View style={[waveformStyle]} className="flex-row items-center mt-2">
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
  const progress = playbackDuration > 0 ? playbackPosition / playbackDuration : 0;

  return (
    <View className="flex-row items-center p-3 rounded-lg" style={{ backgroundColor: colors.surface[700] }}>
      <Pressable
        onPress={isPlaying ? pauseAudio : playAudio}
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: colors.brand.red }}
      >
        <Ionicons name={isPlaying ? "pause" : "play"} size={20} color="white" />
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
          {formatDuration(playbackPosition)} / {formatDuration(duration * 1000)}
        </Text>
      </View>
    </View>
  );
};

export default VoiceMessage;
