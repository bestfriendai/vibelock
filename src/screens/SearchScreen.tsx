import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Profile } from "../types";

// Mock profile data aggregated from reviews
const mockProfiles: Profile[] = [
  {
    id: "profile_1",
    firstName: "Alexandria",
    location: { city: "Alexandria", state: "VA" },
    totalReviews: 4,
    greenFlagCount: 8,
    redFlagCount: 0,
    averageRating: 4.5,
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-15")
  },
  {
    id: "profile_2", 
    firstName: "Jasmine",
    location: { city: "Washington", state: "DC" },
    totalReviews: 1,
    greenFlagCount: 2,
    redFlagCount: 0,
    averageRating: 5.0,
    createdAt: new Date("2024-01-11"),
    updatedAt: new Date("2024-01-11")
  },
  {
    id: "profile_3",
    firstName: "Taylor", 
    location: { city: "Arlington", state: "VA" },
    totalReviews: 1,
    greenFlagCount: 2,
    redFlagCount: 0,
    averageRating: 5.0,
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-10")
  },
  {
    id: "profile_4",
    firstName: "Morgan",
    location: { city: "Bethesda", state: "MD" },
    totalReviews: 1,
    greenFlagCount: 2,
    redFlagCount: 0,
    averageRating: 5.0,
    createdAt: new Date("2024-01-09"),
    updatedAt: new Date("2024-01-09")
  },
  {
    id: "profile_5",
    firstName: "Jordan",
    location: { city: "Silver Spring", state: "MD" },
    totalReviews: 1,
    greenFlagCount: 2,
    redFlagCount: 0,
    averageRating: 5.0,
    createdAt: new Date("2024-01-08"),
    updatedAt: new Date("2024-01-08")
  }
];

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState("");
  const [radius, setRadius] = useState(50);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      setIsSearching(true);
      const timer = setTimeout(() => {
        const filtered = mockProfiles.filter(profile =>
          profile.firstName.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(filtered);
        setIsSearching(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleProfilePress = (profile: Profile) => {
    navigation.navigate("PersonProfile", {
      firstName: profile.firstName,
      location: profile.location
    });
  };

  const renderProfileItem = ({ item }: { item: Profile }) => (
    <Pressable
      onPress={() => handleProfilePress(item)}
      className="bg-surface-800 border border-surface-700 rounded-xl p-4 mb-3"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-text-primary text-lg font-semibold">
            {item.firstName}
          </Text>
          <Text className="text-text-secondary text-sm mt-1">
            {item.location.city}, {item.location.state}
          </Text>
          <View className="flex-row items-center mt-2">
            <View className="flex-row items-center mr-4">
              <Ionicons name="chatbubble" size={14} color="#9CA3AF" />
              <Text className="text-text-secondary text-sm ml-1">
                {item.totalReviews} review{item.totalReviews !== 1 ? "s" : ""}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="star" size={14} color="#FFB74D" />
              <Text className="text-text-secondary text-sm ml-1">
                {item.averageRating?.toFixed(1) || "N/A"}
              </Text>
            </View>
          </View>
        </View>
        <View className="items-end">
          <View className="flex-row items-center">
            <View className="bg-green-500/20 px-2 py-1 rounded-full mr-2">
              <Text className="text-green-400 text-xs font-medium">
                {item.greenFlagCount}
              </Text>
            </View>
            {item.redFlagCount > 0 && (
              <View className="bg-brand-red/20 px-2 py-1 rounded-full">
                <Text className="text-brand-red text-xs font-medium">
                  {item.redFlagCount}
                </Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={{ marginTop: 8 }} />
        </View>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      {/* Header */}
      <View className="bg-black px-4 py-4">
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-surface-700 items-center justify-center mr-3">
            <Text className="text-text-primary text-lg font-bold">LRT</Text>
          </View>
          <View>
            <Text className="text-2xl font-bold text-text-primary">Search</Text>
            <Text className="text-text-secondary mt-1">Find people by first name</Text>
          </View>
        </View>
      </View>

      <View className="flex-1">
        <View className="px-4 py-6">
          {/* Search Input */}
          <View className="mb-6">
            <Text className="text-text-primary font-medium mb-2">First Name</Text>
            <View className="relative">
              <TextInput
                className="bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 pr-12 text-text-primary"
                placeholder="Enter first name..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="words"
              />
              <View className="absolute right-3 top-3">
                <Ionicons
                  name={isSearching ? "hourglass" : "search"}
                  size={20}
                  color="#9CA3AF"
                />
              </View>
            </View>
          </View>

          {/* Radius Filter */}
          <View className="mb-6">
            <Text className="text-text-primary font-medium mb-2">
              Search Radius: {radius} miles
            </Text>
            <View className="flex-row items-center justify-between">
              <Pressable
                className={`bg-surface-700 rounded-lg px-4 py-2 ${radius === 10 ? "border border-white" : ""}`}
                onPress={() => setRadius(10)}
              >
                <Text className={radius === 10 ? "text-white font-medium" : "text-text-secondary"}>
                  10mi
                </Text>
              </Pressable>
              <Pressable
                className={`bg-surface-700 rounded-lg px-4 py-2 ${radius === 25 ? "border border-white" : ""}`}
                onPress={() => setRadius(25)}
              >
                <Text className={radius === 25 ? "text-white font-medium" : "text-text-secondary"}>
                  25mi
                </Text>
              </Pressable>
              <Pressable
                className={`bg-surface-700 rounded-lg px-4 py-2 ${radius === 50 ? "border border-white" : ""}`}
                onPress={() => setRadius(50)}
              >
                <Text className={radius === 50 ? "text-white font-medium" : "text-text-secondary"}>
                  50mi
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Search Results */}
        {searchQuery.length >= 2 ? (
          <FlatList
            data={searchResults}
            renderItem={renderProfileItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              !isSearching ? (
                <View className="items-center justify-center py-12">
                  <Ionicons name="person-outline" size={48} color="#6B7280" />
                  <Text className="text-text-secondary text-lg font-medium mt-4">
                    No profiles found
                  </Text>
                  <Text className="text-text-muted text-center mt-2">
                    Try a different name or expand your search radius
                  </Text>
                </View>
              ) : null
            }
          />
        ) : (
          <View className="flex-1 items-center justify-center px-4">
            <Ionicons name="search-outline" size={48} color="#6B7280" />
            <Text className="text-text-secondary text-lg font-medium mt-4">
              Search for someone
            </Text>
            <Text className="text-text-muted text-center mt-2">
              Enter at least 2 characters to find reviews
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}