import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  AccessibilityInfo,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import * as Haptics from "expo-haptics";
import { PlaybackRate } from "../types";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  interpolate,
} from "react-native-reanimated";
import { formatDuration } from "../utils/audioUtils";

interface AudioControlsProps {
  messageId: string;
  audioUri: string;
  duration?: number;
  buttonSize?: number;
  primaryColor?: string;
  secondaryColor?: string;
  showProgressBar?: boolean;
  showTimeDisplay?: boolean;
  showPlaybackRate?: boolean;
  showVolumeControl?: boolean;
  orientation?: "horizontal" | "vertical";
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  onError?: (error: string) => void;
  accessible?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const AudioControls: React.FC<AudioControlsProps> = ({
  messageId,
  audioUri,
  duration: initialDuration = 0,
  buttonSize = 48,
  primaryColor = "#007AFF",
  secondaryColor = "#E5E5E7",
  showProgressBar = true,
  showTimeDisplay = true,
  showPlaybackRate = true,
  showVolumeControl = false,
  orientation = "horizontal",
  onPlaybackStart,
  onPlaybackEnd,
  onError,
  accessible = true,
}) => {
  const {
    isPlaying,
    isPaused,
    isLoading,
    currentTime,
    duration,
    progress,
    error,
    playbackRate,
    play,
    pause,
    resume,
    stop,
    seek,
    setPlaybackRate,
    togglePlayPause,
    retry,
  } = useAudioPlayer({
    messageId,
    audioUri,
    duration: initialDuration,
    onPlaybackStart,
    onPlaybackEnd,
    onError,
  });

  const buttonScale = useSharedValue(1);
  const playbackRateScale = useSharedValue(1);

  const playbackRates: PlaybackRate[] = [0.5, 1, 1.5, 2];

  const handlePlayPausePress = async () => {
    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Animate button press
    buttonScale.value = withSpring(0.9, { duration: 100 }, () => {
      buttonScale.value = withSpring(1, { duration: 100 });
    });

    await togglePlayPause();
  };

  const handleSeek = (value: number) => {
    seek(value);
  };

  const handleSeekEnd = async () => {
    await Haptics.selectionAsync();
  };

  const handlePlaybackRateChange = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Animate rate button press
    playbackRateScale.value = withSpring(0.9, { duration: 100 }, () => {
      playbackRateScale.value = withSpring(1, { duration: 100 });
    });

    const currentIndex = playbackRates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % playbackRates.length;
    await setPlaybackRate(playbackRates[nextIndex]);
  };

  const handleRetry = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await retry();
  };

  const playButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  const playbackRateAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: playbackRateScale.value }],
    };
  });

  const iconName = useMemo(() => {
    if (isLoading) return null;
    if (isPlaying) return "pause";
    return "play";
  }, [isLoading, isPlaying]);

  const accessibilityLabel = useMemo(() => {
    if (!accessible) return undefined;
    if (isLoading) return "Loading audio";
    if (isPlaying) return "Pause audio";
    return "Play audio";
  }, [accessible, isLoading, isPlaying]);

  const progressAccessibilityLabel = useMemo(() => {
    if (!accessible || !showProgressBar) return undefined;
    const currentFormatted = formatDuration(currentTime);
    const totalFormatted = formatDuration(duration);
    return `Audio progress: ${currentFormatted} of ${totalFormatted}`;
  }, [accessible, showProgressBar, currentTime, duration]);

  const containerStyle = [
    styles.container,
    orientation === "vertical" && styles.containerVertical,
  ];

  const controlsStyle = [
    styles.controls,
    orientation === "vertical" && styles.controlsVertical,
  ];

  if (error) {
    return (
      <View style={containerStyle}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={handleRetry}
            style={[styles.retryButton, { backgroundColor: primaryColor }]}
            accessible={accessible}
            accessibilityLabel="Retry loading audio"
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <View style={controlsStyle}>
        <AnimatedPressable
          onPress={handlePlayPausePress}
          style={[
            styles.playButton,
            playButtonAnimatedStyle,
            {
              width: buttonSize,
              height: buttonSize,
              backgroundColor: primaryColor,
            },
          ]}
          accessible={accessible}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
        >
          {isLoading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Ionicons name={iconName} size={buttonSize * 0.5} color="white" />
          )}
        </AnimatedPressable>

        {showTimeDisplay && (
          <View style={styles.timeDisplay}>
            <Text style={[styles.timeText, { color: primaryColor }]}>
              {formatDuration(currentTime)}
            </Text>
            <Text style={styles.timeSeparator}>/</Text>
            <Text style={styles.timeText}>{formatDuration(duration)}</Text>
          </View>
        )}

        {showPlaybackRate && (
          <AnimatedPressable
            onPress={handlePlaybackRateChange}
            style={[
              styles.rateButton,
              playbackRateAnimatedStyle,
              { borderColor: primaryColor },
            ]}
            accessible={accessible}
            accessibilityLabel={`Playback rate: ${playbackRate}x`}
            accessibilityRole="button"
            accessibilityHint="Tap to change playback speed"
          >
            <Text style={[styles.rateText, { color: primaryColor }]}>
              {playbackRate}x
            </Text>
          </AnimatedPressable>
        )}
      </View>

      {showProgressBar && (
        <View style={styles.progressContainer}>
          <Slider
            style={styles.progressBar}
            value={progress}
            onValueChange={handleSeek}
            onSlidingComplete={handleSeekEnd}
            minimumValue={0}
            maximumValue={1}
            minimumTrackTintColor={primaryColor}
            maximumTrackTintColor={secondaryColor}
            thumbTintColor={primaryColor}
            accessible={accessible}
            accessibilityLabel={progressAccessibilityLabel}
            accessibilityRole="adjustable"
            accessibilityHint="Drag to seek audio position"
          />
        </View>
      )}

      {showVolumeControl && (
        <View style={styles.volumeContainer}>
          <Ionicons name="volume-low" size={20} color={secondaryColor} />
          <Slider
            style={styles.volumeSlider}
            value={1}
            minimumValue={0}
            maximumValue={1}
            minimumTrackTintColor={primaryColor}
            maximumTrackTintColor={secondaryColor}
            thumbTintColor={primaryColor}
            accessible={accessible}
            accessibilityLabel="Volume control"
            accessibilityRole="adjustable"
          />
          <Ionicons name="volume-high" size={20} color={primaryColor} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },
  containerVertical: {
    alignItems: "center",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  controlsVertical: {
    flexDirection: "column",
    gap: 16,
  },
  playButton: {
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timeDisplay: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 80,
  },
  timeText: {
    fontSize: 14,
    fontFamily: "System",
    fontVariant: ["tabular-nums"],
  },
  timeSeparator: {
    fontSize: 14,
    color: "#999",
    marginHorizontal: 4,
  },
  rateButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  rateText: {
    fontSize: 14,
    fontWeight: "600",
  },
  progressContainer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  progressBar: {
    width: "100%",
    height: 40,
  },
  volumeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  volumeSlider: {
    flex: 1,
    height: 40,
  },
  errorContainer: {
    padding: 12,
    backgroundColor: "#FFE5E5",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorText: {
    flex: 1,
    color: "#CC0000",
    fontSize: 14,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginLeft: 8,
  },
  retryButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
});