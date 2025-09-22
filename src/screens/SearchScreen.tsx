import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SearchStackParamList } from "../navigation/AppNavigator";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/AppNavigator";
import { searchService } from "../services/search";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../providers/ThemeProvider";
import { validateSearchQuery, searchLimiter } from "../utils/inputValidation";
import EmptyState from "../components/EmptyState";
import { STRINGS } from "../constants/strings";
import { AppError, parseSupabaseError } from "../utils/errorHandling";

// Constants for secure search history
const MAX_SEARCH_HISTORY_ITEMS = 10;
const SEARCH_HISTORY_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

// Sanitize search query for storage - remove sensitive patterns
const sanitizeSearchQuery = (query: string): string => {
  if (!query || typeof query !== "string") return "";

  // Remove potentially sensitive patterns
  const sanitized = query
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN]") // SSN patterns
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[CARD]") // Credit card patterns
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL]") // Email patterns
    .replace(/\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/g, "[PHONE]") // Phone patterns
    .trim()
    .substring(0, 50); // Limit length

  return sanitized;
};

// Validate search history item
const isValidSearchHistoryItem = (item: any): boolean => {
  if (typeof item !== "object" || !item) return false;
  if (typeof item.query !== "string" || !item.query.trim()) return false;
  if (typeof item.timestamp !== "number" || item.timestamp <= 0) return false;

  // Check if item is not expired
  const now = Date.now();
  return now - item.timestamp < SEARCH_HISTORY_EXPIRY;
};

// Debounce utility
const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

type Props = NativeStackScreenProps<SearchStackParamList, "Search">;

