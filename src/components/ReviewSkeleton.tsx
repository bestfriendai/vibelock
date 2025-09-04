import React from "react";
import { View } from "react-native";

export default function ReviewSkeleton() {
  return (
    <View className="bg-surface-800 rounded-2xl p-6 mb-6 border border-border">
      {/* Header skeleton */}
      <View className="flex-row items-center mb-4">
        <View className="w-10 h-10 bg-surface-700 rounded-full mr-3" />
        <View className="flex-1">
          <View className="w-24 h-4 bg-surface-700 rounded mb-2" />
          <View className="w-16 h-3 bg-surface-700 rounded" />
        </View>
        <View className="w-8 h-4 bg-surface-700 rounded" />
      </View>

      {/* Flags skeleton */}
      <View className="flex-row flex-wrap gap-2 mb-4">
        <View className="w-20 h-6 bg-surface-700 rounded-full" />
        <View className="w-16 h-6 bg-surface-700 rounded-full" />
        <View className="w-24 h-6 bg-surface-700 rounded-full" />
      </View>

      {/* Text skeleton */}
      <View className="mb-4">
        <View className="w-full h-4 bg-surface-700 rounded mb-2" />
        <View className="w-full h-4 bg-surface-700 rounded mb-2" />
        <View className="w-3/4 h-4 bg-surface-700 rounded" />
      </View>

      {/* Media skeleton */}
      <View className="flex-row space-x-2 mb-4">
        <View className="w-20 h-20 bg-surface-700 rounded-xl" />
        <View className="w-20 h-20 bg-surface-700 rounded-xl" />
        <View className="w-20 h-20 bg-surface-700 rounded-xl" />
      </View>

      {/* Footer skeleton */}
      <View className="flex-row items-center justify-between pt-4 border-t border-border">
        <View className="flex-row space-x-4">
          <View className="w-12 h-4 bg-surface-700 rounded" />
          <View className="w-12 h-4 bg-surface-700 rounded" />
        </View>
        <View className="w-6 h-4 bg-surface-700 rounded" />
      </View>
    </View>
  );
}