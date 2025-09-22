import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from "react-native-reanimated";
import { BrowseStackParamList } from "../navigation/AppNavigator";
import { Review } from "../types";
import { shareService } from "../services/shareService";
import { useResponsiveScreen } from "../utils/responsive";
import { useTheme } from "../providers/ThemeProvider";

interface Props {
  review: Review;
  cardHeight?: number;
  onReport?: () => void;
  onLike?: () => void;
  isLiked?: boolean;
}

type Nav = NativeStackNavigationProp<BrowseStackParamList>;

function ProfileCard({ review, cardHeight = 280, onReport, onLike, isLiked = false }: Props) {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [videoThumbError, setVideoThumbError] = useState(false);
  const screenData = useResponsiveScreen();
  const { cardWidth } = screenData.responsive;

  // Animation values
  const scale = useSharedValue(1);
  const heartScale = useSharedValue(1);
  const reportScale = useSharedValue(1);
  const shareScale = useSharedValue(1);

  // Animated styles
  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedHeartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const animatedReportStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reportScale.value }],
  }));

  const animatedShareStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shareScale.value }],
  }));

  // Safety check: ensure review exists and has required properties
  if (!review || !review.id || !review.reviewedPersonName) {
    return null;
  }

  const navigateToReview = () => {
    navigation.navigate("ReviewDetail", { reviewId: review.id });
  };

  const handlePress = () => {
    "worklet";
    scale.value = withSpring(0.95);
    scale.value = withSpring(1);
    runOnJS(navigateToReview)();
  };

  const handleReport = (e: any) => {
    "worklet";
    e.stopPropagation();
    reportScale.value = withSpring(0.8, { duration: 100 });
    reportScale.value = withSpring(1, { duration: 100 });

    if (onReport) {
      runOnJS(onReport)();
    }
  };

  const handleLike = (e: any) => {
    "worklet";
    e.stopPropagation();
    heartScale.value = withSpring(0.7, { duration: 100 });
    heartScale.value = withSpring(1.2, { duration: 150 });
    heartScale.value = withSpring(1, { duration: 100 });

    if (onLike) {
      runOnJS(onLike)();
    }
  };

  const handleShare = async (e: any) => {
    e.stopPropagation();
    shareScale.value = withSpring(0.8, { duration: 100 });
    shareScale.value = withSpring(1, { duration: 100 });

    try {
      await shareService.shareReview(review);
    } catch (error) {
      // Log the error for diagnostics
      // You could show a toast or alert here if you have a toast service
      // For now, we'll just ensure the animation completes even on error
    }
  };

  // Get the image source - prefer first valid image in media, then profilePhoto, then placeholder
  const getImageSource = () => {
    // Prefer the first IMAGE in media with a valid https? URL
    const mediaArray = Array.isArray(review.media) ? review.media : [];
    const firstImage = mediaArray.find(
      (m) => m?.type === "image" && typeof m?.uri === "string" && /^https?:\/\//.test(m.uri),
    );
    if (firstImage?.uri) {
      return firstImage.uri;
    }

    // If no image found, try profilePhoto if it's a remote URL
    if (typeof review.profilePhoto === "string" && /^https?:\/\//.test(review.profilePhoto)) {
      return review.profilePhoto;
    }

    // Final fallback to placeholder
    const placeholder = `https://picsum.photos/${Math.floor(cardWidth)}/${cardHeight}?random=${review.id}`;
    return placeholder;
  };

  return (
    <Animated.View
      style={[
        animatedCardStyle,
        {
          width: cardWidth,
          height: cardHeight,
          overflow: "hidden",
          borderRadius: 16,
          marginBottom: 16,
          flex: 1,
        },
      ]}
    >
      <Pressable
        onPress={handlePress}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${review.reviewedPersonName || "Profile"} in ${review.reviewedPersonLocation?.city || "Unknown"}, ${review.reviewedPersonLocation?.state || "Unknown"}. Double tap to view details.`}
        style={{ flex: 1 }}
      >
        {/* Profile Media (Image or Video) */}
        {(() => {
          const mediaArray = Array.isArray(review.media) ? review.media : [];
          const firstImage = mediaArray.find(
            (m) => m?.type === "image" && typeof m?.uri === "string" && /^https?:\/\//.test(m.uri),
          );
          const firstVideo = mediaArray.find(
            (m) => m?.type === "video" && typeof m?.uri === "string" && /^https?:\/\//.test(m.uri),
          );

          if (firstImage) {
            return (
              <Image
                source={{ uri: firstImage.uri }}
                style={{ width: cardWidth, height: cardHeight }}
                contentFit="cover"
                transition={300}
                cachePolicy="memory-disk"
                onLoad={() => setImageLoaded(true)}
                placeholder="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
              />
            );
          }

          if (firstVideo) {
            // Prefer a real thumbnail image for videos if available
            const hasThumb =
              typeof firstVideo.thumbnailUri === "string" &&
              /^https?:\/\//.test(firstVideo.thumbnailUri) &&
              !videoThumbError;
            if (hasThumb) {
              return (
                <View style={{ width: cardWidth, height: cardHeight }}>
                  <Image
                    source={{ uri: firstVideo.thumbnailUri as string }}
                    style={{ width: cardWidth, height: cardHeight }}
                    contentFit="cover"
                    transition={300}
                    cachePolicy="memory-disk"
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setVideoThumbError(true)}
                    placeholder="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                  />
                  <View className="absolute inset-0 items-center justify-center">
                    <View className="bg-black/60 rounded-full p-3">
                      <Ionicons name="play" size={20} color="#FFFFFF" />
                    </View>
                  </View>
                </View>
              );
            }
            // For videos without thumbnails, show a placeholder with play button
            return (
              <View style={{ width: cardWidth, height: cardHeight }} className="bg-black">
                <View className="absolute inset-0 items-center justify-center">
                  <View className="bg-black/60 rounded-full p-3">
                    <Ionicons name="play" size={20} color="#FFFFFF" />
                  </View>
                </View>
              </View>
            );
          }

          // Fallback to profilePhoto or placeholder
          return (
            <Image
              source={{ uri: getImageSource() }}
              style={{ width: cardWidth, height: cardHeight }}
              contentFit="cover"
              transition={300}
              cachePolicy="memory-disk"
              onLoad={() => setImageLoaded(true)}
              placeholder="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
            />
          );
        })()}

        {/* Loading overlay: only for image branch */}
        {!imageLoaded && Array.isArray(review.media) && review.media.some((m) => m.type === "image") && (
          <View
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.surface[800],
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderWidth: 2,
                borderColor: "rgba(239,68,68,0.3)",
                borderTopColor: "#EF4444",
                borderRadius: 9999,
              }}
            />
          </View>
        )}

        {/* Gradient Overlay */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.8)"]}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: cardHeight * 0.6,
          }}
        />

        {/* Action Buttons - Top Right */}
        <View
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            flexDirection: "column",
          }}
        >
          {/* Share Button */}
          <Animated.View style={animatedShareStyle}>
            <Pressable
              onPress={handleShare}
              style={{
                backgroundColor: "rgba(0,0,0,0.6)",
                borderRadius: 9999,
                padding: 10,
              }}
              hitSlop={8}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Share this review"
            >
              <Ionicons name="share-outline" size={16} color="#FFFFFF" />
            </Pressable>
          </Animated.View>

          {/* Report Button */}
          <Animated.View style={animatedReportStyle}>
            <Pressable
              onPress={handleReport}
              style={{
                backgroundColor: "rgba(0,0,0,0.6)",
                borderRadius: 9999,
                padding: 10,
                marginTop: 8,
              }}
              hitSlop={8}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Report this review"
            >
              <Ionicons name="flag" size={16} color="#FFFFFF" />
            </Pressable>
          </Animated.View>
        </View>

        {/* Heart/Like Button - Top Left */}
        <Animated.View style={[animatedHeartStyle, { position: "absolute", top: 12, left: 12 }]}>
          <Pressable
            onPress={handleLike}
            style={{ backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 9999, padding: 10 }}
            hitSlop={8}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={isLiked ? "Unlike" : "Like"}
          >
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={16} color={isLiked ? "#EF4444" : "#FFFFFF"} />
          </Pressable>
        </Animated.View>

        {/* Content */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: 16,
          }}
        >
          <Text className="text-white text-lg font-bold mb-0.5" numberOfLines={1}>
            {review.reviewedPersonName}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginRight: 8 }}>
              <Ionicons name="location" size={12} color="#FFFFFF" />
              <Text className="text-white/90 text-xs ml-1" numberOfLines={1}>
                {review.reviewedPersonLocation?.city || "Unknown"}, {review.reviewedPersonLocation?.state || ""}
              </Text>
            </View>
          </View>

          {/* Review info with shadow for better visibility */}
          <View style={{ marginTop: 8, alignSelf: "flex-start" }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {/* Sentiment badge if available */}
              {review.sentiment && (
                <View
                  style={{
                    backgroundColor: colors.brand.red,
                    borderRadius: 9999,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text className="text-white text-sm font-bold capitalize">{review.sentiment}</Text>
                </View>
              )}
              {/* Comment indicator if available */}
              {review.reviewText && (
                <View
                  style={{
                    marginLeft: 8,
                    backgroundColor: "rgba(0,0,0,0.6)",
                    borderRadius: 9999,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={12} color="#FFFFFF" />
                  <Text className="text-white/90 text-xs ml-1">{review.reviewText.length > 50 ? "Long" : "Short"}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default React.memo(ProfileCard);
