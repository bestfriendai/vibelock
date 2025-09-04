import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming
} from "react-native-reanimated";

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
  textStyle = "text-gray-700 text-base leading-6",
  linkStyle = "text-brand-red font-medium",
  expandText = "Read full story",
  collapseText = "Show less"
}: Props) {
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
    
    animatedHeight.value = withTiming(
      newIsExpanded ? fullTextHeight : truncatedTextHeight,
      { duration: 300 }
    );
  };

  const animatedStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value > 0 ? animatedHeight.value : undefined,
    overflow: "hidden" as const,
  }));

  return (
    <View>
      {/* Hidden full text for measurement */}
      <Text
        className={textStyle}
        onLayout={handleFullTextLayout}
        style={{
          position: "absolute",
          opacity: 0,
          zIndex: -1,
        }}
      >
        {text}
      </Text>

      {/* Animated container */}
      <Animated.View style={animatedStyle}>
        <Text
          className={textStyle}
          numberOfLines={isExpanded ? undefined : numberOfLines}
          onLayout={handleTextLayout}
        >
          {text}
        </Text>
      </Animated.View>

      {/* Read more/less button */}
      {shouldShowReadMore && (
        <Pressable
          onPress={toggleExpanded}
          className="flex-row items-center mt-2"
        >
          <Text className={linkStyle}>
            {isExpanded ? collapseText : expandText}
          </Text>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-forward"}
            size={16}
            color="#FF6B6B"
            style={{ marginLeft: 4 }}
          />
        </Pressable>
      )}
    </View>
  );
}