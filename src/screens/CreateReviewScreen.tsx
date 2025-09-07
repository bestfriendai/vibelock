import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import useReviewsStore from "../state/reviewsStore";
import { MediaItem, SocialMediaHandles, Sentiment, ReviewCategory } from "../types";
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
  const navigation = useNavigation<any>();
  const { user, isGuestMode } = useAuthStore();
  const [firstName, setFirstName] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<Location>({
    city: user?.location.city || "Washington",
    state: user?.location.state || "DC",
    fullName: `${user?.location.city || "Washington"}, ${user?.location.state || "DC"}`,
  });
  const [reviewText, setReviewText] = useState("");
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [category, setCategory] = useState<ReviewCategory>("men");
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
              fullName: `${draft.city}, ${draft.state}`,
            });
          }
          setReviewText(draft.reviewText || "");
          setSentiment(draft.sentiment ?? null);
          setCategory(draft.category || "men");
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
          category,
          media,
          socialMedia,
        }),
      ).catch(() => {});
    }, 400);
    return () => clearTimeout(save);
  }, [firstName, selectedLocation, reviewText, sentiment, category, media, socialMedia]);

  const imagesCount = useMemo(() => media.filter((m) => m.type === "image").length, [media]);

  // Enhanced validation
  const validation = useMemo(() => {
    const errors: string[] = [];

    if (!firstName.trim()) errors.push("Name is required");
    else if (firstName.trim().length < 2) errors.push("Name must be at least 2 characters");

    if (!selectedLocation.city.trim() || !selectedLocation.state.trim()) {
      errors.push("Location is required");
    }

    if (!reviewText.trim()) errors.push("Review text is required");
    else if (reviewText.trim().length < 10) errors.push("Review must be at least 10 characters");
    else if (reviewText.trim().length > 500) errors.push("Review must be less than 500 characters");

    if (imagesCount < 1) errors.push("At least one photo is required");

    if (!sentiment) errors.push("Please select a sentiment (green/red flags)");

    return {
      isValid: errors.length === 0,
      errors,
      firstError: errors[0] || null
    };
  }, [firstName, selectedLocation, reviewText, imagesCount, sentiment]);

  const hasRequired = validation.isValid;

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!validation.isValid) {
      setError(validation.firstError);
      return;
    }

    try {
      const reviewData = {
        reviewedPersonName: firstName.trim(),
        reviewedPersonLocation: {
          city: selectedLocation.city.trim(),
          state: selectedLocation.state.trim().toUpperCase(),
        },
        sentiment: sentiment || undefined,
        reviewText: reviewText.trim(),
        category,
        media,
        socialMedia,
      };

      await createReview(reviewData);

      // Reset form and draft
      setFirstName("");
      setSelectedLocation({
        city: user?.location.city || "Washington",
        state: user?.location.state || "DC",
        fullName: `${user?.location.city || "Washington"}, ${user?.location.state || "DC"}`,
      });
      setReviewText("");
      setSentiment(null);
      setCategory("men");
      setMedia([]);
      setSocialMedia({});
      await AsyncStorage.removeItem(DRAFT_KEY);

      // Show success message and navigate back
      setSuccess("Review posted successfully!");

      // Navigate back to browse screen after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (e) {
      setError("Failed to submit review. Please try again.");
    }
  };

  // Guest mode protection
  if (isGuestMode) {
    return (
      <SafeAreaView className="flex-1 bg-surface-900">
        <View className="flex-1 justify-center items-center px-6">
          <View className="bg-surface-800 rounded-2xl p-8 w-full max-w-sm">
            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-brand-red/20 rounded-full items-center justify-center mb-4">
                <Text className="text-brand-red text-2xl">✍️</Text>
              </View>
              <Text className="text-2xl font-bold text-text-primary mb-2 text-center">
                Create Account to Write Reviews
              </Text>
              <Text className="text-text-secondary text-center">
                Join our community to share your dating experiences and help others make informed decisions.
              </Text>
            </View>

            <View className="space-y-3">
              <Pressable
                className="bg-brand-red rounded-lg py-4 items-center"
                onPress={() => {
                  // Navigate to sign up
                }}
              >
                <Text className="text-white font-semibold text-lg">Sign Up</Text>
              </Pressable>

              <Pressable
                className="bg-surface-700 rounded-lg py-4 items-center"
                onPress={() => {
                  // Navigate to sign in
                }}
              >
                <Text className="text-text-primary font-semibold text-lg">Sign In</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        {/* Header */}
        <View className="px-6 py-6 border-b border-border bg-surface-800">
          <Text className="text-text-primary text-2xl font-bold">Write Review</Text>
          <Text className="text-text-secondary mt-1">Share your dating experience anonymously</Text>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-6 py-6">
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
                  <LocationSelector currentLocation={selectedLocation} onLocationChange={setSelectedLocation} />
                </View>
              </View>
            </FormSection>

            {/* Category */}
            <FormSection title="Category" subtitle="Select who you're reviewing" required>
              <View className="flex-row space-x-3">
                <Pressable
                  className={`flex-1 items-center justify-center rounded-xl border px-3 py-4 ${category === "men" ? "bg-blue-500/15 border-blue-500" : "bg-surface-800 border-border"}`}
                  onPress={() => setCategory("men")}
                >
                  <Text className={`font-medium ${category === "men" ? "text-blue-400" : "text-text-primary"}`}>
                    Men
                  </Text>
                </Pressable>
                <Pressable
                  className={`flex-1 items-center justify-center rounded-xl border px-3 py-4 ${category === "women" ? "bg-pink-500/15 border-pink-500" : "bg-surface-800 border-border"}`}
                  onPress={() => setCategory("women")}
                >
                  <Text className={`font-medium ${category === "women" ? "text-pink-400" : "text-text-primary"}`}>
                    Women
                  </Text>
                </Pressable>
                <Pressable
                  className={`flex-1 items-center justify-center rounded-xl border px-3 py-4 ${category === "lgbtq+" ? "bg-purple-500/15 border-purple-500" : "bg-surface-800 border-border"}`}
                  onPress={() => setCategory("lgbtq+")}
                >
                  <Text className={`font-medium ${category === "lgbtq+" ? "text-purple-400" : "text-text-primary"}`}>
                    LGBTQ+
                  </Text>
                </Pressable>
              </View>
            </FormSection>

            {/* Media */}
            <FormSection
              title="Photos & Videos"
              subtitle="Add at least 1 photo (max 6). Videos up to 60 seconds."
              required
            >
              <MediaUploadGrid media={media} onMediaChange={setMedia} maxItems={6} required />
            </FormSection>

            {/* Sentiment */}
            <FormSection title="Sentiment (Optional)" subtitle="Choose one, or skip">
              <View className="flex-row space-x-3">
                <Pressable
                  className={`flex-1 flex-row items-center justify-center rounded-xl border px-3 py-4 ${sentiment === "green" ? "bg-green-500/15 border-green-500" : "bg-surface-800 border-border"}`}
                  onPress={() => setSentiment(sentiment === "green" ? null : "green")}
                >
                  <Text className="text-text-primary font-medium">Green Flag</Text>
                </Pressable>
                <Pressable
                  className={`flex-1 flex-row items-center justify-center rounded-xl border px-3 py-4 ${sentiment === "red" ? "bg-brand-red/20 border-brand-red" : "bg-surface-800 border-border"}`}
                  onPress={() => setSentiment(sentiment === "red" ? null : "red")}
                >
                  <Text className="text-text-primary font-medium">Red Flag</Text>
                </Pressable>
              </View>
            </FormSection>

            {/* Review Text */}
            <FormSection
              title="Your Review"
              subtitle={`Share your experience`}
              required
            >
              <View>
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
                <View className="flex-row justify-between items-center mt-2">
                  <Text className="text-text-muted text-sm">
                    {reviewText.length < 10 ? 'Minimum 10 characters' : 'Looking good!'}
                  </Text>
                  <Text className={`text-sm ${reviewText.length > 450 ? 'text-yellow-400' : reviewText.length > 480 ? 'text-red-400' : 'text-text-muted'}`}>
                    {reviewText.length}/500
                  </Text>
                </View>
              </View>
            </FormSection>

            {/* Social Media */}
            <FormSection
              title="Social Media (Optional)"
              subtitle="Optionally add handles that will show publicly on the review"
            >
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
              Your review will be posted immediately and remain completely anonymous
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
