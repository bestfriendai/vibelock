import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { supabaseSearch } from "../services/supabase";

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [contentResults, setContentResults] = useState<{
    reviews: any[];
    comments: any[];
    messages: any[];
  }>({ reviews: [], comments: [], messages: [] });
  const [activeTab, setActiveTab] = useState<"all" | "reviews" | "comments" | "messages">("all");

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;
    setIsSearching(true);
    try {
      const results = await supabaseSearch.searchAll(searchQuery);
      setContentResults(results);
    } catch (e) {
      setContentResults({ reviews: [], comments: [], messages: [] });
    } finally {
      setIsSearching(false);
    }
  };

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
            <Text className="text-text-secondary mt-1">Search reviews, comments & messages</Text>
          </View>
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
                onChangeText={setSearchQuery}
                autoCapitalize="none"
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
                      <Text className="text-text-muted text-xs ml-2">{message.chat_rooms?.name || "Chat"}</Text>
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

