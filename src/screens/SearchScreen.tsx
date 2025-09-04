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
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 py-3 border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-900">Search</Text>
        <Text className="text-gray-600 mt-1">Find people by first name</Text>
      </View>

      <ScrollView className="flex-1">
        <View className="px-4 py-6">
          {/* Search Input */}
          <View className="mb-6">
            <Text className="text-gray-700 font-medium mb-2">First Name</Text>
            <View className="relative">
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 pr-12 text-gray-900"
                placeholder="Enter first name..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="words"
              />
              <Ionicons
                name="search"
                size={20}
                color="#6B7280"
                className="absolute right-3 top-3"
              />
            </View>
          </View>

          {/* Radius Filter */}
          <View className="mb-6">
            <Text className="text-gray-700 font-medium mb-2">
              Search Radius: {radius} miles
            </Text>
            <View className="flex-row items-center space-x-4">
              <Pressable
                className="bg-gray-100 rounded-lg px-3 py-2"
                onPress={() => setRadius(10)}
              >
                <Text className={radius === 10 ? "text-red-500 font-medium" : "text-gray-700"}>
                  10mi
                </Text>
              </Pressable>
              <Pressable
                className="bg-gray-100 rounded-lg px-3 py-2"
                onPress={() => setRadius(25)}
              >
                <Text className={radius === 25 ? "text-red-500 font-medium" : "text-gray-700"}>
                  25mi
                </Text>
              </Pressable>
              <Pressable
                className="bg-gray-100 rounded-lg px-3 py-2"
                onPress={() => setRadius(50)}
              >
                <Text className={radius === 50 ? "text-red-500 font-medium" : "text-gray-700"}>
                  50mi
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Search Results Placeholder */}
          <View className="items-center justify-center py-12">
            <Ionicons name="search-outline" size={48} color="#9CA3AF" />
            <Text className="text-gray-500 text-lg font-medium mt-4">
              Search for someone
            </Text>
            <Text className="text-gray-400 text-center mt-2">
              Enter a first name to find reviews
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}