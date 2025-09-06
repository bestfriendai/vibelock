import React, { useState, useEffect } from "react";
import { View, Text, TextInput, FlatList, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Profile } from "../types";
import { supabaseSearch } from "../services/supabase";
import useAuthStore from "../state/authStore";
// import ProfileCardSkeleton from "../components/ProfileCardSkeleton"; // Currently unused

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
    updatedAt: new Date("2024-01-15"),
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
    updatedAt: new Date("2024-01-11"),
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
    updatedAt: new Date("2024-01-10"),
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
    updatedAt: new Date("2024-01-09"),
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
    updatedAt: new Date("2024-01-08"),
  },
];

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [radius, setRadius] = useState(50);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [trendingNames, setTrendingNames] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load trending names on component mount
  useEffect(() => {
    const loadTrendingNames = async () => {
      try {
        const trending = await supabaseSearch.getTrendingNames(5);
        setTrendingNames(trending);
      } catch (error) {
        console.error("Error loading trending names:", error);
      }
    };
    loadTrendingNames();
  }, []);

  // Search functionality with real Supabase search
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      setIsSearching(true);
      const timer = setTimeout(async () => {
        try {
          // Build search filters based on user location and radius
          const filters: any = {};

          if (user?.location && radius < 100) {
            if (radius < 50) {
              // Small radius: filter by city and state
              filters.city = user.location.city;
              filters.state = user.location.state;
            } else {
              // Medium radius: filter by state only
              filters.state = user.location.state;
            }
          }

          // Add user's gender preference as category filter
          if (user?.genderPreference && user.genderPreference !== "all") {
            filters.category = user.genderPreference;
          }

          const results = await supabaseSearch.searchProfiles(searchQuery, filters);
          setSearchResults(results);

          // Add to recent searches (keep last 5)
          setRecentSearches((prev) => {
            const updated = [searchQuery, ...prev.filter((s) => s !== searchQuery)];
            return updated.slice(0, 5);
          });
        } catch (error) {
          console.error("Search error:", error);
          // Fallback to mock data on error
          const filtered = mockProfiles.filter((profile) =>
            profile.firstName.toLowerCase().includes(searchQuery.toLowerCase()),
          );
          setSearchResults(filtered);
        } finally {
          setIsSearching(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery, radius, user]);

  const handleProfilePress = (profile: Profile) => {
    navigation.navigate("PersonProfile", {
      firstName: profile.firstName,
      location: profile.location,
    });
  };

  const renderProfileItem = ({ item }: { item: Profile }) => (
    <Pressable
      onPress={() => handleProfilePress(item)}
      className="bg-surface-800 border border-surface-700 rounded-xl p-4 mb-3"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-text-primary text-lg font-semibold">{item.firstName}</Text>
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
              <Text className="text-text-secondary text-sm ml-1">{item.averageRating?.toFixed(1) || "N/A"}</Text>
            </View>
          </View>
        </View>
        <View className="items-end">
          <View className="flex-row items-center">
            <View className="bg-green-500/20 px-2 py-1 rounded-full mr-2">
              <Text className="text-green-400 text-xs font-medium">{item.greenFlagCount}</Text>
            </View>
            {item.redFlagCount > 0 && (
              <View className="bg-brand-red/20 px-2 py-1 rounded-full">
                <Text className="text-brand-red text-xs font-medium">{item.redFlagCount}</Text>
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
          <View className="w-10 h-10 mr-3">
            <Image
              source={require("../../assets/logo-circular.png")}
              style={{ width: 40, height: 40 }}
              resizeMode="contain"
            />
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
              <View className="absolute right-3 top-3 flex-row items-center">
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery("")} className="mr-2">
                    <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                  </Pressable>
                )}
                <Ionicons name={isSearching ? "hourglass" : "search"} size={20} color="#9CA3AF" />
              </View>
            </View>
          </View>

          {/* Radius Filter */}
          <View className="mb-6">
            <Text className="text-text-primary font-medium mb-2">Search Radius: {radius} miles</Text>
            <View className="flex-row items-center justify-between">
              <Pressable
                className={`bg-surface-700 rounded-lg px-4 py-2 ${radius === 10 ? "border border-white" : ""}`}
                onPress={() => setRadius(10)}
              >
                <Text className={radius === 10 ? "text-white font-medium" : "text-text-secondary"}>10mi</Text>
              </Pressable>
              <Pressable
                className={`bg-surface-700 rounded-lg px-4 py-2 ${radius === 25 ? "border border-white" : ""}`}
                onPress={() => setRadius(25)}
              >
                <Text className={radius === 25 ? "text-white font-medium" : "text-text-secondary"}>25mi</Text>
              </Pressable>
              <Pressable
                className={`bg-surface-700 rounded-lg px-4 py-2 ${radius === 50 ? "border border-white" : ""}`}
                onPress={() => setRadius(50)}
              >
                <Text className={radius === 50 ? "text-white font-medium" : "text-text-secondary"}>50mi</Text>
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
              isSearching ? (
                <View className="px-4">
                  {/* Search skeleton loading */}
                  {Array.from({ length: 3 }).map((_, index) => (
                    <View key={index} className="bg-surface-800 border border-surface-700 rounded-xl p-4 mb-3">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <View className="bg-surface-600 h-5 w-24 rounded mb-2" />
                          <View className="bg-surface-600 h-4 w-32 rounded mb-2" />
                          <View className="flex-row items-center">
                            <View className="bg-surface-600 h-4 w-16 rounded mr-4" />
                            <View className="bg-surface-600 h-4 w-12 rounded" />
                          </View>
                        </View>
                        <View className="items-end">
                          <View className="flex-row items-center">
                            <View className="bg-surface-600 h-6 w-8 rounded-full mr-2" />
                            <View className="bg-surface-600 h-6 w-8 rounded-full" />
                          </View>
                          <View className="bg-surface-600 h-4 w-4 rounded mt-2" />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="items-center justify-center py-12">
                  <Ionicons name="person-outline" size={48} color="#6B7280" />
                  <Text className="text-text-secondary text-lg font-medium mt-4">No profiles found</Text>
                  <Text className="text-text-muted text-center mt-2">
                    Try a different name or expand your search radius
                  </Text>
                </View>
              )
            }
          />
        ) : (
          <View className="flex-1 px-4">
            {/* Trending Names */}
            {trendingNames.length > 0 && (
              <View className="mb-6">
                <Text className="text-text-primary font-medium mb-3">Trending Names</Text>
                <View className="flex-row flex-wrap">
                  {trendingNames.map((name, index) => (
                    <Pressable
                      key={index}
                      onPress={() => setSearchQuery(name)}
                      className="bg-surface-700 rounded-full px-3 py-2 mr-2 mb-2"
                    >
                      <Text className="text-text-secondary text-sm">{name}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-text-primary font-medium">Recent Searches</Text>
                  <Pressable onPress={() => setRecentSearches([])} className="px-2 py-1">
                    <Text className="text-text-muted text-sm">Clear</Text>
                  </Pressable>
                </View>
                <View className="flex-row flex-wrap">
                  {recentSearches.map((search, index) => (
                    <Pressable
                      key={index}
                      onPress={() => setSearchQuery(search)}
                      className="bg-surface-800 border border-surface-700 rounded-full px-3 py-2 mr-2 mb-2 flex-row items-center"
                    >
                      <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                      <Text className="text-text-secondary text-sm ml-1">{search}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Empty State */}
            <View className="flex-1 items-center justify-center">
              <Ionicons name="search-outline" size={48} color="#6B7280" />
              <Text className="text-text-secondary text-lg font-medium mt-4">Search for someone</Text>
              <Text className="text-text-muted text-center mt-2">Enter at least 2 characters to find reviews</Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
