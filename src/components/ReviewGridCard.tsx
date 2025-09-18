import React from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Review } from "../types";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";

interface Props {
  review: Review;
}

type Nav = NativeStackNavigationProp<RootStackParamList>;

const gradients = [
  ["#2b5876", "#4e4376"],
  ["#232526", "#414345"],
  ["#0f2027", "#203a43"],
  ["#3a1c71", "#d76d77"],
];

export default function ReviewGridCard({ review }: Props) {
  const navigation = useNavigation<Nav>();
  const colors = gradients[review.id.charCodeAt(0) % gradients.length] as [string, string];

  return (
    <Pressable
      className="overflow-hidden rounded-2xl mb-4 mr-4 flex-1"
      onPress={() =>
        navigation.navigate("PersonProfile", {
          firstName: review.reviewedPersonName,
          city: review.reviewedPersonLocation.city,
          state: review.reviewedPersonLocation.state,
        })
      }
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ height: 200, borderRadius: 16 }}
      >
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.7)"] as any}
          style={{ flex: 1, borderRadius: 16, padding: 12, justifyContent: "flex-end" }}
        >
          <Text className="text-white text-lg font-bold">
            {review.reviewedPersonLocation.city}, {review.reviewedPersonLocation.state}
          </Text>
          <Text className="text-white/80 mt-2" numberOfLines={2}>
            “{review.reviewText}”
          </Text>
        </LinearGradient>
      </LinearGradient>
    </Pressable>
  );
}
