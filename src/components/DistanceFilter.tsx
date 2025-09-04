import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface DistanceFilterProps {
  currentDistance: number;
  onDistanceChange: (distance: number) => void;
}

const distanceOptions = [
  { value: 5, label: "5 miles" },
  { value: 10, label: "10 miles" },
  { value: 25, label: "25 miles" },
  { value: 50, label: "50 miles" },
  { value: 100, label: "100 miles" },
  { value: -1, label: "Show all" }
];

export default function DistanceFilter({ currentDistance, onDistanceChange }: DistanceFilterProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const getCurrentLabel = () => {
    const option = distanceOptions.find(opt => opt.value === currentDistance);
    return option ? option.label : `${currentDistance} miles`;
  };

  const handleDistanceSelect = (distance: number) => {
    onDistanceChange(distance);
    setModalVisible(false);
  };

  const renderDistanceOption = ({ item }: { item: typeof distanceOptions[0] }) => (
    <Pressable
      onPress={() => handleDistanceSelect(item.value)}
      className="px-4 py-4 border-b border-surface-700 flex-row items-center justify-between"
    >
      <Text className="text-text-primary font-medium">{item.label}</Text>
      {currentDistance === item.value && (
        <Ionicons name="checkmark" size={20} color="#FFFFFF" />
      )}
    </Pressable>
  );

  return (
    <>
      <Pressable 
        className="bg-surface-700 px-3 py-2 rounded-full flex-row items-center"
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="location-outline" size={16} color="#F3F4F6" />
        <Text className="text-text-primary text-sm font-medium ml-1">
          {currentDistance === -1 ? "All" : `${currentDistance}mi`}
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
            <Text className="text-text-primary text-lg font-semibold">Distance Filter</Text>
            <Pressable
              onPress={() => setModalVisible(false)}
              className="w-8 h-8 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#F3F4F6" />
            </Pressable>
          </View>

          {/* Description */}
          <View className="px-4 py-3 border-b border-surface-700">
            <Text className="text-text-secondary text-sm">
              Choose how far you want to see reviews from your location
            </Text>
          </View>

          {/* Distance Options */}
          <FlatList
            data={distanceOptions}
            renderItem={renderDistanceOption}
            keyExtractor={(item) => item.value.toString()}
            className="flex-1"
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>
    </>
  );
}