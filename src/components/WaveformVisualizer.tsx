import React, { useEffect, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  interpolate,
  Extrapolation,
  useDerivedValue,
  runOnJS,
  SharedValue,
} from "react-native-reanimated";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";

interface WaveformVisualizerProps {
  mode: "recording" | "playback";
  waveformData?: number[];
  progress?: number;
  duration?: number;
  barCount?: number;
  primaryColor?: string;
  secondaryColor?: string;
  height?: number;
  onSeek?: (position: number) => void;
  isPlaying?: boolean;
  audioLevel?: number;
  showProgressIndicator?: boolean;
  accessible?: boolean;
}

const DEFAULT_BAR_COUNT = 25;
const MIN_BAR_HEIGHT = 4;

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  mode,
  waveformData = [],
  progress = 0,
  duration = 0,
  barCount = DEFAULT_BAR_COUNT,
  primaryColor = "#007AFF",
  secondaryColor = "#E5E5E7",
  height = 40,
  onSeek,
  isPlaying = false,
  audioLevel = 0,
  showProgressIndicator = true,
  accessible = true,
}) => {
  const progressAnimation = useSharedValue(progress);
  const audioLevelAnimation = useSharedValue(audioLevel);
  const playbackAnimation = useSharedValue(isPlaying ? 1 : 0);
  const containerWidth = useSharedValue(0);

  // Shared animation time value for worklets
  // Create a continuously animating value for wave effects
  const waveAnimation = useDerivedValue(() => {
    return withRepeat(withTiming(2 * Math.PI, { duration: 2000 }), -1, false);
  });

  // Generate normalized waveform data
  const normalizedWaveform = useMemo(() => {
    if (mode === "recording") {
      // Generate random heights for recording mode
      return Array.from({ length: barCount }, () => Math.random() * 0.3 + 0.2);
    }

    if (waveformData.length === 0) {
      // Default waveform pattern
      return Array.from({ length: barCount }, (_, i) => {
        const center = barCount / 2;
        const distance = Math.abs(i - center) / center;
        return 0.3 + (1 - distance) * 0.5 + Math.random() * 0.2;
      });
    }

    // Resample waveform data to match bar count
    const step = waveformData.length / barCount;
    return Array.from({ length: barCount }, (_, i) => {
      const index = Math.floor(i * step);
      return Math.max(0.2, Math.min(1, waveformData[index] || 0.3));
    });
  }, [mode, waveformData, barCount]);

  // Update progress animation
  useEffect(() => {
    progressAnimation.value = withTiming(progress, { duration: 250 });
  }, [progress]);

  // Update audio level for recording mode
  useEffect(() => {
    if (mode === "recording") {
      audioLevelAnimation.value = withSpring(audioLevel, {
        damping: 10,
        stiffness: 100,
      });
    }
  }, [audioLevel, mode, audioLevelAnimation]);

  // Update playback state animation
  useEffect(() => {
    playbackAnimation.value = withTiming(isPlaying ? 1 : 0, { duration: 200 });
  }, [isPlaying, playbackAnimation]);

  // Handle tap to seek
  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      if (mode === "playback" && onSeek && containerWidth.value > 0) {
        const normalizedPosition = Math.max(0, Math.min(1, event.x / containerWidth.value));

        runOnJS(onSeek)(normalizedPosition);
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      }
    })
    .enabled(mode === "playback" && !!onSeek);

  const bars = normalizedWaveform.map((_, index) => (
    <Bar
      key={index}
      index={index}
      barCount={barCount}
      height={height}
      mode={mode}
      normalizedWaveform={normalizedWaveform}
      audioLevelAnimation={audioLevelAnimation}
      playbackAnimation={playbackAnimation}
      waveAnimation={waveAnimation}
      progressAnimation={progressAnimation}
      progress={progress}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
    />
  ));

  // Progress indicator for playback mode
  const progressIndicatorStyle = useAnimatedStyle(() => {
    const position = interpolate(progressAnimation.value, [0, 1], [0, 100], Extrapolation.CLAMP);

    return {
      left: `${position}%`,
      opacity: showProgressIndicator && mode === "playback" ? 1 : 0,
    };
  });

  const accessibilityLabel = useMemo(() => {
    if (!accessible) return undefined;

    if (mode === "recording") {
      return "Voice recording waveform, showing audio levels";
    } else {
      const progressPercent = Math.round(progress * 100);
      return `Voice message waveform, ${progressPercent}% played. Tap to seek.`;
    }
  }, [mode, progress, accessible]);

  const accessibilityHint = useMemo(() => {
    if (!accessible || mode !== "playback") return undefined;
    return "Double tap to seek to a specific position in the audio";
  }, [mode, accessible]);

  return (
    <GestureDetector gesture={tapGesture}>
      <View
        style={[styles.container, { height }]}
        accessible={accessible}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole="adjustable"
        onLayout={(event) => {
          containerWidth.value = event.nativeEvent.layout.width;
        }}
      >
        <View style={styles.waveformContainer}>{bars}</View>

        {showProgressIndicator && mode === "playback" && (
          <Animated.View style={[styles.progressIndicator, progressIndicatorStyle]} pointerEvents="none">
            <View style={[styles.progressDot, { backgroundColor: primaryColor }]} />
          </Animated.View>
        )}
      </View>
    </GestureDetector>
  );
};

