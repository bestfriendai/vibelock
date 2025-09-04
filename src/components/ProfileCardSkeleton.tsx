import React from "react";
import { View, Dimensions } from "react-native";

const { width: screenWidth } = Dimensions.get("window");
const cardWidth = (screenWidth - 48) / 2;

interface Props {
  cardHeight?: number;
}

export default function ProfileCardSkeleton({ cardHeight = 280 }: Props) {
  return (
    <View 
      className="bg-surface-800 rounded-2xl mb-4 overflow-hidden"
      style={{ width: cardWidth, height: cardHeight }}
    >
      {/* Image skeleton */}
      <View className="flex-1 bg-surface-700" />
      
      {/* Gradient overlay skeleton */}
      <View 
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent"
        style={{ height: cardHeight * 0.6 }}
      />
      
      {/* Button skeletons */}
      <View className="absolute top-3 right-3 w-8 h-8 bg-surface-600 rounded-full" />
      <View className="absolute top-3 left-3 w-8 h-8 bg-surface-600 rounded-full" />
      
      {/* Content skeleton */}
      <View className="absolute bottom-0 left-0 right-0 p-4">
        <View className="w-3/4 h-5 bg-surface-600 rounded mb-2" />
        <View className="w-full h-3 bg-surface-600 rounded mb-1" />
        <View className="w-5/6 h-3 bg-surface-600 rounded mb-3" />
        
        {/* Flag skeletons */}
        <View className="flex-row gap-1">
          <View className="w-16 h-5 bg-surface-600 rounded-full" />
          <View className="w-12 h-5 bg-surface-600 rounded-full" />
        </View>
      </View>
    </View>
  );
}