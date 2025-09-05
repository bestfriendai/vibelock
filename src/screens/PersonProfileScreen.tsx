import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/AppNavigator";
import { LinearGradient } from "expo-linear-gradient";
import ReportModal from "../components/ReportModal";
import MediaGallery from "../components/MediaGallery";
import MediaViewer from "../components/MediaViewer";
import { MediaItem } from "../types";

type PersonProfileRouteProp = RouteProp<RootStackParamList, "PersonProfile">;

export default function PersonProfileScreen() {
  const route = useRoute<PersonProfileRouteProp>();
  const navigation = useNavigation<any>();
  const { firstName, location } = route.params;
  const [showReportModal, setShowReportModal] = useState(false);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [selectedReviewMedia, setSelectedReviewMedia] = useState<MediaItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Mock data with media support
  const mockReviews = [
    {
      id: "1",
      reviewerAnonymousId: "anon_123",
      reviewedPersonName: firstName,
      reviewedPersonLocation: location,
      greenFlags: ["good_communicator", "respectful"],
      redFlags: [],
      reviewText:
        "Had a great time! Very respectful and easy to talk to. The dinner was amazing and conversation flowed naturally.",
      media: [
        {
          id: "media_1",
          uri: "https://picsum.photos/400/600?random=1",
          type: "image" as const,
          width: 400,
          height: 600,
        },
        {
          id: "media_2",
          uri: "https://picsum.photos/600/400?random=2",
          type: "image" as const,
          width: 600,
          height: 400,
        },
      ],
      status: "approved" as const,
      likeCount: 12,
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-01-15"),
    },
    {
      id: "2",
      reviewerAnonymousId: "anon_456",
      reviewedPersonName: firstName,
      reviewedPersonLocation: location,
      greenFlags: ["reliable", "fun"],
      redFlags: ["poor_communication"],
      reviewText: "Nice person but communication could be better. Still had a good time overall though!",
      media: [
        {
          id: "media_3",
          uri: "https://picsum.photos/500/700?random=3",
          type: "image" as const,
          width: 500,
          height: 700,
        },
      ],
      status: "approved" as const,
      likeCount: 8,
      createdAt: new Date("2024-01-10"),
      updatedAt: new Date("2024-01-10"),
    },
    {
      id: "3",
      reviewerAnonymousId: "anon_789",
      reviewedPersonName: firstName,
      reviewedPersonLocation: location,
      greenFlags: ["honest", "kind", "ambitious"],
      redFlags: [],
      reviewText:
        "Absolutely wonderful person! Great conversation, very genuine, and has clear goals in life. Would definitely recommend.",
      status: "approved" as const,
      likeCount: 15,
      createdAt: new Date("2024-01-08"),
      updatedAt: new Date("2024-01-08"),
    },
  ];

  const totalGreenFlags = mockReviews.reduce((sum, review) => sum + review.greenFlags.length, 0);
  const totalRedFlags = mockReviews.reduce((sum, review) => sum + review.redFlags.length, 0);

  const handleMediaPress = (_media: MediaItem, index: number, reviewMedia: MediaItem[]) => {
    setSelectedReviewMedia(reviewMedia);
    setSelectedMediaIndex(index);
    setShowMediaViewer(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleReviewPress = (review: any) => {
    navigation.navigate("ReviewDetail", { review });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Hero Section */}
        <LinearGradient colors={["#FFFFFF", "#F3F4F6"]} className="px-6 pt-8 pb-6">
          <View className="items-center">
            <View className="w-24 h-24 bg-white/20 rounded-full items-center justify-center mb-4 border-2 border-white/30">
              <Text className="text-white text-3xl font-bold">{firstName.charAt(0).toUpperCase()}</Text>
            </View>
            <Text className="text-white text-3xl font-bold mb-2">{firstName}</Text>
            <View className="flex-row items-center">
              <Ionicons name="location-outline" size={16} color="white" />
              <Text className="text-white/90 ml-1 text-lg">
                {location.city}, {location.state}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Cards */}
        <View className="px-6 -mt-8 mb-6">
          <View className="bg-surface-800 rounded-2xl p-6 border border-border">
            <View className="flex-row justify-around">
              <View className="items-center">
                <Text className="text-text-primary text-3xl font-bold mb-1">{mockReviews.length}</Text>
                <Text className="text-text-secondary text-sm">Reviews</Text>
              </View>
              <View className="w-px bg-border" />
              <View className="items-center">
                <Text className="text-green-400 text-3xl font-bold mb-1">{totalGreenFlags}</Text>
                <Text className="text-text-secondary text-sm">Green Flags</Text>
              </View>
              <View className="w-px bg-border" />
              <View className="items-center">
                <Text className="text-brand-red text-3xl font-bold mb-1">{totalRedFlags}</Text>
                <Text className="text-text-secondary text-sm">Red Flags</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="px-6 mb-8">
          <View className="flex-row space-x-4">
            <Pressable className="flex-1 bg-brand-red rounded-xl py-4 items-center">
              <Text className="text-black font-semibold text-lg">Write Review</Text>
            </Pressable>
            <Pressable
              className="px-6 py-4 bg-surface-800 border border-border rounded-xl items-center"
              onPress={() => setShowReportModal(true)}
            >
              <Ionicons name="flag-outline" size={20} color="#9CA3AF" />
            </Pressable>
          </View>
        </View>

        {/* Reviews Section */}
        <View className="px-6">
          <Text className="text-text-primary text-2xl font-bold mb-6">Reviews ({mockReviews.length})</Text>

          {mockReviews.map((review) => (
            <Pressable
              key={review.id}
              className="bg-surface-800 rounded-2xl p-6 mb-6 border border-border"
              onPress={() => handleReviewPress(review)}
            >
              {/* Flags */}
              <View className="flex-row flex-wrap gap-2 mb-4">
                {review.greenFlags.map((flag) => (
                  <View key={flag} className="bg-green-400/20 px-3 py-1.5 rounded-full">
                    <Text className="text-green-400 text-sm font-medium">{flag.replace("_", " ")}</Text>
                  </View>
                ))}
                {review.redFlags.map((flag) => (
                  <View key={flag} className="bg-brand-red/20 px-3 py-1.5 rounded-full">
                    <Text className="text-brand-red text-sm font-medium">{flag.replace("_", " ")}</Text>
                  </View>
                ))}
              </View>

              {/* Review Text */}
              <Text className="text-text-primary text-base leading-6 mb-4">{review.reviewText}</Text>

              {/* Media Gallery */}
              {review.media && review.media.length > 0 && (
                <MediaGallery
                  media={review.media}
                  onMediaPress={(media, mediaIndex) => handleMediaPress(media, mediaIndex, review.media!)}
                  size={100}
                />
              )}

              {/* Footer */}
              <View className="flex-row items-center justify-between mt-4 pt-4 border-t border-border">
                <Text className="text-text-muted text-sm">{formatDate(review.createdAt)}</Text>
                <View className="flex-row items-center">
                  <Ionicons name="heart-outline" size={18} color="#9CA3AF" />
                  <Text className="text-text-muted text-sm ml-2">{review.likeCount}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Bottom Spacing */}
        <View className="h-8" />
      </ScrollView>

      {/* Media Viewer Modal */}
      <MediaViewer
        visible={showMediaViewer}
        media={selectedReviewMedia}
        initialIndex={selectedMediaIndex}
        onClose={() => setShowMediaViewer(false)}
      />

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        itemId={`profile_${firstName}_${location.city}_${location.state}`}
        itemType="profile"
        itemName={`${firstName} from ${location.city}, ${location.state}`}
      />
    </SafeAreaView>
  );
}