interface BarProps {
  index: number;
  barCount: number;
  height: number;
  mode: "recording" | "playback";
  normalizedWaveform: number[];
  audioLevelAnimation: SharedValue<number>;
  playbackAnimation: SharedValue<number>;
  waveAnimation: SharedValue<number>;
  progressAnimation: SharedValue<number>;
  progress: number;
  primaryColor: string;
  secondaryColor: string;
}

const Bar: React.FC<BarProps> = ({
  index,
  barCount,
  height,
  mode,
  normalizedWaveform,
  audioLevelAnimation,
  playbackAnimation,
  waveAnimation,
  progressAnimation,
  progress,
  primaryColor,
  secondaryColor,
}) => {
  const barHeight = (normalizedWaveform[index] || 0) * height;

  const animatedBarStyle = useAnimatedStyle(() => {
    let heightMultiplier = 1;
    let opacity = 1;

    if (mode === "recording") {
      // Animate bars based on audio level using shared animation value
      const waveOffset = Math.sin((index / barCount) * Math.PI * 2 + waveAnimation.value) * 0.1;
      heightMultiplier = interpolate(audioLevelAnimation.value + waveOffset, [0, 1], [0.5, 1.5], Extrapolation.CLAMP);

      // Pulsing opacity effect
      opacity = interpolate(audioLevelAnimation.value, [0, 0.5, 1], [0.6, 0.8, 1], Extrapolation.CLAMP);
    } else if (mode === "playback") {
      // Highlight bars based on progress
      const barProgress = index / barCount;
      const isActive = barProgress <= progressAnimation.value;

      opacity = isActive ? 1 : 0.3;

      // Subtle bounce effect for active bars using shared animation value
      if (isActive && playbackAnimation.value > 0) {
        heightMultiplier = 1 + Math.sin(waveAnimation.value * 4 + index * 0.2) * 0.05;
      }
    }

    const isBeforeProgress = index / barCount <= progress;
    const barColor = mode === "playback" && isBeforeProgress ? primaryColor : secondaryColor;

    return {
      height: barHeight * heightMultiplier,
      opacity,
      backgroundColor: barColor,
      transform: [
        {
          scaleY: withSpring(heightMultiplier, {
            damping: 15,
            stiffness: 150,
          }),
        },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          minHeight: MIN_BAR_HEIGHT,
        },
        animatedBarStyle,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    justifyContent: "center",
    overflow: "hidden",
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  bar: {
    flex: 1,
    marginHorizontal: 1,
    borderRadius: 2,
  },
  progressIndicator: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
});
