import React, { useState, useEffect } from "react";
import { View, Text, Pressable, Modal, TextInput, FlatList, Keyboard, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { getCurrentLocation, reverseGeocodeLocation, searchLocations, geocodeCityStateCached } from "../utils/location";
import { useTheme } from "../providers/ThemeProvider";

interface Location {
  city: string;
  state: string;
  fullName: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface LocationSelectorProps {
  currentLocation: Location;
  onLocationChange: (location: Location & { coordinates?: { latitude: number; longitude: number } }) => void;
}

// Expanded location data for nationwide autocomplete
const mockLocations: Location[] = [
  // DMV Area
  { city: "Washington", state: "DC", fullName: "Washington, DC" },
  { city: "Alexandria", state: "VA", fullName: "Alexandria, VA" },
  { city: "Arlington", state: "VA", fullName: "Arlington, VA" },
  { city: "Bethesda", state: "MD", fullName: "Bethesda, MD" },
  { city: "Silver Spring", state: "MD", fullName: "Silver Spring, MD" },
  { city: "Rockville", state: "MD", fullName: "Rockville, MD" },
  { city: "Falls Church", state: "VA", fullName: "Falls Church, VA" },
  { city: "Fairfax", state: "VA", fullName: "Fairfax, VA" },
  { city: "Reston", state: "VA", fullName: "Reston, VA" },
  { city: "Tysons", state: "VA", fullName: "Tysons, VA" },
  { city: "McLean", state: "VA", fullName: "McLean, VA" },
  { city: "Herndon", state: "VA", fullName: "Herndon, VA" },
  { city: "Gaithersburg", state: "MD", fullName: "Gaithersburg, MD" },
  { city: "College Park", state: "MD", fullName: "College Park, MD" },
  { city: "Takoma Park", state: "MD", fullName: "Takoma Park, MD" },
  { city: "Baltimore", state: "MD", fullName: "Baltimore, MD" },
  { city: "Richmond", state: "VA", fullName: "Richmond, VA" },
  { city: "Virginia Beach", state: "VA", fullName: "Virginia Beach, VA" },

  // Major US Cities
  { city: "New York", state: "NY", fullName: "New York, NY" },
  { city: "Los Angeles", state: "CA", fullName: "Los Angeles, CA" },
  { city: "Chicago", state: "IL", fullName: "Chicago, IL" },
  { city: "Houston", state: "TX", fullName: "Houston, TX" },
  { city: "Phoenix", state: "AZ", fullName: "Phoenix, AZ" },
  { city: "Philadelphia", state: "PA", fullName: "Philadelphia, PA" },
  { city: "San Antonio", state: "TX", fullName: "San Antonio, TX" },
  { city: "San Diego", state: "CA", fullName: "San Diego, CA" },
  { city: "Dallas", state: "TX", fullName: "Dallas, TX" },
  { city: "San Jose", state: "CA", fullName: "San Jose, CA" },
  { city: "Austin", state: "TX", fullName: "Austin, TX" },
  { city: "Jacksonville", state: "FL", fullName: "Jacksonville, FL" },
  { city: "Fort Worth", state: "TX", fullName: "Fort Worth, TX" },
  { city: "Columbus", state: "OH", fullName: "Columbus, OH" },
  { city: "Charlotte", state: "NC", fullName: "Charlotte, NC" },
  { city: "San Francisco", state: "CA", fullName: "San Francisco, CA" },
  { city: "Indianapolis", state: "IN", fullName: "Indianapolis, IN" },
  { city: "Seattle", state: "WA", fullName: "Seattle, WA" },
  { city: "Denver", state: "CO", fullName: "Denver, CO" },
  { city: "Boston", state: "MA", fullName: "Boston, MA" },
  { city: "El Paso", state: "TX", fullName: "El Paso, TX" },
  { city: "Detroit", state: "MI", fullName: "Detroit, MI" },
  { city: "Nashville", state: "TN", fullName: "Nashville, TN" },
  { city: "Portland", state: "OR", fullName: "Portland, OR" },
  { city: "Memphis", state: "TN", fullName: "Memphis, TN" },
  { city: "Oklahoma City", state: "OK", fullName: "Oklahoma City, OK" },
  { city: "Las Vegas", state: "NV", fullName: "Las Vegas, NV" },
  { city: "Louisville", state: "KY", fullName: "Louisville, KY" },
  { city: "Milwaukee", state: "WI", fullName: "Milwaukee, WI" },
  { city: "Albuquerque", state: "NM", fullName: "Albuquerque, NM" },
  { city: "Tucson", state: "AZ", fullName: "Tucson, AZ" },
  { city: "Fresno", state: "CA", fullName: "Fresno, CA" },
  { city: "Mesa", state: "AZ", fullName: "Mesa, AZ" },
  { city: "Sacramento", state: "CA", fullName: "Sacramento, CA" },
  { city: "Atlanta", state: "GA", fullName: "Atlanta, GA" },
  { city: "Kansas City", state: "MO", fullName: "Kansas City, MO" },
  { city: "Colorado Springs", state: "CO", fullName: "Colorado Springs, CO" },
  { city: "Miami", state: "FL", fullName: "Miami, FL" },
  { city: "Raleigh", state: "NC", fullName: "Raleigh, NC" },
  { city: "Omaha", state: "NE", fullName: "Omaha, NE" },
  { city: "Long Beach", state: "CA", fullName: "Long Beach, CA" },
  { city: "Oakland", state: "CA", fullName: "Oakland, CA" },
  { city: "Minneapolis", state: "MN", fullName: "Minneapolis, MN" },
  { city: "Tulsa", state: "OK", fullName: "Tulsa, OK" },
  { city: "Tampa", state: "FL", fullName: "Tampa, FL" },
  { city: "New Orleans", state: "LA", fullName: "New Orleans, LA" },

  // College Towns
  { city: "Ann Arbor", state: "MI", fullName: "Ann Arbor, MI" },
  { city: "Berkeley", state: "CA", fullName: "Berkeley, CA" },
  { city: "Cambridge", state: "MA", fullName: "Cambridge, MA" },
  { city: "Chapel Hill", state: "NC", fullName: "Chapel Hill, NC" },
  { city: "Gainesville", state: "FL", fullName: "Gainesville, FL" },
  { city: "Iowa City", state: "IA", fullName: "Iowa City, IA" },
  { city: "Madison", state: "WI", fullName: "Madison, WI" },
  { city: "Norman", state: "OK", fullName: "Norman, OK" },
  { city: "Palo Alto", state: "CA", fullName: "Palo Alto, CA" },
  { city: "State College", state: "PA", fullName: "State College, PA" },
  { city: "Tempe", state: "AZ", fullName: "Tempe, AZ" },
  { city: "Tuscaloosa", state: "AL", fullName: "Tuscaloosa, AL" },

  // Popular Suburbs and Mid-size Cities
  { city: "Plano", state: "TX", fullName: "Plano, TX" },
  { city: "Irvine", state: "CA", fullName: "Irvine, CA" },
  { city: "Chandler", state: "AZ", fullName: "Chandler, AZ" },
  { city: "Scottsdale", state: "AZ", fullName: "Scottsdale, AZ" },
  { city: "Bellevue", state: "WA", fullName: "Bellevue, WA" },
  { city: "Naperville", state: "IL", fullName: "Naperville, IL" },
  { city: "Cary", state: "NC", fullName: "Cary, NC" },
  { city: "Boulder", state: "CO", fullName: "Boulder, CO" },
  { city: "Stamford", state: "CT", fullName: "Stamford, CT" },
  { city: "Jersey City", state: "NJ", fullName: "Jersey City, NJ" },
];

export default function LocationSelector({ currentLocation, onLocationChange }: LocationSelectorProps) {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filteredLocations, setFilteredLocations] = useState<Location[]>(mockLocations);
  const [isLoadingCurrentLocation, setIsLoadingCurrentLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    const searchAsync = async () => {
      if (searchText.trim() === "") {
        setFilteredLocations(mockLocations);
      } else {
        // First filter local mock data
        const localFiltered = mockLocations.filter(
          (location) =>
            location.fullName.toLowerCase().includes(searchText.toLowerCase()) ||
            location.city.toLowerCase().includes(searchText.toLowerCase()) ||
            location.state.toLowerCase().includes(searchText.toLowerCase()),
        );

        // If we have local results, use them
        if (localFiltered.length > 0) {
          setFilteredLocations(localFiltered);
        } else {
          // Try geocoding search for broader results
          try {
            const searchResults = await searchLocations(searchText);
            const formattedResults: Location[] = searchResults.map((result) => ({
              city: result.city,
              state: result.state,
              fullName: `${result.city}, ${result.state}`,
              coordinates: result.coordinates,
            }));
            setFilteredLocations(formattedResults);
          } catch (error) {
            // Fall back to local filtered results even if empty
            setFilteredLocations(localFiltered);
          }
        }
      }
    };

    const timeoutId = setTimeout(searchAsync, 300); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [searchText]);

  const handleLocationSelect = async (location: Location) => {
    console.log('📍 Location selected:', location);

    // Use provided coordinates when available, otherwise geocode with device for worldwide support
    try {
      let coordinates = location.coordinates;
      if (!coordinates) {
        coordinates = await geocodeCityStateCached(location.city, location.state) || undefined;
      }

      console.log('✅ Found coordinates:', coordinates);
      // Pass location with coordinates to parent
      onLocationChange({
        ...location,
        coordinates,
      });
    } catch (error) {
      console.warn("Failed to get coordinates for location:", error);
      // Fallback to location without coordinates
      onLocationChange(location);
    }

    setModalVisible(false);
    setSearchText("");
    setLocationError(null);
    Keyboard.dismiss();
  };

  const handleCurrentLocation = async () => {
    setIsLoadingCurrentLocation(true);
    setLocationError(null);

    try {
      const coordinates = await getCurrentLocation();
      if (!coordinates) {
        setLocationError("Location permission denied or unavailable");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setIsLoadingCurrentLocation(false);
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
        // Haptic feedback for successful location detection
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        handleLocationSelect(location);
      } else {
        setLocationError("Unable to determine your location");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      setLocationError("Error getting your location");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoadingCurrentLocation(false);
    }
  };

  const renderLocationItem = ({ item }: { item: Location }) => (
    <Pressable
      onPress={() => {
        console.log('🏙️ Location item pressed:', item.fullName);
        handleLocationSelect(item);
      }}
      className="px-4 py-3 border-b border-surface-700"
    >
      <Text className="font-medium" style={{ color: colors.text.primary }}>{item.fullName}</Text>
    </Pressable>
  );

  return (
    <>
      <Pressable
        className="flex-row items-center bg-surface-700 px-3 py-2 rounded-full"
        onPress={() => {
          console.log('🔘 Location selector pressed');
          setModalVisible(true);
        }}
      >
        <Ionicons name="location-outline" size={16} color={colors.text.primary} />
        <Text className="text-sm ml-1 font-medium" style={{ color: colors.text.primary }}>
          {currentLocation.city}, {currentLocation.state}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.text.primary} style={{ marginLeft: 4 }} />
      </Pressable>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-6 border-b" style={{ borderBottomColor: colors.surface[700] }}>
            <Text className="text-lg font-semibold" style={{ color: colors.text.primary }}>Select Location</Text>
            <Pressable onPress={() => setModalVisible(false)} className="w-8 h-8 items-center justify-center">
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </Pressable>
          </View>

          {/* Search Input */}
          <View className="px-4 py-3 border-b border-surface-700">
            <View className="flex-row items-center bg-surface-800 rounded-lg px-3 py-2">
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search cities..."
                placeholderTextColor={colors.text.muted}
                className="flex-1 ml-2"
                style={{ color: colors.text.primary }}
                autoFocus
              />
              {searchText.length > 0 && (
                <Pressable onPress={() => setSearchText("")}>
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </Pressable>
              )}
            </View>
          </View>

          {/* Current Location Button */}
          <View className="px-4 py-3 border-b border-surface-700">
            <Pressable
              onPress={handleCurrentLocation}
              disabled={isLoadingCurrentLocation}
              className="flex-row items-center bg-brand-red/20 border border-brand-red/30 rounded-lg px-4 py-3"
            >
              {isLoadingCurrentLocation ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="location" size={20} color="#FFFFFF" />
              )}
              <Text className="font-medium ml-3" style={{ color: colors.brand.red }}>
                {isLoadingCurrentLocation ? "Getting your location..." : "Use Current Location"}
              </Text>
            </Pressable>
            {locationError && <Text className="text-sm mt-2 px-1" style={{ color: "#EF4444" }}>{locationError}</Text>}
          </View>

          {/* Location List */}
          <FlatList
            data={filteredLocations}
            renderItem={renderLocationItem}
            keyExtractor={(item) => item.fullName}
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />

          {filteredLocations.length === 0 && (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="location-outline" size={48} color={colors.text.muted} />
              <Text className="text-lg font-medium mt-4" style={{ color: colors.text.secondary }}>No locations found</Text>
              <Text className="text-center mt-2 px-8" style={{ color: colors.text.muted }}>Try searching for a different city or state</Text>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}
