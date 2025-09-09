import React, { useState } from "react";
import { View, Text, Pressable, SafeAreaView, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import useAuthStore from "../state/authStore";
import LocationSelector from "../components/LocationSelector";
import { getCurrentLocation, reverseGeocodeLocation } from "../utils/location";

interface Location {
  city: string;
  state: string;
  fullName: string;
  type?: "city" | "college";
  institutionType?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export default function LocationSettingsScreen() {
  const navigation = useNavigation();
  const { user, updateUserLocation } = useAuthStore();
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [isUsingGPS, setIsUsingGPS] = useState(false);

  const currentLocation: Location = {
    city: user?.location.city || "Unknown",
    state: user?.location.state || "Unknown",
    fullName: user?.location.fullName || `${user?.location.city || "Unknown"}, ${user?.location.state || "Unknown"}`,
    type: user?.location.type,
    institutionType: user?.location.institutionType,
    coordinates: user?.location.coordinates,
  };

  const handleLocationChange = async (
    location: Location & { coordinates?: { latitude: number; longitude: number } },
  ) => {
    setIsUpdatingLocation(true);
    try {
      await updateUserLocation({
        city: location.city,
        state: location.state,
        coordinates: location.coordinates,
        type: location.type,
        fullName: location.fullName,
        institutionType: location.institutionType,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Location Updated",
        `Your location has been updated to ${location.fullName}${location.coordinates ? " with GPS coordinates" : ""}.`,
        [{ text: "OK" }],
      );
    } catch (error) {
      console.error("Failed to update location:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Update Failed", "Failed to update your location. Please try again.", [{ text: "OK" }]);
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    setIsUsingGPS(true);
    try {
      const coordinates = await getCurrentLocation();
      if (!coordinates) {
        Alert.alert(
          "Location Access Denied",
          "Please enable location services and grant permission to use your current location.",
          [{ text: "OK" }],
        );
        return;
      }

      const locationData = await reverseGeocodeLocation(coordinates);
      if (locationData) {
        const location: Location = {
          city: locationData.city,
          state: locationData.state,
          fullName: `${locationData.city}, ${locationData.state}`,
          coordinates,
        };

        await handleLocationChange(location);
      } else {
        Alert.alert("Location Error", "Unable to determine your location. Please try selecting manually.", [
          { text: "OK" },
        ]);
      }
    } catch (error) {
      console.error("GPS location error:", error);
      Alert.alert("Location Error", "Failed to get your current location. Please try again or select manually.", [
        { text: "OK" },
      ]);
    } finally {
      setIsUsingGPS(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      {/* Header */}
      <View className="bg-black px-6 py-4 flex-row items-center">
        <Pressable onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#F3F4F6" />
        </Pressable>
        <Text className="text-xl font-bold text-text-primary">Location Settings</Text>
      </View>

      <View className="flex-1 px-6 py-6">
        {/* Current Location */}
        <View className="bg-surface-800 rounded-lg p-5 mb-6">
          <Text className="text-text-primary font-semibold text-lg mb-3">Current Location</Text>
          <View className="flex-row items-center">
            <Ionicons name="location" size={20} color="#9CA3AF" />
            <Text className="text-text-secondary ml-2 flex-1">{currentLocation.fullName}</Text>
            {user?.location.coordinates && (
              <View className="bg-green-500/20 px-2 py-1 rounded">
                <Text className="text-green-400 text-xs font-medium">GPS</Text>
              </View>
            )}
          </View>
          {user?.location.coordinates && (
            <Text className="text-text-tertiary text-sm mt-2">
              Coordinates: {user.location.coordinates.latitude.toFixed(4)},{" "}
              {user.location.coordinates.longitude.toFixed(4)}
            </Text>
          )}
        </View>

        {/* Use Current Location Button */}
        <Pressable
          onPress={handleUseCurrentLocation}
          disabled={isUsingGPS}
          className="bg-brand-red rounded-lg p-4 mb-6 flex-row items-center justify-center"
        >
          {isUsingGPS ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="locate" size={20} color="#FFFFFF" />
          )}
          <Text className="text-white font-semibold ml-2">
            {isUsingGPS ? "Getting Location..." : "Use Current Location"}
          </Text>
        </Pressable>

        {/* Manual Location Selection */}
        <View className="bg-surface-800 rounded-lg p-5 mb-6">
          <Text className="text-text-primary font-semibold text-lg mb-4">Select Location</Text>
          <LocationSelector currentLocation={currentLocation} onLocationChange={handleLocationChange} />
        </View>

        {/* Info */}
        <View className="bg-surface-800/50 rounded-lg p-4">
          <View className="flex-row items-start">
            <Ionicons name="information-circle-outline" size={20} color="#9CA3AF" />
            <View className="ml-3 flex-1">
              <Text className="text-text-secondary text-sm">
                Your location is used to show reviews and chat rooms in your area. Using GPS provides more accurate
                distance filtering.
              </Text>
            </View>
          </View>
        </View>

        {/* Loading Overlay */}
        {isUpdatingLocation && (
          <View className="absolute inset-0 bg-black/50 items-center justify-center">
            <View className="bg-surface-800 rounded-lg p-6 items-center">
              <ActivityIndicator size="large" color="#FF6B6B" />
              <Text className="text-text-primary mt-3">Updating location...</Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
