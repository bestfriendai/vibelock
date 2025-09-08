import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { supabaseSearch } from "../services/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../providers/ThemeProvider";

// Debounce utility
const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [contentResults, setContentResults] = useState<{
    reviews: any[];
    comments: any[];
    messages: any[];
  }>({ reviews: [], comments: [], messages: [] });
  const [activeTab, setActiveTab] = useState<"all" | "reviews" | "comments" | "messages">("all");

  // Enhanced search features
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: 'all', // 'week', 'month', 'year', 'all'
    sentiment: 'all', // 'positive', 'negative', 'neutral', 'all'
    hasMedia: false,
    location: '',
  });

  // Load search history on mount
  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('search_history');
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  };

  const saveToSearchHistory = async (query: string) => {
    try {
      const trimmedQuery = query.trim();
      if (trimmedQuery.length < 2) return;

      const updatedHistory = [
        trimmedQuery,
        ...searchHistory.filter(item => item !== trimmedQuery)
      ].slice(0, 10); // Keep only last 10 searches

      setSearchHistory(updatedHistory);
      await AsyncStorage.setItem('search_history', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  };

  const clearSearchHistory = async () => {
    try {
      setSearchHistory([]);
      await AsyncStorage.removeItem('search_history');
    } catch (error) {
      console.error('Failed to clear search history:', error);
    }
  };

  // Debounced suggestion generation
  const generateSuggestions = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }

      // Generate suggestions from search history
      const historySuggestions = searchHistory
        .filter(item => item.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5);

      // Add common search terms
      const commonTerms = [
        'dating experience', 'relationship', 'hookup', 'date night',
        'personality', 'appearance', 'communication', 'chemistry',
        'red flags', 'green flags', 'toxic', 'sweet', 'funny', 'boring'
      ];

      const commonSuggestions = commonTerms
        .filter(term => term.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3);

      setSuggestions([...historySuggestions, ...commonSuggestions]);
    }, 300),
    [searchHistory]
  );

  const handleSearch = async (queryOverride?: string) => {
    const query = queryOverride || searchQuery;

    if (query.trim().length < 2) {
      setSearchError("Please enter at least 2 characters to search");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setShowSuggestions(false);

    try {
      const results = await supabaseSearch.searchAll(query);
      setContentResults(results);

      // Save to search history
      await saveToSearchHistory(query);

      // Show feedback if no results found
      const totalResults = results.reviews.length + results.comments.length + results.messages.length;
      if (totalResults === 0) {
        setSearchError(`No results found for "${query}". Try different keywords or check your spelling.`);
      }
    } catch (e) {
      console.error('Search failed:', e);
      setSearchError("Search failed. Please check your connection and try again.");
      setContentResults({ reviews: [], comments: [], messages: [] });
    } finally {
      setIsSearching(false);
    }
  };

  const handleQueryChange = (text: string) => {
    setSearchQuery(text);
    setShowSuggestions(text.length > 0);
    generateSuggestions(text);
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View className="px-6 py-6" style={{ backgroundColor: colors.surface[800] }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Pressable onPress={() => navigation.goBack()} className="mr-4">
              <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
            </Pressable>
            <View>
              <Text className="text-xl font-bold" style={{ color: colors.text.primary }}>
                Search
              </Text>
              <Text className="text-sm" style={{ color: colors.text.secondary }}>
                Find reviews, comments & messages
              </Text>
            </View>
          </View>
          {searchHistory.length > 0 && (
            <Pressable onPress={clearSearchHistory}>
              <Text className="text-sm" style={{ color: colors.brand.red }}>
                Clear History
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <View className="flex-1">
        <View className="px-4 py-2">
          {/* Search Input */}
          <View className="mb-6">
            <Text className="text-text-primary font-medium mb-2">Search</Text>
            <View className="relative">
              <TextInput
                className="bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 pr-12 text-text-primary"
                placeholder="Enter keywords..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={handleQueryChange}
                autoCapitalize="none"
                onSubmitEditing={() => handleSearch()}
                onFocus={() => setShowSuggestions(searchQuery.length > 0)}
                returnKeyType="search"
              />
              <View className="absolute right-3 top-3 flex-row items-center">
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery("")} className="mr-2">
                    <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                  </Pressable>
                )}
                <Pressable onPress={handleSearch}>
                  <Ionicons name={isSearching ? "hourglass" : "search"} size={20} color="#9CA3AF" />
                </Pressable>
              </View>
            </View>

            {/* Search Suggestions */}
            {showSuggestions && (suggestions.length > 0 || searchHistory.length > 0) && (
              <View
                className="mt-2 rounded-lg border"
                style={{
                  backgroundColor: colors.surface[800],
                  borderColor: colors.border
                }}
              >
                {/* Recent Searches */}
                {searchQuery.length === 0 && searchHistory.length > 0 && (
                  <>
                    <View className="px-4 py-2 border-b" style={{ borderColor: colors.border }}>
                      <Text className="text-sm font-medium" style={{ color: colors.text.secondary }}>
                        Recent Searches
                      </Text>
                    </View>
                    {searchHistory.slice(0, 5).map((item, index) => (
                      <Pressable
                        key={index}
                        onPress={() => {
                          setSearchQuery(item);
                          handleSearch(item);
                        }}
                        className="px-4 py-3 flex-row items-center"
                      >
                        <Ionicons name="time-outline" size={16} color={colors.text.muted} />
                        <Text className="ml-3 flex-1" style={{ color: colors.text.primary }}>
                          {item}
                        </Text>
                        <Ionicons name="arrow-up-outline" size={16} color={colors.text.muted} />
                      </Pressable>
                    ))}
                  </>
                )}

                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <>
                    {searchQuery.length === 0 && searchHistory.length > 0 && (
                      <View className="h-px" style={{ backgroundColor: colors.border }} />
                    )}
                    {suggestions.map((suggestion, index) => (
                      <Pressable
                        key={index}
                        onPress={() => {
                          setSearchQuery(suggestion);
                          handleSearch(suggestion);
                        }}
                        className="px-4 py-3 flex-row items-center"
                      >
                        <Ionicons name="search-outline" size={16} color={colors.text.muted} />
                        <Text className="ml-3 flex-1" style={{ color: colors.text.primary }}>
                          {suggestion}
                        </Text>
                      </Pressable>
                    ))}
                  </>
                )}
              </View>
            )}

            {/* Search Error */}
            {searchError && (
              <View className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                <View className="flex-row items-center">
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text className="text-red-400 text-sm ml-2 flex-1">{searchError}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Results */}
        {searchQuery.length >= 2 ? (
          <ScrollView className="flex-1 px-4">
            {/* Tabs */}
            <View className="flex-row mb-3">
              {(["all", "reviews", "comments", "messages"] as const).map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  className={`px-3 py-2 rounded-lg mr-2 ${activeTab === tab ? "bg-brand-red" : "bg-surface-800"}`}
                >
                  <Text className={activeTab === tab ? "text-black font-medium" : "text-text-secondary"}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View className="space-y-3 pb-20">
              {(activeTab === "all" || activeTab === "reviews") &&
                contentResults.reviews.map((review, idx) => (
                  <Pressable
                    key={`review-${idx}`}
                    onPress={() => navigation.navigate("ReviewDetail", { reviewId: review.id })}
                    className="bg-surface-800 rounded-lg p-4"
                  >
                    <View className="flex-row items-center mb-2">
                      <View className="bg-blue-500 rounded px-2 py-1">
                        <Text className="text-white text-xs font-medium">Review</Text>
                      </View>
                      <Text className="text-text-muted text-xs ml-2">{new Date(review.created_at).toLocaleDateString()}</Text>
                    </View>
                    <Text className="text-text-primary font-medium mb-1">{review.reviewed_person_name}</Text>
                    <Text className="text-text-secondary text-sm" numberOfLines={2}>{review.review_text}</Text>
                  </Pressable>
                ))}

              {(activeTab === "all" || activeTab === "comments") &&
                contentResults.comments.map((comment, idx) => (
                  <Pressable
                    key={`comment-${idx}`}
                    onPress={() => navigation.navigate("ReviewDetail", { reviewId: comment.review_id })}
                    className="bg-surface-800 rounded-lg p-4"
                  >
                    <View className="flex-row items-center mb-2">
                      <View className="bg-green-500 rounded px-2 py-1">
                        <Text className="text-white text-xs font-medium">Comment</Text>
                      </View>
                      <Text className="text-text-muted text-xs ml-2">{new Date(comment.created_at).toLocaleDateString()}</Text>
                    </View>
                    <Text className="text-text-secondary text-sm" numberOfLines={2}>{comment.content}</Text>
                  </Pressable>
                ))}

              {(activeTab === "all" || activeTab === "messages") &&
                contentResults.messages.map((message, idx) => (
                  <Pressable
                    key={`message-${idx}`}
                    onPress={() => navigation.navigate("ChatRoom", { roomId: message.chat_room_id })}
                    className="bg-surface-800 rounded-lg p-4"
                  >
                    <View className="flex-row items-center mb-2">
                      <View className="bg-purple-500 rounded px-2 py-1">
                        <Text className="text-white text-xs font-medium">Message</Text>
                      </View>
                      <Text className="text-text-muted text-xs ml-2">{message.chat_rooms_firebase?.name || "Chat"}</Text>
                    </View>
                    <Text className="text-text-secondary text-sm" numberOfLines={2}>{message.content}</Text>
                  </Pressable>
                ))}

              {!isSearching &&
                contentResults.reviews.length === 0 &&
                contentResults.comments.length === 0 &&
                contentResults.messages.length === 0 && (
                  <View className="items-center justify-center py-12">
                    <Ionicons name="search-outline" size={48} color="#6B7280" />
                    <Text className="text-text-secondary text-lg font-medium mt-4">No content found</Text>
                    <Text className="text-text-muted text-center mt-2">Try different search terms</Text>
                  </View>
              )}
            </View>
          </ScrollView>
        ) : (
          <View className="flex-1 items-center justify-center px-6">
            <Ionicons name="search-outline" size={48} color="#6B7280" />
            <Text className="text-text-secondary text-lg font-medium mt-4">Search content</Text>
            <Text className="text-text-muted text-center mt-2">Enter at least 2 characters and tap the search icon</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
