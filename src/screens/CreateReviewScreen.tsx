import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useReviewsStore from "../state/reviewsStore";
import { MediaItem, SocialMediaHandles, Sentiment } from "../types";
import FormSection from "../components/FormSection";
import MediaUploadGrid from "../components/MediaUploadGrid";
import SocialMediaInput from "../components/SocialMediaInput";
import LocationSelector from "../components/LocationSelector";
import useAuthStore from "../state/authStore";
import AsyncStorage from "@react-native-async-storage/async-storage";





const DRAFT_KEY = "create-review-draft";

interface Location {
  city: string;
  state: string;
  fullName: string;
}

export default function CreateReviewScreen() {
  const { user } = useAuthStore();
  const [firstName, setFirstName] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<Location>({
    city: user?.location.city || "Washington",
    state: user?.location.state || "DC",
    fullName: `${user?.location.city || "Washington"}, ${user?.location.state || "DC"}`
  });
  const [reviewText, setReviewText] = useState("");
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [socialMedia, setSocialMedia] = useState<SocialMediaHandles>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { createReview, isLoading } = useReviewsStore();

  // Load draft
  useEffect(() => {
    (async () => {
      try {
        const json = await AsyncStorage.getItem(DRAFT_KEY);
        if (json) {
          const draft = JSON.parse(json);
          setFirstName(draft.firstName || "");
          if (draft.selectedLocation) {
            setSelectedLocation(draft.selectedLocation);
          } else if (draft.city && draft.state) {
            // Handle legacy draft format
            setSelectedLocation({
              city: draft.city,
              state: draft.state,
              fullName: `${draft.city}, ${draft.state}`
            });
          }
          setReviewText(draft.reviewText || "");
          setSentiment(draft.sentiment ?? null);
          setMedia(draft.media || []);
          setSocialMedia(draft.socialMedia || {});
        }
      } catch {}
    })();
  }, []);

  // Save draft
  useEffect(() => {
    const save = setTimeout(() => {
      AsyncStorage.setItem(
        DRAFT_KEY,
          JSON.stringify({
            firstName,
            selectedLocation,
            reviewText,
            sentiment,
            media,
            socialMedia,
          })
      ).catch(() => {});
    }, 400);
    return () => clearTimeout(save);
  }, [firstName, selectedLocation, reviewText, sentiment, media, socialMedia]);





  const imagesCount = useMemo(() => media.filter(m => m.type === "image").length, [media]);
  const hasRequired = Boolean(firstName.trim() && selectedLocation.city.trim() && selectedLocation.state.trim() && reviewText.trim() && imagesCount >= 1);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!hasRequired) {
      if (!firstName.trim() || !selectedLocation.city.trim() || !selectedLocation.state.trim()) setError("Please fill in all required fields");
      else if (imagesCount < 1) setError("Please add at least one photo");
      else if (!reviewText.trim()) setError("Please write a review");
      return;
    }

    try {
      await createReview({
        reviewedPersonName: firstName.trim(),
        reviewedPersonLocation: { city: selectedLocation.city.trim(), state: selectedLocation.state.trim().toUpperCase() },
        sentiment: sentiment || undefined,
        reviewText: reviewText.trim(),
        media,
        socialMedia,
      });

      // Reset form and draft
      setFirstName("");
      setSelectedLocation({
        city: user?.location.city || "Washington",
        state: user?.location.state || "DC",
        fullName: `${user?.location.city || "Washington"}, ${user?.location.state || "DC"}`
      });
      setReviewText("");
      setSentiment(null);
      setMedia([]);
      setSocialMedia({});
      await AsyncStorage.removeItem(DRAFT_KEY);
      setSuccess("Review submitted for moderation");
    } catch (e) {
      setError("Failed to submit review. Please try again.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="px-4 py-4 border-b border-border bg-surface-800">
          <Text className="text-text-primary text-2xl font-bold">Write Review</Text>
          <Text className="text-text-secondary mt-1">Share your dating experience anonymously</Text>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-4 py-6">
            {/* Error / Success banners */}
            {error && (
              <View className="bg-red-500/15 border border-red-500 rounded-xl p-3 mb-4">
                <Text className="text-red-400">{error}</Text>
              </View>
            )}
            {success && (
              <View className="bg-emerald-500/15 border border-emerald-500 rounded-xl p-3 mb-4">
                <Text className="text-emerald-400">{success}</Text>
              </View>
            )}

            {/* Person Info */}
            <FormSection title="Who are you reviewing?" subtitle="Provide the name and location" required>
              <View className="space-y-4">
                <View>
                  <Text className="text-text-secondary font-medium mb-2">Name</Text>
                  <TextInput
                    className="bg-surface-800 border border-border rounded-xl px-4 py-3 text-text-primary"
                    placeholder="Enter name"
                    placeholderTextColor="#9CA3AF"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                  />
                </View>

                <View>
                  <Text className="text-text-secondary font-medium mb-2">Location</Text>
                  <LocationSelector
                    currentLocation={selectedLocation}
                    onLocationChange={setSelectedLocation}
                  />
                </View>
              </View>
            </FormSection>

            {/* Media */}
            <FormSection title="Photos & Videos" subtitle="Add at least 1 photo (max 6). Videos up to 60 seconds." required>
              <MediaUploadGrid media={media} onMediaChange={setMedia} maxItems={6} required />
            </FormSection>

            {/* Sentiment */}
            <FormSection title="Sentiment (Optional)" subtitle="Choose one, or skip">
              <View className="flex-row space-x-3">
                <Pressable
                  className={`flex-1 flex-row items-center justify-center rounded-xl border px-3 py-3 ${sentiment === "green" ? "bg-green-500/15 border-green-500" : "bg-surface-800 border-border"}`}
                  onPress={() => setSentiment(sentiment === "green" ? null : "green")}
                >
                  <Text className="text-text-primary font-medium">Green Flag</Text>
                </Pressable>
                <Pressable
                  className={`flex-1 flex-row items-center justify-center rounded-xl border px-3 py-3 ${sentiment === "red" ? "bg-brand-red/20 border-brand-red" : "bg-surface-800 border-border"}`}
                  onPress={() => setSentiment(sentiment === "red" ? null : "red")}
                >
                  <Text className="text-text-primary font-medium">Red Flag</Text>
                </Pressable>
              </View>
            </FormSection>

            {/* Review Text */}
            <FormSection title="Your Review" subtitle={`Share your experience (${reviewText.length}/500)`} required>
              <TextInput
                className="bg-surface-800 border border-border rounded-xl px-4 py-3 text-text-primary h-32"
                placeholder="Write your review here..."
                placeholderTextColor="#9CA3AF"
                value={reviewText}
                onChangeText={setReviewText}
                multiline
                textAlignVertical="top"
                maxLength={500}
              />
            </FormSection>

            {/* Social Media */}
            <FormSection title="Social Media (Optional)" subtitle="Optionally add handles that will show publicly on the review">
              <SocialMediaInput socialMedia={socialMedia} onSocialMediaChange={setSocialMedia} />
            </FormSection>

            {/* Submit Button */}
            <Pressable
              className={`rounded-xl py-4 items-center ${hasRequired ? "bg-brand-red" : "bg-surface-700"} ${isLoading ? "opacity-50" : ""}`}
              onPress={handleSubmit}
              disabled={isLoading || !hasRequired}
            >
              <Text className={`font-semibold text-lg ${hasRequired ? "text-black" : "text-text-secondary"}`}>
                {isLoading ? "Submitting..." : "Submit Review"}
              </Text>
            </Pressable>

            <Text className="text-text-muted text-sm text-center mt-3">
              Your review will be completely anonymous and screened before publication
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
