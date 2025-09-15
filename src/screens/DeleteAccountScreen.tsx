import React, { useState } from "react";
import { View, Text, Pressable, Alert, ActivityIndicator, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import useAuthStore from "../state/authStore";
import { usersService } from "../services/users";
import { authService } from "../services/auth";
import { notificationService } from "../services/notificationService";

export default function DeleteAccountScreen() {
  const { user, logout } = useAuthStore();
  const [isDeleting, setIsDeleting] = useState(false);

  const startDeletion = async () => {
    if (!user?.id) return;
    Alert.alert(
      "Delete Account",
      "This removes your profile data and signs you out. Deleting your auth identity requires a secure server. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: confirmDeletion },
      ],
    );
  };

  const confirmDeletion = async () => {
    if (!user?.id) return;
    try {
      setIsDeleting(true);
      await notificationService.removePushToken();
      await authService.deleteAccount();
      await logout();
      Alert.alert(
        "Account Deleted",
        "Your profile data has been removed and you have been signed out. For full auth deletion, contact support.",
      );
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      <View className="px-4 py-6">
        <View className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <View className="flex-row items-center mb-2">
            <Ionicons name="warning" size={20} color="#EF4444" />
            <Text className="text-red-400 font-semibold ml-2">Danger Zone</Text>
          </View>
          <Text className="text-text-secondary">
            Deleting your account removes your profile and related app data. Authentication deletion requires a server
            function. We’ll sign you out and remove your profile now.
          </Text>
          <Pressable
            onPress={() => Linking.openURL("mailto:support@lockerroom.app?subject=Account%20Deletion%20Request")}
            className="mt-2"
          >
            <Text className="text-brand-red">Contact support for full deletion</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={startDeletion}
          disabled={isDeleting}
          className={`mt-6 bg-red-600 rounded-xl py-4 items-center ${isDeleting ? "opacity-60" : ""}`}
        >
          {isDeleting ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text className="text-black font-semibold">Delete My Account</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
