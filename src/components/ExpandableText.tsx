import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useTheme } from "../providers/ThemeProvider";

interface Props {
  text: string;
  numberOfLines?: number;
  textStyle?: string;
  linkStyle?: string;
  expandText?: string;
  collapseText?: string;
}

export default function ExpandableText({
  text,
  numberOfLines = 3,
  textStyle = "text-text-primary text-base leading-7",
  linkStyle = "text-brand-red font-medium",
  expandText = "Read full story",
  collapseText = "Show less",
}: Props) {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShowReadMore, setShouldShowReadMore] = useState(false);
  const [fullTextHeight, setFullTextHeight] = useState(0);
  const [truncatedTextHeight, setTruncatedTextHeight] = useState(0);

  const animatedHeight = useSharedValue(0);

  const handleTextLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    if (!isExpanded && truncatedTextHeight === 0) {
      setTruncatedTextHeight(height);
      animatedHeight.value = height;
    }
  };

  const handleFullTextLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    if (fullTextHeight === 0) {
      setFullTextHeight(height);
      setShouldShowReadMore(height > truncatedTextHeight);
    }
  };

  const toggleExpanded = () => {
    const newIsExpanded = !isExpanded;
    setIsExpanded(newIsExpanded);

    animatedHeight.value = withTiming(newIsExpanded ? fullTextHeight : truncatedTextHeight, { duration: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value > 0 ? animatedHeight.value : undefined,
    overflow: "hidden" as const,
  }));

  return (
    <View>
      {/* Hidden full text for measurement */}
      <Text
        onLayout={handleFullTextLayout}
        style={{
          position: "absolute",
          opacity: 0,
          zIndex: -1,
          color: colors.text.primary,
          fontSize: 16,
          lineHeight: 28,
        }}
      >
        {text}
      </Text>

      {/* Animated container */}
      <Animated.View style={animatedStyle}>
        <Text
          numberOfLines={isExpanded ? undefined : numberOfLines}
          onLayout={handleTextLayout}
          style={{
            color: colors.text.primary,
            fontSize: 16,
            lineHeight: 28,
          }}
        >
          {text}
        </Text>
      </Animated.View>

      {/* Read more/less button */}
      {shouldShowReadMore && (
        <Pressable
          onPress={toggleExpanded}
          className="flex-row items-center mt-3 px-3 py-2 rounded-lg self-start"
          style={{ backgroundColor: colors.brand.red + "10" }}
        >
          <Text className="font-medium" style={{ color: colors.brand.red }}>
            {isExpanded ? collapseText : expandText}
          </Text>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.brand.red}
            style={{ marginLeft: 4 }}
          />
        </Pressable>
      )}
    </View>
  );
}
