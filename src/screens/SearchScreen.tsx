import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [radius, setRadius] = useState(50);

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

      <ScrollView className="flex-1">
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
                  name="search"
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

          {/* Search Results Placeholder */}
          <View className="items-center justify-center py-12">
            <Ionicons name="search-outline" size={48} color="#6B7280" />
            <Text className="text-text-secondary text-lg font-medium mt-4">
              Search for someone
            </Text>
            <Text className="text-text-muted text-center mt-2">
              Enter a first name to find reviews
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}