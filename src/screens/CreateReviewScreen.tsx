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
import { GreenFlag, RedFlag, MediaItem, SocialMediaHandles } from "../types";
import FormSection from "../components/FormSection";
import MediaUploadGrid from "../components/MediaUploadGrid";
import SocialMediaInput from "../components/SocialMediaInput";
import AsyncStorage from "@react-native-async-storage/async-storage";

const GREEN_FLAGS: { key: GreenFlag; label: string }[] = [
  { key: "good_communicator", label: "Good Communicator" },
  { key: "respectful", label: "Respectful" },
  { key: "fun", label: "Fun" },
  { key: "reliable", label: "Reliable" },
  { key: "honest", label: "Honest" },
  { key: "kind", label: "Kind" },
  { key: "ambitious", label: "Ambitious" },
  { key: "good_listener", label: "Good Listener" },
];

const RED_FLAGS: { key: RedFlag; label: string }[] = [
  { key: "poor_communication", label: "Poor Communication" },
  { key: "disrespectful", label: "Disrespectful" },
  { key: "unreliable", label: "Unreliable" },
  { key: "fake", label: "Fake" },
  { key: "rude", label: "Rude" },
  { key: "controlling", label: "Controlling" },
  { key: "dishonest", label: "Dishonest" },
  { key: "inconsistent", label: "Inconsistent" },
];

const DRAFT_KEY = "create-review-draft";

export default function CreateReviewScreen() {
  const [firstName, setFirstName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [selectedGreenFlags, setSelectedGreenFlags] = useState<GreenFlag[]>([]);
  const [selectedRedFlags, setSelectedRedFlags] = useState<RedFlag[]>([]);
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
          setCity(draft.city || "");
          setState(draft.state || "");
          setReviewText(draft.reviewText || "");
          setSelectedGreenFlags(draft.selectedGreenFlags || []);
          setSelectedRedFlags(draft.selectedRedFlags || []);
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
          city,
          state,
          reviewText,
          selectedGreenFlags,
          selectedRedFlags,
          media,
          socialMedia,
        })
      ).catch(() => {});
    }, 400);
    return () => clearTimeout(save);
  }, [firstName, city, state, reviewText, selectedGreenFlags, selectedRedFlags, media, socialMedia]);

  const toggleGreenFlag = (flag: GreenFlag) => {
    setSelectedGreenFlags(prev =>
      prev.includes(flag)
        ? prev.filter(f => f !== flag)
        : [...prev, flag]
    );
  };

  const toggleRedFlag = (flag: RedFlag) => {
    setSelectedRedFlags(prev =>
      prev.includes(flag)
        ? prev.filter(f => f !== flag)
        : [...prev, flag]
    );
  };

  const imagesCount = useMemo(() => media.filter(m => m.type === "image").length, [media]);
  const hasRequired = Boolean(firstName.trim() && city.trim() && state.trim() && reviewText.trim() && (selectedGreenFlags.length + selectedRedFlags.length > 0) && imagesCount >= 1);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!hasRequired) {
      if (!firstName.trim() || !city.trim() || !state.trim()) setError("Please fill in all required fields");
      else if (imagesCount < 1) setError("Please add at least one photo");
      else if (!reviewText.trim()) setError("Please write a review");
      else if ((selectedGreenFlags.length + selectedRedFlags.length) === 0) setError("Please select at least one flag");
      return;
    }

    try {
      await createReview({
        reviewedPersonName: firstName.trim(),
        reviewedPersonLocation: { city: city.trim(), state: state.trim().toUpperCase() },
        greenFlags: selectedGreenFlags,
        redFlags: selectedRedFlags,
        reviewText: reviewText.trim(),
        media,
        socialMedia,
      });

      // Reset form and draft
      setFirstName("");
      setCity("");
      setState("");
      setReviewText("");
      setSelectedGreenFlags([]);
      setSelectedRedFlags([]);
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
            <FormSection title="Who are you reviewing?" subtitle="Provide the first name and location" required>
              <View className="space-y-4">
                <View>
                  <Text className="text-text-secondary font-medium mb-2">First Name</Text>
                  <TextInput
                    className="bg-surface-800 border border-border rounded-xl px-4 py-3 text-text-primary"
                    placeholder="Enter first name"
                    placeholderTextColor="#9CA3AF"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                  />
                </View>

                <View className="flex-row space-x-3">
                  <View className="flex-1">
                    <Text className="text-text-secondary font-medium mb-2">City</Text>
                    <TextInput
                      className="bg-surface-800 border border-border rounded-xl px-4 py-3 text-text-primary"
                      placeholder="City"
                      placeholderTextColor="#9CA3AF"
                      value={city}
                      onChangeText={setCity}
                      autoCapitalize="words"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-text-secondary font-medium mb-2">State</Text>
                    <TextInput
                      className="bg-surface-800 border border-border rounded-xl px-4 py-3 text-text-primary"
                      placeholder="State"
                      placeholderTextColor="#9CA3AF"
                      value={state}
                      onChangeText={setState}
                      autoCapitalize="characters"
                      maxLength={2}
                    />
                  </View>
                </View>
              </View>
            </FormSection>

            {/* Media */}
            <FormSection title="Photos & Videos" subtitle="Add at least 1 photo (max 6). Videos up to 60 seconds." required>
              <MediaUploadGrid media={media} onMediaChange={setMedia} maxItems={6} required />
            </FormSection>

            {/* Flags */}
            <FormSection title="Green Flags" subtitle="What did you like about them?">
              <View className="flex-row flex-wrap gap-2">
                {GREEN_FLAGS.map((flag) => (
                  <Pressable
                    key={flag.key}
                    className={`px-3 py-2 rounded-full border ${
                      selectedGreenFlags.includes(flag.key)
                        ? "bg-green-400/20 border-green-500"
                        : "bg-surface-800 border-border"
                    }`}
                    onPress={() => toggleGreenFlag(flag.key)}
                  >
                    <Text className={`text-sm font-medium ${selectedGreenFlags.includes(flag.key) ? "text-green-400" : "text-text-secondary"}`}>
                      {flag.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </FormSection>

            <FormSection title="Red Flags" subtitle="Any warning signs?">
              <View className="flex-row flex-wrap gap-2">
                {RED_FLAGS.map((flag) => (
                  <Pressable
                    key={flag.key}
                    className={`px-3 py-2 rounded-full border ${
                      selectedRedFlags.includes(flag.key)
                        ? "bg-brand-red/20 border-brand-red"
                        : "bg-surface-800 border-border"
                    }`}
                    onPress={() => toggleRedFlag(flag.key)}
                  >
                    <Text className={`text-sm font-medium ${selectedRedFlags.includes(flag.key) ? "text-brand-red" : "text-text-secondary"}`}>
                      {flag.label}
                    </Text>
                  </Pressable>
                ))}
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
