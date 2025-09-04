import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import useReviewsStore from "../state/reviewsStore";
import { GreenFlag, RedFlag } from "../types";

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

export default function CreateReviewScreen() {
  const [firstName, setFirstName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [selectedGreenFlags, setSelectedGreenFlags] = useState<GreenFlag[]>([]);
  const [selectedRedFlags, setSelectedRedFlags] = useState<RedFlag[]>([]);

  const { createReview, isLoading } = useReviewsStore();

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

  const handleSubmit = async () => {
    if (!firstName.trim() || !city.trim() || !state.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (!reviewText.trim()) {
      Alert.alert("Error", "Please write a review");
      return;
    }

    if (selectedGreenFlags.length === 0 && selectedRedFlags.length === 0) {
      Alert.alert("Error", "Please select at least one flag");
      return;
    }

    try {
      await createReview({
        reviewedPersonName: firstName.trim(),
        reviewedPersonLocation: { city: city.trim(), state: state.trim().toUpperCase() },
        greenFlags: selectedGreenFlags,
        redFlags: selectedRedFlags,
        reviewText: reviewText.trim(),
      });

      // Reset form
      setFirstName("");
      setCity("");
      setState("");
      setReviewText("");
      setSelectedGreenFlags([]);
      setSelectedRedFlags([]);

      Alert.alert("Success", "Your review has been submitted for moderation");
    } catch (error) {
      Alert.alert("Error", "Failed to submit review");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="px-4 py-3 border-b border-gray-200">
          <Text className="text-2xl font-bold text-gray-900">Write Review</Text>
          <Text className="text-gray-600 mt-1">Share your dating experience anonymously</Text>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-4 py-6 space-y-6">
            {/* Person Info */}
            <View>
              <Text className="text-lg font-semibold text-gray-900 mb-4">
                Who are you reviewing?
              </Text>
              
              <View className="space-y-4">
                <View>
                  <Text className="text-gray-700 font-medium mb-2">First Name *</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                    placeholder="Enter first name"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                  />
                </View>

                <View className="flex-row space-x-3">
                  <View className="flex-1">
                    <Text className="text-gray-700 font-medium mb-2">City *</Text>
                    <TextInput
                      className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                      placeholder="City"
                      value={city}
                      onChangeText={setCity}
                      autoCapitalize="words"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-700 font-medium mb-2">State *</Text>
                    <TextInput
                      className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                      placeholder="State"
                      value={state}
                      onChangeText={setState}
                      autoCapitalize="characters"
                      maxLength={2}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Green Flags */}
            <View>
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                Green Flags
              </Text>
              <Text className="text-gray-600 mb-4">What did you like about them?</Text>
              
              <View className="flex-row flex-wrap gap-2">
                {GREEN_FLAGS.map((flag) => (
                  <Pressable
                    key={flag.key}
                    className={`px-3 py-2 rounded-full border ${
                      selectedGreenFlags.includes(flag.key)
                        ? "bg-green-100 border-green-500"
                        : "bg-gray-50 border-gray-300"
                    }`}
                    onPress={() => toggleGreenFlag(flag.key)}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        selectedGreenFlags.includes(flag.key)
                          ? "text-green-700"
                          : "text-gray-700"
                      }`}
                    >
                      {flag.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Red Flags */}
            <View>
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                Red Flags
              </Text>
              <Text className="text-gray-600 mb-4">Any warning signs?</Text>
              
              <View className="flex-row flex-wrap gap-2">
                {RED_FLAGS.map((flag) => (
                  <Pressable
                    key={flag.key}
                    className={`px-3 py-2 rounded-full border ${
                      selectedRedFlags.includes(flag.key)
                        ? "bg-red-100 border-red-500"
                        : "bg-gray-50 border-gray-300"
                    }`}
                    onPress={() => toggleRedFlag(flag.key)}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        selectedRedFlags.includes(flag.key)
                          ? "text-red-700"
                          : "text-gray-700"
                      }`}
                    >
                      {flag.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Review Text */}
            <View>
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                Your Review *
              </Text>
              <Text className="text-gray-600 mb-4">
                Share your experience ({reviewText.length}/500)
              </Text>
              
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 h-32"
                placeholder="Write your review here..."
                value={reviewText}
                onChangeText={setReviewText}
                multiline
                textAlignVertical="top"
                maxLength={500}
              />
            </View>

            {/* Submit Button */}
            <Pressable
              className={`bg-red-500 rounded-lg py-4 items-center ${
                isLoading ? "opacity-50" : ""
              }`}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              <Text className="text-white font-semibold text-lg">
                {isLoading ? "Submitting..." : "Submit Review"}
              </Text>
            </Pressable>

            <Text className="text-gray-500 text-sm text-center">
              Your review will be completely anonymous and screened before publication
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}