import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Alert, Switch, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import useAuthStore from "../state/authStore";
import ConfirmationModal from "../components/ConfirmationModal";

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, logout, isGuestMode, setGuestMode } = useAuthStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  const handleLocationSettings = () => {
    Alert.alert("Location Settings", "Update your location to see reviews and chat rooms in your area.", [
      { text: "Cancel", style: "cancel" },
      { text: "Update Location", onPress: () => console.log("Update location") },
    ]);
  };

  const handleNotificationSettings = () => {
    Alert.alert(
      "Notification Settings",
      "Manage your notification preferences for new reviews, messages, and safety alerts.",
      [{ text: "OK", style: "default" }],
    );
  };

  const handlePrivacySettings = () => {
    Alert.alert("Privacy Settings", "Control who can see your activity and manage blocked users.", [
      { text: "OK", style: "default" },
    ]);
  };

  const handleHelpSupport = () => {
    Alert.alert("Help & Support", "Get help with using the app, report issues, or contact our support team.", [
      { text: "OK", style: "default" },
    ]);
  };

  const handleTermsOfService = () => {
    Alert.alert("Terms of Service", "View our terms of service and user agreement.", [
      { text: "OK", style: "default" },
    ]);
  };

  const handlePrivacyPolicy = () => {
    Alert.alert("Privacy Policy", "Learn how we protect your privacy and handle your data.", [
      { text: "OK", style: "default" },
    ]);
  };

  const handleFirebaseTest = () => {
    navigation.navigate("FirebaseTest");
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
          <Text className="text-2xl font-bold text-text-primary">Settings</Text>
        </View>
      </View>

      <ScrollView className="flex-1">
        <View className="px-4 py-6">
          {/* Guest Mode Banner */}
          {isGuestMode && (
            <View className="bg-brand-red/20 border border-brand-red/30 rounded-lg p-4 mb-6">
              <View className="flex-row items-center mb-3">
                <Ionicons name="eye-outline" size={20} color="#FF6B6B" />
                <Text className="text-brand-red font-semibold ml-2">Browsing as Guest</Text>
              </View>
              <Text className="text-text-secondary mb-4">
                Create an account to share reviews, join chat rooms, and get personalized recommendations.
              </Text>
              <View className="flex-row space-x-3">
                <Pressable
                  className="flex-1 bg-brand-red rounded-lg py-3 items-center"
                  onPress={() => {
                    setGuestMode(false);
                    navigation.navigate("SignUp");
                  }}
                >
                  <Text className="text-white font-semibold">Sign Up</Text>
                </Pressable>
                <Pressable
                  className="flex-1 bg-surface-700 rounded-lg py-3 items-center"
                  onPress={() => {
                    setGuestMode(false);
                    navigation.navigate("SignIn");
                  }}
                >
                  <Text className="text-text-primary font-semibold">Sign In</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* User Info */}
          {!isGuestMode && (
            <View className="bg-surface-800 rounded-lg p-4 mb-6">
              <View className="flex-row items-center">
                <View className="w-16 h-16 bg-brand-red rounded-full items-center justify-center">
                  <Text className="text-black text-xl font-bold">{user?.email.charAt(0).toUpperCase()}</Text>
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-lg font-semibold text-text-primary">Anonymous User</Text>
                  <Text className="text-text-secondary">{user?.email}</Text>
                  <Text className="text-text-muted text-sm">
                    {user?.location.city}, {user?.location.state}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Settings Options */}
          <View className="bg-surface-800 rounded-lg mb-6">
            <Pressable
              className="flex-row items-center justify-between p-4 border-b border-surface-700"
              onPress={handleLocationSettings}
            >
              <View className="flex-row items-center">
                <Ionicons name="location-outline" size={20} color="#9CA3AF" />
                <Text className="text-text-primary font-medium ml-3">Location</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-text-secondary mr-2">
                  {user?.location.city}, {user?.location.state}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </View>
            </Pressable>

            <Pressable
              className="flex-row items-center justify-between p-4 border-b border-surface-700"
              onPress={handleNotificationSettings}
            >
              <View className="flex-row items-center">
                <Ionicons name="notifications-outline" size={20} color="#9CA3AF" />
                <Text className="text-text-primary font-medium ml-3">Notifications</Text>
              </View>
              <View className="flex-row items-center">
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: "#374151", true: "#FFFFFF" }}
                  thumbColor={notificationsEnabled ? "#FFFFFF" : "#9CA3AF"}
                />
              </View>
            </Pressable>

            <Pressable
              className="flex-row items-center justify-between p-4 border-b border-surface-700"
              onPress={handlePrivacySettings}
            >
              <View className="flex-row items-center">
                <Ionicons name="shield-outline" size={20} color="#9CA3AF" />
                <Text className="text-text-primary font-medium ml-3">Privacy</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </Pressable>

            <Pressable className="flex-row items-center justify-between p-4" onPress={handleHelpSupport}>
              <View className="flex-row items-center">
                <Ionicons name="help-circle-outline" size={20} color="#9CA3AF" />
                <Text className="text-text-primary font-medium ml-3">Help & Support</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </Pressable>
          </View>

          {/* App Info */}
          <View className="bg-surface-800 rounded-lg mb-6">
            <Pressable
              className="flex-row items-center justify-between p-4 border-b border-surface-700"
              onPress={handleTermsOfService}
            >
              <View className="flex-row items-center">
                <Ionicons name="document-text-outline" size={20} color="#9CA3AF" />
                <Text className="text-text-primary font-medium ml-3">Terms of Service</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </Pressable>

            <Pressable
              className="flex-row items-center justify-between p-4 border-b border-surface-700"
              onPress={handlePrivacyPolicy}
            >
              <View className="flex-row items-center">
                <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
                <Text className="text-text-primary font-medium ml-3">Privacy Policy</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </Pressable>

            <Pressable
              className="flex-row items-center justify-between p-4 border-b border-surface-700"
              onPress={handleFirebaseTest}
            >
              <View className="flex-row items-center">
                <Ionicons name="server-outline" size={20} color="#9CA3AF" />
                <Text className="text-text-primary font-medium ml-3">Firebase Test</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </Pressable>

            <View className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center">
                <Ionicons name="information-circle-outline" size={20} color="#9CA3AF" />
                <Text className="text-text-primary font-medium ml-3">Version</Text>
              </View>
              <Text className="text-text-secondary">1.0.0</Text>
            </View>
          </View>

          {/* Sign Out */}
          <Pressable className="bg-surface-800 rounded-lg p-4" onPress={handleLogout}>
            <View className="flex-row items-center justify-center">
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text className="text-red-500 font-medium ml-3">Sign Out</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        visible={showLogoutModal}
        title="Sign Out"
        message="Are you sure you want to sign out? You'll need to sign in again to access your account."
        confirmText="Sign Out"
        cancelText="Cancel"
        confirmColor="red"
        icon="log-out-outline"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </SafeAreaView>
  );
}
