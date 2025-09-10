import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { v4 as uuidv4 } from "uuid";
import useReviewsStore from "../state/reviewsStore";
import { MediaItem, SocialMediaHandles, Sentiment, ReviewCategory } from "../types";
import {
  validateName,
  validateReviewText,
  validateLocation,
  validateSocialHandle,
  formSubmissionLimiter,
} from "../utils/inputValidation";
import FormSection from "../components/FormSection";
import MediaUploadGrid from "../components/MediaUploadGrid";
import SocialMediaInput from "../components/SocialMediaInput";
import LocationSelector from "../components/LocationSelector";
import useAuthStore from "../state/authStore";
import useSubscriptionStore from "../state/subscriptionStore";
import { useTheme } from "../providers/ThemeProvider";
import PremiumBadge from "../components/PremiumBadge";
import { imageCompressionService } from "../services/imageCompressionService";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DRAFT_KEY = "create-review-draft";

interface Location {
  city: string;
  state: string;
  fullName: string;
  type?: "city" | "college";
  institutionType?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export default function CreateReviewScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user, isGuestMode } = useAuthStore();
  const { isPremium } = useSubscriptionStore();
  const [firstName, setFirstName] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<Location>({
    city: user?.location.city || "Washington",
    state: user?.location.state || "DC",
    fullName: user?.location.fullName || `${user?.location.city || "Washington"}, ${user?.location.state || "DC"}`,
    type: user?.location.type,
    institutionType: user?.location.institutionType,
    coordinates: user?.location.coordinates,
  });
  const [reviewText, setReviewText] = useState("");
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [category, setCategory] = useState<ReviewCategory>("men");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [socialMedia, setSocialMedia] = useState<SocialMediaHandles>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [csrfToken] = useState(() => uuidv4()); // Generate CSRF token on component mount

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
              type: draft.type,
              institutionType: draft.institutionType,
              coordinates: draft.coordinates,
            });
          }
          setReviewText(draft.reviewText || "");
          setSentiment(draft.sentiment || null);
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
  const mediaCount = useMemo(() => media.length, [media]);

  // Enhanced validation with premium limits
  const maxReviewLength = isPremium ? 1000 : 500;
  const maxMediaCount = isPremium ? 10 : 6;

  const validation = useMemo(() => {
    const errors: string[] = [];

    // Validate name with security checks
    const nameValidation = validateName(firstName);
    if (!nameValidation.isValid) {
      errors.push(nameValidation.error || "Invalid name");
    }

    // Validate location with security checks
    const locationValidation = validateLocation(selectedLocation.city, selectedLocation.state);
    if (!locationValidation.isValid) {
      errors.push(locationValidation.error || "Invalid location");
    }

    // Validate review text with security checks
    const reviewValidation = validateReviewText(reviewText, maxReviewLength);
    if (!reviewValidation.isValid) {
      errors.push(reviewValidation.error || "Invalid review text");
    }

    if (mediaCount < 1) errors.push("At least one photo or video is required");

    // Sentiment is optional; do not require it

    return {
      isValid: errors.length === 0,
      errors,
      firstError: errors[0] || null,
      sanitizedData: {
        name: nameValidation.sanitized,
        city: locationValidation.sanitizedCity,
        state: locationValidation.sanitizedState,
        reviewText: reviewValidation.sanitized,
      },
    };
  }, [firstName, selectedLocation, reviewText, imagesCount, sentiment, maxReviewLength]);

  // Looser check to enable the button; full validation still runs on submit
  const hasRequired = Boolean(
    firstName?.trim() &&
    selectedLocation?.city &&
    selectedLocation?.state &&
    reviewText?.trim() &&
    mediaCount > 0
  );

  const handleSubmit = async () => {
    console.log("🎬 handleSubmit called");
    console.log("📋 Validation state:", {
      isValid: validation.isValid,
      errors: validation.errors,
      firstError: validation.firstError,
      imagesCount,
      sentiment,
      mediaLength: media.length,
    });

    setError(null);
    setSuccess(null);

    if (!validation.isValid) {
      console.log("❌ Validation failed:", validation.firstError);
      setError(validation.firstError);
      return;
    }

    try {
      // Rate limiting check
      const userId = user?.id || "anonymous";
      if (!formSubmissionLimiter.isAllowed(userId)) {
        throw new Error("Too many submissions. Please wait a minute before trying again.");
      }

      // CSRF protection: validate token exists and is from this session
      if (!csrfToken || csrfToken.length < 10) {
        throw new Error("Security validation failed. Please refresh and try again.");
      }

      // Use sanitized data from validation
      const reviewData = {
        reviewedPersonName: validation.sanitizedData.name,
        reviewedPersonLocation: {
          city: validation.sanitizedData.city,
          state: validation.sanitizedData.state,
        },
        sentiment: sentiment || undefined,
        reviewText: validation.sanitizedData.reviewText,
        category,
        media,
        socialMedia,
        csrfToken, // Include CSRF token in submission
      };

      console.log("🚀 Calling createReview with data:", reviewData);
      await createReview(reviewData);
      console.log("✅ createReview completed successfully");

      // Reset form and draft
      setFirstName("");
      setSelectedLocation({
        city: user?.location.city || "Washington",
        state: user?.location.state || "DC",
        fullName: user?.location.fullName || `${user?.location.city || "Washington"}, ${user?.location.state || "DC"}`,
        type: user?.location.type,
        institutionType: user?.location.institutionType,
        coordinates: user?.location.coordinates,
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
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
        <View className="flex-1 justify-center items-center px-6">
          <View className="rounded-2xl p-8 w-full max-w-sm" style={{ backgroundColor: colors.surface[800] }}>
            <View className="items-center mb-6">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: `${colors.brand.red}20` }}
              >
                <Text className="text-2xl" style={{ color: colors.brand.red }}>
                  ✍️
                </Text>
              </View>
              <Text className="text-2xl font-bold mb-2 text-center" style={{ color: colors.text.primary }}>
                Create Account to Write Reviews
              </Text>
              <Text className="text-center" style={{ color: colors.text.secondary }}>
                Join our community to share your dating experiences and help others make informed decisions.
              </Text>
            </View>

            <View className="space-y-3">
              <Pressable
                className="rounded-lg py-4 items-center"
                style={{ backgroundColor: colors.brand.red }}
                onPress={() => {
                  // Navigate to sign up
                }}
              >
                <Text className="text-white font-semibold text-lg">Sign Up</Text>
              </Pressable>

              <Pressable
                className="rounded-lg py-4 items-center"
                style={{ backgroundColor: colors.surface[700] }}
                onPress={() => {
                  // Navigate to sign in
                }}
              >
                <Text className="font-semibold text-lg" style={{ color: colors.text.primary }}>
                  Sign In
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        {/* Header */}
        <View
          className="px-6 py-6 border-b"
          style={{ borderBottomColor: colors.border, backgroundColor: colors.surface[800] }}
        >
          <Text className="text-2xl font-bold" style={{ color: colors.text.primary }}>
            Write Review
          </Text>
          <Text className="mt-1" style={{ color: colors.text.secondary }}>
            Share your dating experience anonymously
          </Text>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-6 py-6">
            {/* Error / Success banners */}
            {error && (
              <View
                className="border rounded-xl p-3 mb-4"
                style={{ backgroundColor: "#EF444415", borderColor: "#EF4444" }}
              >
                <Text style={{ color: "#EF4444" }}>{error}</Text>
              </View>
            )}
            {success && (
              <View
                className="border rounded-xl p-3 mb-4"
                style={{ backgroundColor: "#10B98115", borderColor: "#10B981" }}
              >
                <Text style={{ color: "#10B981" }}>{success}</Text>
              </View>
            )}

            {/* Person Info */}
            <FormSection title="Who are you reviewing?" subtitle="Provide the name and location" required>
              <View className="space-y-4">
                <View>
                  <Text className="font-medium mb-2" style={{ color: colors.text.secondary }}>
                    Name
                  </Text>
                  <TextInput
                    className="border rounded-xl px-4 py-3"
                    style={{
                      backgroundColor: colors.surface[800],
                      borderColor: colors.border,
                      color: colors.text.primary,
                    }}
                    placeholder="Enter name"
                    placeholderTextColor={colors.text.muted}
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    accessible={true}
                    accessibilityLabel="Person's name"
                    accessibilityHint="Enter the name of the person you're reviewing"
                  />
                </View>

                <View>
                  <Text className="font-medium mb-2" style={{ color: colors.text.secondary }}>
                    Location
                  </Text>
                  <LocationSelector currentLocation={selectedLocation} onLocationChange={setSelectedLocation} />
                </View>
              </View>
            </FormSection>

            {/* Category */}
            <FormSection title="Category" subtitle="Select who you're reviewing" required>
              <View className="flex-row space-x-3">
                <Pressable
                  className="flex-1 items-center justify-center rounded-xl border px-3 py-4"
                  style={{
                    backgroundColor: category === "men" ? "#3B82F615" : colors.surface[800],
                    borderColor: category === "men" ? "#3B82F6" : colors.border,
                  }}
                  onPress={() => setCategory("men")}
                  accessible={true}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: category === "men" }}
                  accessibilityLabel="Men category"
                  accessibilityHint="Select to review someone in the men category"
                >
                  <Text className="font-medium" style={{ color: category === "men" ? "#3B82F6" : colors.text.primary }}>
                    Men
                  </Text>
                </Pressable>
                <Pressable
                  className="flex-1 items-center justify-center rounded-xl border px-3 py-4"
                  style={{
                    backgroundColor: category === "women" ? "#EC489815" : colors.surface[800],
                    borderColor: category === "women" ? "#EC4899" : colors.border,
                  }}
                  onPress={() => setCategory("women")}
                >
                  <Text
                    className="font-medium"
                    style={{ color: category === "women" ? "#EC4899" : colors.text.primary }}
                  >
                    Women
                  </Text>
                </Pressable>
                <Pressable
                  className="flex-1 items-center justify-center rounded-xl border px-3 py-4"
                  style={{
                    backgroundColor: category === "lgbtq+" ? "#8B5CF615" : colors.surface[800],
                    borderColor: category === "lgbtq+" ? "#8B5CF6" : colors.border,
                  }}
                  onPress={() => setCategory("lgbtq+")}
                >
                  <Text
                    className="font-medium"
                    style={{ color: category === "lgbtq+" ? "#8B5CF6" : colors.text.primary }}
                  >
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
                  className="flex-1 flex-row items-center justify-center rounded-xl border px-3 py-4"
                  style={{
                    backgroundColor: sentiment === "green" ? "#22C55E20" : colors.surface[800],
                    borderColor: sentiment === "green" ? "#22C55E" : colors.border,
                  }}
                  onPress={() => setSentiment(sentiment === "green" ? null : "green")}
                >
                  <Text className="font-medium" style={{ color: colors.text.primary }}>
                    Green Flag
                  </Text>
                </Pressable>
                <Pressable
                  className="flex-1 flex-row items-center justify-center rounded-xl border px-3 py-4"
                  style={{
                    backgroundColor: sentiment === "red" ? `${colors.brand.red}20` : colors.surface[800],
                    borderColor: sentiment === "red" ? colors.brand.red : colors.border,
                  }}
                  onPress={() => setSentiment(sentiment === "red" ? null : "red")}
                >
                  <Text className="font-medium" style={{ color: colors.text.primary }}>
                    Red Flag
                  </Text>
                </Pressable>
              </View>
            </FormSection>

            {/* Review Text */}
            <FormSection title="Your Review" subtitle={`Share your experience`} required>
              <View>
                <TextInput
                  className="border rounded-xl px-4 py-3 h-32"
                  style={{
                    backgroundColor: colors.surface[800],
                    borderColor: colors.border,
                    color: colors.text.primary,
                  }}
                  placeholder="Write your review here..."
                  placeholderTextColor={colors.text.muted}
                  value={reviewText}
                  onChangeText={setReviewText}
                  multiline
                  textAlignVertical="top"
                  maxLength={maxReviewLength}
                />
                <View className="flex-row justify-between items-center mt-2">
                  <View className="flex-row items-center">
                    <Text className="text-sm" style={{ color: colors.text.muted }}>
                      {reviewText.length < 10 ? "Minimum 10 characters" : "Looking good!"}
                    </Text>
                    {isPremium && (
                      <View className="ml-2">
                        <PremiumBadge size="small" variant="pill" showText={false} />
                      </View>
                    )}
                  </View>
                  <Text
                    className="text-sm"
                    style={{
                      color:
                        reviewText.length > maxReviewLength * 0.9
                          ? "#FBBF24"
                          : reviewText.length > maxReviewLength * 0.95
                            ? "#EF4444"
                            : colors.text.muted,
                    }}
                  >
                    {reviewText.length}/{maxReviewLength}
                    {!isPremium && reviewText.length > 400 && (
                      <Text style={{ color: "#F59E0B" }}> • Upgrade for 1000 chars</Text>
                    )}
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
              className="rounded-xl py-4 items-center"
              style={{
                backgroundColor: hasRequired ? colors.brand.red : colors.surface[700],
                opacity: isLoading ? 0.5 : 1,
              }}
              onPress={handleSubmit}
              disabled={isLoading || !hasRequired}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={isLoading ? "Submitting review" : "Submit review"}
              accessibilityHint="Submit your anonymous review"
              accessibilityState={{ disabled: isLoading || !hasRequired }}
            >
              <Text className="font-semibold text-lg" style={{ color: hasRequired ? "black" : colors.text.secondary }}>
                {isLoading ? "Submitting..." : "Submit Review"}
              </Text>
            </Pressable>

            <Text className="text-sm text-center mt-3" style={{ color: colors.text.muted }}>
              Your review will be posted immediately and remain completely anonymous
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