export default function SearchScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const rootNavigation = useNavigation<NavigationProp<RootStackParamList>>();

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
    dateRange: "all", // 'week', 'month', 'year', 'all'
    sentiment: "all", // 'positive', 'negative', 'neutral', 'all'
    hasMedia: false,
    location: "",
  });

  // Load search history on mount
  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const historyData = await AsyncStorage.getItem("search_history");
      if (historyData) {
        const parsedHistory = JSON.parse(historyData);

        // Validate and filter history items
        const validHistory = Array.isArray(parsedHistory)
          ? parsedHistory.filter(isValidSearchHistoryItem).map((item) => item.query)
          : [];

        setSearchHistory(validHistory);

        // Clean up expired items
        if (validHistory.length !== parsedHistory.length) {
          await AsyncStorage.setItem(
            "search_history",
            JSON.stringify(
              validHistory.map((query) => ({
                query: sanitizeSearchQuery(query),
                timestamp: Date.now(),
              })),
            ),
          );
        }
      }
    } catch (error) {
      console.warn("Failed to load search history:", error);
      // Clear corrupted data
      try {
        await AsyncStorage.removeItem("search_history");
      } catch (clearError) {
        console.warn("Failed to clear corrupted search history:", clearError);
      }
    }
  };

  const saveToSearchHistory = async (query: string) => {
    try {
      const sanitizedQuery = sanitizeSearchQuery(query);
      if (sanitizedQuery.length < 2) return;

      // Create history item with timestamp
      const historyItem = {
        query: sanitizedQuery,
        timestamp: Date.now(),
      };

      // Update local state
      const updatedHistory = [sanitizedQuery, ...searchHistory.filter((item) => item !== sanitizedQuery)].slice(
        0,
        MAX_SEARCH_HISTORY_ITEMS,
      );

      setSearchHistory(updatedHistory);

      // Save to storage with metadata
      const historyWithMetadata = updatedHistory.map((q) => ({
        query: q,
        timestamp: q === sanitizedQuery ? Date.now() : Date.now() - 1000, // Slight offset for existing items
      }));

      await AsyncStorage.setItem("search_history", JSON.stringify(historyWithMetadata));
    } catch (error) {
      const appError = error instanceof AppError ? error : parseSupabaseError(error);
      console.warn("Failed to save search history:", appError.userMessage);
    }
  };

  const clearSearchHistory = async () => {
    try {
      setSearchHistory([]);
      await AsyncStorage.removeItem("search_history");

      if (__DEV__) {
        console.log("🧹 Search history cleared");
      }
    } catch (error) {
      const appError = error instanceof AppError ? error : parseSupabaseError(error);
      console.warn("Failed to clear search history:", appError.userMessage);
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
        .filter((item) => item.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5);

      // Add common search terms
      const commonTerms = [
        "dating experience",
        "relationship",
        "hookup",
        "date night",
        "personality",
        "appearance",
        "communication",
        "chemistry",
        "red flags",
        "green flags",
        "toxic",
        "sweet",
        "funny",
        "boring",
      ];

      const commonSuggestions = commonTerms
        .filter((term) => term.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3);

      setSuggestions([...historySuggestions, ...commonSuggestions]);
    }, 500),
    [searchHistory],
  );

  const handleSearch = async (queryOverride?: string) => {
    const query = queryOverride || searchQuery;

    // Validate and sanitize search query
    const queryValidation = validateSearchQuery(query);
    if (!queryValidation.isValid) {
      setSearchError(queryValidation.error || "Invalid search query");
      return;
    }

    // Rate limiting check
    if (!searchLimiter.isAllowed("search")) {
      setSearchError("Too many searches. Please wait a moment before searching again.");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setShowSuggestions(false);

    try {
      // Use enhanced search with filters
      const results = await searchService.searchAll(queryValidation.sanitized, {
        ...filters,
        limit: 20,
        offset: 0,
      });
      setContentResults(results);

      // Save to search history (use sanitized query)
      await saveToSearchHistory(queryValidation.sanitized);

      // Show feedback if no results found
      const totalResults = results.reviews.length + results.comments.length + results.messages.length;
      if (totalResults === 0) {
        setSearchError(
          `No results found for "${queryValidation.sanitized}". Try different keywords or check your spelling.`,
        );
      }
    } catch (error) {
      console.warn("Search failed:", error);
      const appError = error instanceof AppError ? error : parseSupabaseError(error);
      setSearchError(appError.userMessage || "Search failed. Please check your connection and try again.");
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
            <Pressable
              onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("MainTabs" as never))}
              className="mr-4"
            >
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
            <Text className="font-medium mb-2" style={{ color: colors.text.primary }}>
              Search
            </Text>
            <View className="relative">
              <TextInput
                className="rounded-lg px-4 py-3 pr-12"
                style={{
                  backgroundColor: colors.surface[800],
                  borderWidth: 1,
                  borderColor: colors.surface[700],
                  color: colors.text.primary,
                }}
                placeholder="Enter keywords..."
                placeholderTextColor={colors.text.muted}
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
                <Pressable onPress={() => handleSearch()}>
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
                  borderColor: colors.border.default,
                }}
              >
                {/* Recent Searches */}
                {searchQuery.length === 0 && searchHistory.length > 0 && (
                  <>
                    <View className="px-4 py-2 border-b" style={{ borderColor: colors.border.default }}>
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
                      <View className="h-px" style={{ backgroundColor: colors.border.default }} />
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
          <ScrollView className="flex-1 px-4" keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
            {/* Tabs */}
            <View className="flex-row mb-3">
              {(["all", "reviews", "comments", "messages"] as const).map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  className="px-3 py-2 rounded-lg mr-2"
                  style={{
                    backgroundColor: activeTab === tab ? colors.brand.red : colors.surface[800],
                  }}
                >
                  <Text
                    className={activeTab === tab ? "font-medium" : ""}
                    style={{
                      color: activeTab === tab ? "#FFFFFF" : colors.text.secondary,
                    }}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View className="space-y-3 pb-20">
              {(activeTab === "all" || activeTab === "reviews") &&
                contentResults.reviews.map((review, idx) => {
                  // Transform raw database record to Review interface format
                  const transformedReview = {
                    id: review.id,
                    authorId: review.author_id,
                    reviewerAnonymousId: review.reviewer_anonymous_id,
                    reviewedPersonName: review.reviewed_person_name,
                    reviewedPersonLocation: review.reviewed_person_location,
                    category: review.category,
                    profilePhoto: review.profile_photo,
                    greenFlags: review.green_flags || [],
                    redFlags: review.red_flags || [],
                    sentiment: review.sentiment,
                    reviewText: review.review_text,
                    media: review.media || [],
                    socialMedia: review.social_media,
                    status: review.status,
                    likeCount: review.like_count || 0,
                    dislikeCount: review.dislike_count || 0,
                    createdAt: new Date(review.created_at).toISOString(),
                    updatedAt: new Date(review.updated_at).toISOString(),
                  };

                  return (
                    <Pressable
                      key={`review-${idx}`}
                      onPress={() => navigation.navigate("ReviewDetail", { review: transformedReview })}
                      className="rounded-lg p-4"
                      style={{ backgroundColor: colors.surface[800] }}
                    >
                      <View className="flex-row items-center mb-2">
                        <View className="bg-blue-500 rounded px-2 py-1">
                          <Text className="text-white text-xs font-medium">Review</Text>
                        </View>
                        <Text className="text-xs ml-2" style={{ color: colors.text.muted }}>
                          {new Date(review.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text className="font-medium mb-1" style={{ color: colors.text.primary }}>
                        {review.reviewed_person_name}
                      </Text>
                      <Text className="text-sm" style={{ color: colors.text.secondary }} numberOfLines={2}>
                        {review.review_text}
                      </Text>
                    </Pressable>
                  );
                })}

              {(activeTab === "all" || activeTab === "comments") &&
                contentResults.comments.map((comment, idx) => (
                  <Pressable
                    key={`comment-${idx}`}
                    onPress={() => navigation.navigate("ReviewDetail", { reviewId: comment.review_id })}
                    className="rounded-lg p-4"
                    style={{ backgroundColor: colors.surface[800] }}
                  >
                    <View className="flex-row items-center mb-2">
                      <View className="bg-green-500 rounded px-2 py-1">
                        <Text className="text-white text-xs font-medium">Comment</Text>
                      </View>
                      <Text className="text-xs ml-2" style={{ color: colors.text.muted }}>
                        {new Date(comment.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text className="text-sm" style={{ color: colors.text.secondary }} numberOfLines={2}>
                      {comment.content}
                    </Text>
                  </Pressable>
                ))}

              {(activeTab === "all" || activeTab === "messages") &&
                contentResults.messages.map((message, idx) => (
                  <Pressable
                    key={`message-${idx}`}
                    onPress={() => rootNavigation.navigate("ChatRoom", { roomId: message.chat_room_id })}
                    className="rounded-lg p-4"
                    style={{ backgroundColor: colors.surface[800] }}
                  >
                    <View className="flex-row items-center mb-2">
                      <View className="bg-purple-500 rounded px-2 py-1">
                        <Text className="text-white text-xs font-medium">Message</Text>
                      </View>
                      <Text className="text-xs ml-2" style={{ color: colors.text.muted }}>
                        {message.chat_rooms_firebase?.name || "Chat"}
                      </Text>
                    </View>
                    <Text className="text-sm" style={{ color: colors.text.secondary }} numberOfLines={2}>
                      {message.content}
                    </Text>
                  </Pressable>
                ))}

              {!isSearching &&
                contentResults.reviews.length === 0 &&
                contentResults.comments.length === 0 &&
                contentResults.messages.length === 0 && (
                  <EmptyState
                    icon={STRINGS.EMPTY_STATES.SEARCH_EMPTY.icon}
                    title={STRINGS.EMPTY_STATES.SEARCH_EMPTY.title}
                    description={STRINGS.EMPTY_STATES.SEARCH_EMPTY.description}
                  />
                )}
            </View>
          </ScrollView>
        ) : (
          <EmptyState
            icon={STRINGS.EMPTY_STATES.SEARCH_PROMPT.icon}
            title={STRINGS.EMPTY_STATES.SEARCH_PROMPT.title}
            description={STRINGS.EMPTY_STATES.SEARCH_PROMPT.description}
            className="px-6"
          />
        )}
      </View>
    </SafeAreaView>
  );
}
