import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Alert, Switch, Image, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import useAuthStore from "../state/authStore";
import useThemeStore from "../state/themeStore";
import useSubscriptionStore from "../state/subscriptionStore";
import ConfirmationModal from "../components/ConfirmationModal";
import PremiumThemeToggle from "../components/PremiumThemeToggle";

import { useTheme } from "../providers/ThemeProvider";
import { PaywallAdaptive } from "../components/subscription/PaywallAdaptive";
import { LegalModal } from "../components/legal/LegalModal";
import { buildEnv } from "../utils/buildEnvironment";

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, logout, isGuestMode, setGuestMode } = useAuthStore();
  const { theme, isDarkMode, setTheme } = useThemeStore();
  const { colors } = useTheme();
  const { isPremium, isLoading, restorePurchases } = useSubscriptionStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<"privacy" | "terms">("privacy");
  const [notificationsEnabled] = useState(true);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = () => {
    setShowDeleteModal(false);
    // Navigate to delete account screen or handle deletion
    navigation.navigate("DeleteAccount");
  };

  const handleLocationSettings = () => {
    navigation.navigate("LocationSettings");
  };

  const handleNotificationSettings = () => {
    navigation.navigate("Notifications");
  };

  // Privacy settings removed per product direction

  const handleHelpSupport = () => {
    Alert.alert("Help & Support", "Get help with using the app, report issues, or contact our support team.", [
      { text: "OK", style: "default" },
    ]);
  };

  // Firebase test removed per product direction

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View className="px-6 py-6" style={{ backgroundColor: colors.surface[800] }}>
        <View className="flex-row items-center">
          <View className="w-10 h-10 mr-3">
            <Image
              source={require("../../assets/logo-circular.png")}
              style={{ width: 40, height: 40 }}
              resizeMode="contain"
            />
          </View>
          <Text className="text-2xl font-bold" style={{ color: colors.text.primary }}>
            Settings
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1">
        <View className="px-6 py-6">
          {/* Guest Mode Banner */}
          {isGuestMode && (
            <View
              className="border rounded-lg p-4 mb-6"
              style={{
                backgroundColor: `${colors.brand.red}20`,
                borderColor: `${colors.brand.red}30`,
              }}
            >
              <View className="flex-row items-center mb-3">
                <Ionicons name="eye-outline" size={20} color={colors.brand.red} />
                <Text className="font-semibold ml-2" style={{ color: colors.brand.red }}>
                  Browsing as Guest
                </Text>
              </View>
              <Text className="mb-4" style={{ color: colors.text.secondary }}>
                Create an account to share reviews, join chat rooms, and get personalized recommendations.
              </Text>
              <View className="flex-row space-x-3">
                <Pressable
                  className="flex-1 rounded-lg py-3 items-center"
                  style={{ backgroundColor: colors.brand.red }}
                  onPress={() => {
                    setGuestMode(false);
                    navigation.navigate("SignUp");
                  }}
                >
                  <Text className="text-white font-semibold">Sign Up</Text>
                </Pressable>
                <Pressable
                  className="flex-1 rounded-lg py-3 items-center"
                  style={{ backgroundColor: colors.surface[700] }}
                  onPress={() => {
                    setGuestMode(false);
                    navigation.navigate("SignIn");
                  }}
                >
                  <Text className="font-semibold" style={{ color: colors.text.primary }}>
                    Sign In
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* User Info */}
          {!isGuestMode && (
            <View className="rounded-lg p-4 mb-6" style={{ backgroundColor: colors.surface[800] }}>
              <View className="flex-row items-center">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center"
                  style={{ backgroundColor: colors.brand.red }}
                >
                  <Text className="text-black text-xl font-bold">
                    {user?.email ? user.email.charAt(0).toUpperCase() : "A"}
                  </Text>
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-lg font-semibold" style={{ color: colors.text.primary }}>
                    Anonymous User
                  </Text>
                  <Text style={{ color: colors.text.secondary }}>{user?.email}</Text>
                  <Text className="text-sm" style={{ color: colors.text.muted }}>
                    {user?.location?.city || "Unknown"}, {user?.location?.state || "Unknown"}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Settings Options */}
          <View className="rounded-lg mb-6" style={{ backgroundColor: colors.surface[800] }}>
            <Pressable
              className="flex-row items-center justify-between p-5 border-b"
              style={{ borderBottomColor: colors.surface[700] }}
              onPress={handleLocationSettings}
            >
              <View className="flex-row items-center">
                <Ionicons name="location-outline" size={20} color={colors.text.muted} />
                <Text className="font-medium ml-3" style={{ color: colors.text.primary }}>
                  Location
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className="mr-2" style={{ color: colors.text.secondary }}>
                  {user?.location.city}, {user?.location.state}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
              </View>
            </Pressable>

            <Pressable
              className="flex-row items-center justify-between p-5 border-b"
              style={{ borderBottomColor: colors.surface[700] }}
              onPress={handleNotificationSettings}
            >
              <View className="flex-row items-center">
                <Ionicons name="notifications-outline" size={20} color={colors.text.muted} />
                <Text className="font-medium ml-3" style={{ color: colors.text.primary }}>
                  Notifications
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
            </Pressable>

            {/* Premium Theme Toggle - moved outside of settings card */}

            {/** Privacy removed */}

            <Pressable className="flex-row items-center justify-between p-4" onPress={handleHelpSupport}>
              <View className="flex-row items-center">
                <Ionicons name="help-circle-outline" size={20} color={colors.text.muted} />
                <Text className="font-medium ml-3" style={{ color: colors.text.primary }}>
                  Help & Support
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
            </Pressable>
          </View>

          {/* Premium Theme Toggle */}
          <PremiumThemeToggle onShowPaywall={() => setShowPaywall(true)} />

          {/* Subscription Section */}
          <View className="rounded-lg mb-6" style={{ backgroundColor: colors.surface[800] }}>
            <View className="p-5 border-b" style={{ borderBottomColor: colors.surface[700] }}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons
                    name={isPremium ? "diamond" : "diamond-outline"}
                    size={20}
                    color={isPremium ? "#FFD700" : colors.text.muted}
                  />
                  <Text className="font-medium ml-3" style={{ color: colors.text.primary }}>
                    {isPremium ? "Locker Room Plus" : "Upgrade to Plus"}
                  </Text>
                </View>

                {isPremium ? (
                  <View className="px-3 py-1 rounded-full" style={{ backgroundColor: "#22C55E20" }}>
                    <Text className="text-xs font-medium" style={{ color: "#22C55E" }}>
                      {buildEnv.isExpoGo ? "Demo" : "Active"}
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setShowPaywall(true)}
                    className="px-4 py-2 rounded-lg"
                    style={{ backgroundColor: colors.brand.red }}
                  >
                    <Text className="text-white font-medium text-sm">{buildEnv.isExpoGo ? "Try Demo" : "Upgrade"}</Text>
                  </Pressable>
                )}
              </View>

              <Text className="text-sm mt-2" style={{ color: colors.text.secondary }}>
                {isPremium
                  ? `Enjoying ad-free experience and premium features${buildEnv.isExpoGo ? " (Demo)" : ""}`
                  : `Unlock advanced features and remove ads${buildEnv.isExpoGo ? " (Demo available)" : ""}`}
              </Text>
            </View>

            {isPremium && (
              <Pressable
                onPress={async () => {
                  try {
                    await restorePurchases();
                    const message = buildEnv.isExpoGo ? "Demo restore successful!" : "Purchases restored successfully";
                    Alert.alert("Success", message);
                  } catch (error) {
                    const message = buildEnv.isExpoGo ? "Demo restore failed" : "Failed to restore purchases";
                    Alert.alert("Error", message);
                  }
                }}
                className="p-5"
                disabled={isLoading}
              >
                <View className="flex-row items-center">
                  <Ionicons name="refresh-outline" size={20} color={colors.text.muted} />
                  <Text className="font-medium ml-3" style={{ color: colors.text.primary }}>
                    Restore Purchases
                  </Text>
                  {isLoading && <ActivityIndicator size="small" color={colors.brand.red} className="ml-2" />}
                </View>
              </Pressable>
            )}
          </View>

          {/* Legal Documents */}
          <View className="rounded-lg mb-6" style={{ backgroundColor: colors.surface[800] }}>
            <View className="p-5 border-b" style={{ borderBottomColor: colors.surface[700] }}>
              <Text className="font-semibold" style={{ color: colors.text.primary }}>
                Legal
              </Text>
            </View>

            <Pressable
              onPress={() => {
                setLegalModalTab("privacy");
                setShowLegalModal(true);
              }}
              className="p-5 border-b"
              style={{ borderBottomColor: colors.surface[700] }}
            >
              <View className="flex-row items-center">
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.text.muted} />
                <Text className="font-medium ml-3" style={{ color: colors.text.primary }}>
                  Privacy Policy
                </Text>
                <View className="flex-1" />
                <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                setLegalModalTab("terms");
                setShowLegalModal(true);
              }}
              className="p-5"
            >
              <View className="flex-row items-center">
                <Ionicons name="document-text-outline" size={20} color={colors.text.muted} />
                <Text className="font-medium ml-3" style={{ color: colors.text.primary }}>
                  Terms of Service
                </Text>
                <View className="flex-1" />
                <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
              </View>
            </Pressable>
          </View>

          {/* App Info */}
          <View className="rounded-lg mb-6" style={{ backgroundColor: colors.surface[800] }}>
            {/** Firebase Test and Location Filter Demo removed */}

            <View className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center">
                <Ionicons name="information-circle-outline" size={20} color={colors.text.muted} />
                <Text className="font-medium ml-3" style={{ color: colors.text.primary }}>
                  Version
                </Text>
              </View>
              <Text style={{ color: colors.text.secondary }}>1.0.0</Text>
            </View>
          </View>



          {/* Account Actions */}
          <Pressable
            className="rounded-lg p-4 mb-3"
            style={{ backgroundColor: colors.surface[800] }}
            onPress={handleDeleteAccount}
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <Text className="text-red-500 font-medium ml-3">Delete Account</Text>
            </View>
          </Pressable>

          {/* Sign Out */}
          <Pressable className="rounded-lg p-4" style={{ backgroundColor: colors.surface[800] }} onPress={handleLogout}>
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

      {/* Delete Account Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Account"
        message="Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed."
        confirmText="Delete Account"
        cancelText="Cancel"
        confirmColor="red"
        icon="trash-outline"
        onConfirm={confirmDeleteAccount}
        onCancel={() => setShowDeleteModal(false)}
      />

      {/* Paywall Modal */}
      <PaywallAdaptive visible={showPaywall} onClose={() => setShowPaywall(false)} />

      {/* Legal Modal */}
      <LegalModal visible={showLegalModal} onClose={() => setShowLegalModal(false)} initialTab={legalModalTab} />
    </SafeAreaView>
  );
}
