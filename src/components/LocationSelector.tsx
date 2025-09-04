import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  FlatList,
  Keyboard
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Location {
  city: string;
  state: string;
  fullName: string;
}

interface LocationSelectorProps {
  currentLocation: Location;
  onLocationChange: (location: Location) => void;
}

// Mock location data for autocomplete
const mockLocations: Location[] = [
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
  { city: "Takoma Park", state: "MD", fullName: "Takoma Park, MD" }
];

export default function LocationSelector({ currentLocation, onLocationChange }: LocationSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filteredLocations, setFilteredLocations] = useState<Location[]>(mockLocations);

  useEffect(() => {
    if (searchText.trim() === "") {
      setFilteredLocations(mockLocations);
    } else {
      const filtered = mockLocations.filter(location =>
        location.fullName.toLowerCase().includes(searchText.toLowerCase()) ||
        location.city.toLowerCase().includes(searchText.toLowerCase()) ||
        location.state.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredLocations(filtered);
    }
  }, [searchText]);

  const handleLocationSelect = (location: Location) => {
    onLocationChange(location);
    setModalVisible(false);
    setSearchText("");
    Keyboard.dismiss();
  };

  const renderLocationItem = ({ item }: { item: Location }) => (
    <Pressable
      onPress={() => handleLocationSelect(item)}
      className="px-4 py-3 border-b border-surface-700"
    >
      <Text className="text-text-primary font-medium">{item.fullName}</Text>
    </Pressable>
  );

  return (
    <>
      <Pressable 
        className="flex-row items-center bg-surface-700 px-3 py-2 rounded-full"
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="location-outline" size={16} color="#F3F4F6" />
        <Text className="text-text-primary text-sm ml-1 font-medium">
          {currentLocation.city}, {currentLocation.state}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#F3F4F6" style={{ marginLeft: 4 }} />
      </Pressable>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-surface-900">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-surface-700">
            <Text className="text-text-primary text-lg font-semibold">Select Location</Text>
            <Pressable
              onPress={() => setModalVisible(false)}
              className="w-8 h-8 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#F3F4F6" />
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
                placeholderTextColor="#9CA3AF"
                className="flex-1 ml-2 text-text-primary"
                autoFocus
              />
              {searchText.length > 0 && (
                <Pressable onPress={() => setSearchText("")}>
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </Pressable>
              )}
            </View>
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
              <Ionicons name="location-outline" size={48} color="#6B7280" />
              <Text className="text-text-secondary text-lg font-medium mt-4">No locations found</Text>
              <Text className="text-text-muted text-center mt-2 px-8">
                Try searching for a different city or state
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}