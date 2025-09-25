import React, { useState, useRef, useEffect } from "react";
import { View, Dimensions } from "react-native";
import { Image, ImageContentFit } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";

interface LazyImageProps {
  uri: string;
  width: number;
  height: number;
  contentFit?: ImageContentFit;
  placeholder?: string;
  blurhash?: string;
  priority?: "low" | "normal" | "high";
  onLoad?: () => void;
  onError?: () => void;
  style?: any;
  className?: string;
}

// Placeholder blurhash for loading state
const DEFAULT_BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";

export default function LazyImage({
  uri,
  width,
  height,
  contentFit = "cover",
  placeholder,
  blurhash = DEFAULT_BLURHASH,
  priority = "normal",
  onLoad,
  onError,
  style,
  className,
}: LazyImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority === "high");
  const viewRef = useRef<View>(null);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  // Intersection observer for lazy loading
  useEffect(() => {
    if (priority === "high" || isInView) return;

    let interval: NodeJS.Timeout;
    let timeout: NodeJS.Timeout;

    const checkVisibility = () => {
      if (viewRef.current) {
        try {
          viewRef.current.measure((x, y, width, height, pageX, pageY) => {
            try {
              const screenHeight = Dimensions.get("window").height;
              const isVisible = pageY < screenHeight + 200 && pageY + height > -200;

              if (isVisible && !isInView) {
                setIsInView(true);
                // Clear interval once visible
                if (interval) clearInterval(interval);
                if (timeout) clearTimeout(timeout);
              }
            } catch (error) {}
          });
        } catch (error) {}
      }
    };

    // Check visibility on mount and periodically
    interval = setInterval(checkVisibility, 500);
    // Also check after a short delay to catch initial render
    timeout = setTimeout(checkVisibility, 100);
    checkVisibility();

    return () => {
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, [isInView, priority]);

  const handleLoad = () => {
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withTiming(1, { duration: 300 });
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        {
          scale: interpolate(scale.value, [0.95, 1], [0.95, 1], Extrapolate.CLAMP),
        },
      ],
    };
  });

  const placeholderStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(opacity.value, [0, 1], [1, 0], Extrapolate.CLAMP),
    };
  });

  return (
    <View ref={viewRef} style={[{ width, height }, style]} className={className}>
      {/* Placeholder/Blurhash background */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#1a1a1a",
          },
          placeholderStyle,
        ]}
      >
        {blurhash && (
          <Image
            source={{ uri: `data:image/blurhash;base64,${blurhash}` }}
            style={{ width, height }}
            contentFit={contentFit}
          />
        )}
      </Animated.View>

      {/* Main image - only load when in view */}
      {(isInView || priority === "high") && !hasError && (
        <Animated.View style={animatedStyle}>
          <Image
            source={{
              uri,
              // Add cache control headers
              headers: {
                "Cache-Control": "max-age=3600",
              },
            }}
            style={{ width, height }}
            contentFit={contentFit}
            onLoad={handleLoad}
            onError={handleError}
            // Expo Image caching options
            cachePolicy="memory-disk"
            priority={priority}
            transition={200}
            // Placeholder while loading
            placeholder={placeholder || blurhash}
          />
        </Animated.View>
      )}

      {/* Error state */}
      {hasError && (
        <View
          style={{
            width,
            height,
            backgroundColor: "#2a2a2a",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              backgroundColor: "#666",
              borderRadius: 12,
            }}
          />
        </View>
      )}
    </View>
  );
}

// Higher-order component for easy integration
export function withLazyLoading<T extends { uri: string }>(Component: React.ComponentType<T>) {
  return function LazyLoadedComponent(props: T) {
    const [shouldLoad, setShouldLoad] = useState(false);
    const viewRef = useRef<View>(null);

    useEffect(() => {
      const checkVisibility = () => {
        if (viewRef.current) {
          viewRef.current.measure((x, y, width, height, pageX, pageY) => {
            const screenHeight = Dimensions.get("window").height;
            const isVisible = pageY < screenHeight + 100 && pageY + height > -100;

            if (isVisible) {
              setShouldLoad(true);
            }
          });
        }
      };

      const interval = setInterval(checkVisibility, 300);
      checkVisibility();

      return () => clearInterval(interval);
    }, []);

    if (!shouldLoad) {
      return (
        <View
          ref={viewRef}
          style={{
            backgroundColor: "#1a1a1a",
            minHeight: 100,
          }}
        />
      );
    }

    return <Component {...props} />;
  };
}

// Image preloader utility
export class ImagePreloader {
  private static cache = new Map<string, Promise<boolean>>();

  static preload(uris: string[]): Promise<boolean[]> {
    const promises = uris.map((uri) => {
      if (this.cache.has(uri)) {
        return this.cache.get(uri)!;
      }

      const promise = Image.prefetch(uri)
        .then(() => true)
        .catch(() => false);

      this.cache.set(uri, promise);
      return promise;
    });

    return Promise.all(promises);
  }

  static clearCache(): void {
    this.cache.clear();
    Image.clearMemoryCache();
    Image.clearDiskCache();
  }

  static getCacheSize(): number {
    return this.cache.size;
  }
}

// Memory management hook
export function useImageMemoryManagement() {
  useEffect(() => {
    const cleanup = () => {
      // Clear cache when app goes to background
      if (ImagePreloader.getCacheSize() > 50) {
        ImagePreloader.clearCache();
      }
    };

    // Cleanup on unmount
    return cleanup;
  }, []);
}
