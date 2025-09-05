import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Mock review data for testing location filtering
const mockReviews = [
  { id: "1", name: "Alex NYC", location: { city: "New York", state: "NY" } },
  { id: "2", name: "Maria LA", location: { city: "Los Angeles", state: "CA" } },
  { id: "3", name: "John DC", location: { city: "Washington", state: "DC" } },
  { id: "4", name: "Sarah DC", location: { city: "Washington", state: "DC" } },
  { id: "5", name: "Test User NY", location: { city: "New York", state: "NY" } },
  { id: "6", name: "Test Person", location: { city: "Test City", state: "TS" } },
];

const mockUserLocations = [
  { city: "New York", state: "NY", label: "New York, NY" },
  { city: "Washington", state: "DC", label: "Washington, DC" },
  { city: "Los Angeles", state: "CA", label: "Los Angeles, CA" },
  { city: "Miami", state: "FL", label: "Miami, FL (no reviews)" },
];

const radiusOptions = [
  { value: 25, label: "25 miles (City-level)" },
  { value: 50, label: "50 miles (State-wide)" },
  { value: 100, label: "100+ miles (Nationwide)" },
];

export default function LocationFilterDemo() {
  const [userLocation, setUserLocation] = useState(mockUserLocations[0]);
  const [radius, setRadius] = useState(50);

  // Apply the same location filtering logic as the main app
  const applyLocationFilter = (list: typeof mockReviews) => {
    if (!radius || !userLocation) {
      return { filtered: list, reason: "DISABLED (no radius or user location)" };
    }

    if (radius >= 100) {
      return { filtered: list, reason: "NATIONWIDE (radius >= 100)" };
    }

    if (radius >= 50) {
      const filtered = list.filter(
        (r) => r.location.state.toLowerCase() === userLocation.state.toLowerCase()
      );
      return { filtered, reason: `STATE-WIDE (${userLocation.state})` };
    }

    const filtered = list.filter(
      (r) =>
        r.location.city.toLowerCase() === userLocation.city.toLowerCase() &&
        r.location.state.toLowerCase() === userLocation.state.toLowerCase()
    );
    return { filtered, reason: `CITY-LEVEL (${userLocation.city}, ${userLocation.state})` };
  };

  const { filtered: filteredReviews, reason } = applyLocationFilter(mockReviews);

  return (
    <SafeAreaView className="flex-1 bg-surface-900 p-4">
      <ScrollView>
        <Text className="text-text-primary text-2xl font-bold mb-6">Location Filter Demo</Text>

        {/* User Location Selector */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">Your Location:</Text>
          {mockUserLocations.map((location) => (
            <Pressable
              key={location.label}
              onPress={() => setUserLocation(location)}
              className={`p-3 rounded-lg mb-2 ${
                userLocation.label === location.label ? "bg-brand-red" : "bg-surface-700"
              }`}
            >
              <Text
                className={`font-medium ${
                  userLocation.label === location.label ? "text-black" : "text-text-primary"
                }`}
              >
                {location.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Radius Selector */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">Search Radius:</Text>
          {radiusOptions.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setRadius(option.value)}
              className={`p-3 rounded-lg mb-2 ${
                radius === option.value ? "bg-brand-red" : "bg-surface-700"
              }`}
            >
              <Text
                className={`font-medium ${
                  radius === option.value ? "text-black" : "text-text-primary"
                }`}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Filter Results */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">
            Filter Result: {reason}
          </Text>
          <Text className="text-text-secondary mb-3">
            Showing {filteredReviews.length} of {mockReviews.length} reviews
          </Text>

          {filteredReviews.map((review) => (
            <View key={review.id} className="bg-surface-700 p-3 rounded-lg mb-2">
              <Text className="text-text-primary font-medium">{review.name}</Text>
              <Text className="text-text-secondary text-sm">
                {review.location.city}, {review.location.state}
              </Text>
            </View>
          ))}

          {filteredReviews.length === 0 && (
            <View className="bg-surface-700 p-4 rounded-lg">
              <Text className="text-text-secondary text-center">
                No reviews found for your location and radius settings.
                {"\n"}Try increasing the radius or changing your location.
              </Text>
            </View>
          )}
        </View>

        {/* All Reviews (for reference) */}
        <View>
          <Text className="text-text-primary text-lg font-semibold mb-3">All Available Reviews:</Text>
          {mockReviews.map((review) => (
            <View key={review.id} className="bg-surface-800 p-3 rounded-lg mb-2">
              <Text className="text-text-primary font-medium">{review.name}</Text>
              <Text className="text-text-secondary text-sm">
                {review.location.city}, {review.location.state}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
