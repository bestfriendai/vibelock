import React, { useEffect, useCallback } from "react";
import { StyleSheet, View, Dimensions, ActivityIndicator } from "react-native";
import { GestureDetector, Gesture, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDecay,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

interface ZoomableImageProps {
  uri: string;
  width?: number;
  height?: number;
  minZoom?: number;
  maxZoom?: number;
  doubleTapScale?: number;
  onZoomChange?: (scale: number) => void;
  onLoad?: () => void;
  onError?: (error: string) => void;
  accessible?: boolean;
  accessibilityLabel?: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export const ZoomableImage: React.FC<ZoomableImageProps> = ({
  uri,
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT,
  minZoom = 1,
  maxZoom = 4,
  doubleTapScale = 2,
  onZoomChange,
  onLoad,
  onError,
  accessible = true,
  accessibilityLabel = "Zoomable image",
}) => {
  const scale = useSharedValue(1);
  const lastScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const lastTranslateX = useSharedValue(0);
  const lastTranslateY = useSharedValue(0);
  const isZooming = useSharedValue(false);
  const isPanning = useSharedValue(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Calculate bounds for panning
  const getMaxTranslate = useCallback(
    (currentScale: number) => {
      const scaledWidth = width * currentScale;
      const scaledHeight = height * currentScale;
      const maxX = Math.max(0, (scaledWidth - width) / 2);
      const maxY = Math.max(0, (scaledHeight - height) / 2);
      return { maxX, maxY };
    },
    [width, height],
  );

  // Reset to initial state
  const reset = useCallback(() => {
    "worklet";
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    lastScale.value = 1;
    lastTranslateX.value = 0;
    lastTranslateY.value = 0;
  }, []);

  // Constrain translation to bounds
  const constrainTranslation = useCallback(
    (x: number, y: number, currentScale: number) => {
      "worklet";
      const { maxX, maxY } = getMaxTranslate(currentScale);
      const constrainedX = Math.max(-maxX, Math.min(maxX, x));
      const constrainedY = Math.max(-maxY, Math.min(maxY, y));
      return { x: constrainedX, y: constrainedY };
    },
    [getMaxTranslate],
  );

  // Pinch gesture handler
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      isZooming.value = true;
      lastScale.value = scale.value;
    })
    .onUpdate((event) => {
      const newScale = Math.max(minZoom, Math.min(maxZoom, lastScale.value * event.scale));
      scale.value = newScale;

      // Adjust translation to keep zoom centered
      if (newScale > 1) {
        const { x, y } = constrainTranslation(translateX.value, translateY.value, newScale);
        translateX.value = x;
        translateY.value = y;
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }

      if (onZoomChange) {
        runOnJS(onZoomChange)(newScale);
      }
    })
    .onEnd(() => {
      isZooming.value = false;
      lastScale.value = scale.value;

      // Snap back to min zoom if below threshold
      if (scale.value < minZoom * 1.1) {
        reset();
      }
    });

  // Pan gesture handler
  const panGesture = Gesture.Pan()
    .onStart(() => {
      isPanning.value = true;
      lastTranslateX.value = translateX.value;
      lastTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      if (scale.value > 1) {
        const { x, y } = constrainTranslation(
          lastTranslateX.value + event.translationX,
          lastTranslateY.value + event.translationY,
          scale.value,
        );
        translateX.value = x;
        translateY.value = y;
      }
    })
    .onEnd((event) => {
      isPanning.value = false;

      if (scale.value > 1) {
        // Add momentum with decay
        const { x: finalX, y: finalY } = constrainTranslation(
          translateX.value + event.velocityX * 0.1,
          translateY.value + event.velocityY * 0.1,
          scale.value,
        );

        translateX.value = withDecay({
          velocity: event.velocityX,
          deceleration: 0.995,
          clamp: [-getMaxTranslate(scale.value).maxX, getMaxTranslate(scale.value).maxX],
        });
        translateY.value = withDecay({
          velocity: event.velocityY,
          deceleration: 0.995,
          clamp: [-getMaxTranslate(scale.value).maxY, getMaxTranslate(scale.value).maxY],
        });
      }

      lastTranslateX.value = translateX.value;
      lastTranslateY.value = translateY.value;
    })
    .minPointers(1)
    .maxPointers(2);

  // Double tap handler
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((event) => {
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);

      if (scale.value > 1) {
        // Reset zoom
        reset();
        if (onZoomChange) {
          runOnJS(onZoomChange)(1);
        }
      } else {
        // Zoom in to double tap location
        const targetScale = Math.min(doubleTapScale, maxZoom);
        scale.value = withSpring(targetScale);
        lastScale.value = targetScale;

        // Center on tap location
        const centerX = (event.x - width / 2) * (targetScale - 1);
        const centerY = (event.y - height / 2) * (targetScale - 1);
        const { x, y } = constrainTranslation(-centerX, -centerY, targetScale);

        translateX.value = withSpring(x);
        translateY.value = withSpring(y);
        lastTranslateX.value = x;
        lastTranslateY.value = y;

        if (onZoomChange) {
          runOnJS(onZoomChange)(targetScale);
        }
      }
    });

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
    };
  });

  // Handle image load
  const handleLoad = useCallback(() => {
    setLoading(false);
    onLoad?.();
  }, [onLoad]);

  // Handle image error
  const handleError = useCallback(
    (error: any) => {
      setLoading(false);
      const errorMessage = error?.message || "Failed to load image";
      setError(errorMessage);
      onError?.(errorMessage);
    },
    [onError],
  );

  // Reset on URI change
  useEffect(() => {
    reset();
    setLoading(true);
    setError(null);
  }, [uri, reset]);

  if (error) {
    return (
      <View style={[styles.container, { width, height }]}>
        <View style={styles.errorContainer}>
          <Animated.Text style={styles.errorText}>Failed to load image</Animated.Text>
        </View>
      </View>
    );
  }

  // Compose gestures
  const composedGesture = Gesture.Simultaneous(doubleTapGesture, Gesture.Simultaneous(pinchGesture, panGesture));

  return (
    <GestureHandlerRootView style={[styles.container, { width, height }]}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.container, { width, height }]}>
          <Animated.View style={[styles.imageContainer, animatedStyle]}>
            <Image
              source={{ uri }}
              style={{ width, height }}
              contentFit="contain"
              onLoad={handleLoad}
              onError={handleError}
              accessible={accessible}
              accessibilityLabel={accessibilityLabel}
              accessibilityHint="Pinch to zoom, double tap to toggle zoom"
              transition={200}
            />
            {loading && (
              <View style={[styles.loadingOverlay, { width, height }]}>
                <ActivityIndicator size="large" color="white" />
              </View>
            )}
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  imageContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  errorText: {
    color: "white",
    fontSize: 16,
  },
});
