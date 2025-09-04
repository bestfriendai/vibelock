import React from "react";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import useAuthStore from "../state/authStore";

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: logout },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-900">Settings</Text>
      </View>

      <ScrollView className="flex-1">
        <View className="px-4 py-6">
          {/* User Info */}
          <View className="bg-white rounded-lg p-4 mb-6">
            <View className="flex-row items-center">
              <View className="w-16 h-16 bg-red-500 rounded-full items-center justify-center">
                <Text className="text-white text-xl font-bold">
                  {user?.email.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-lg font-semibold text-gray-900">
                  Anonymous User
                </Text>
                <Text className="text-gray-600">{user?.email}</Text>
                <Text className="text-gray-500 text-sm">
                  {user?.location.city}, {user?.location.state}
                </Text>
              </View>
            </View>
          </View>

          {/* Settings Options */}
          <View className="bg-white rounded-lg mb-6">
            <Pressable className="flex-row items-center justify-between p-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="location-outline" size={20} color="#6B7280" />
                <Text className="text-gray-900 font-medium ml-3">Location</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-gray-500 mr-2">
                  {user?.location.city}, {user?.location.state}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </View>
            </Pressable>

            <Pressable className="flex-row items-center justify-between p-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="notifications-outline" size={20} color="#6B7280" />
                <Text className="text-gray-900 font-medium ml-3">Notifications</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </Pressable>

            <Pressable className="flex-row items-center justify-between p-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="shield-outline" size={20} color="#6B7280" />
                <Text className="text-gray-900 font-medium ml-3">Privacy</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </Pressable>

            <Pressable className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center">
                <Ionicons name="help-circle-outline" size={20} color="#6B7280" />
                <Text className="text-gray-900 font-medium ml-3">Help & Support</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </Pressable>
          </View>

          {/* App Info */}
          <View className="bg-white rounded-lg mb-6">
            <Pressable className="flex-row items-center justify-between p-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="document-text-outline" size={20} color="#6B7280" />
                <Text className="text-gray-900 font-medium ml-3">Terms of Service</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </Pressable>

            <Pressable className="flex-row items-center justify-between p-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="lock-closed-outline" size={20} color="#6B7280" />
                <Text className="text-gray-900 font-medium ml-3">Privacy Policy</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </Pressable>

            <View className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center">
                <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
                <Text className="text-gray-900 font-medium ml-3">Version</Text>
              </View>
              <Text className="text-gray-500">1.0.0</Text>
            </View>
          </View>

          {/* Sign Out */}
          <Pressable
            className="bg-white rounded-lg p-4"
            onPress={handleLogout}
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text className="text-red-500 font-medium ml-3">Sign Out</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}