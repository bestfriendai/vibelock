import React from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../providers/ThemeProvider';

interface SwipeToReplyProps {
  onReply: () => void;
  children: React.ReactNode;
  threshold?: number;
  isOwnMessage?: boolean;
}

export const SwipeToReply: React.FC<SwipeToReplyProps> = ({
  onReply,
  children,
  threshold = 80,
  isOwnMessage = false,
}) => {
  const { colors } = useTheme();
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);
  const iconRotation = useSharedValue(0);

  const triggerReply = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onReply();
  };

  const triggerHapticFeedback = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX(isOwnMessage ? -10 : 10)
    .onUpdate((event) => {
      const translation = isOwnMessage ? -event.translationX : event.translationX;
      const clampedTranslation = Math.max(0, Math.min(translation, threshold * 1.2));
      
      translateX.value = isOwnMessage ? -clampedTranslation : clampedTranslation;
      
      // Fade in reply icon
      opacity.value = interpolate(
        clampedTranslation,
        [0, threshold * 0.3, threshold],
        [0, 0.6, 1]
      );
      
      // Scale effect when approaching threshold
      scale.value = interpolate(
        clampedTranslation,
        [0, threshold * 0.7, threshold],
        [0.8, 1.1, 1.3]
      );
      
      // Icon rotation for visual feedback
      iconRotation.value = interpolate(
        clampedTranslation,
        [0, threshold],
        [0, 360]
      );
      
      // Haptic feedback at threshold
      if (clampedTranslation >= threshold && Math.abs(translateX.value) < threshold) {
        runOnJS(triggerHapticFeedback)();
      }
    })
    .onEnd((event) => {
      const translation = isOwnMessage ? -event.translationX : event.translationX;
      
      if (translation >= threshold) {
        runOnJS(triggerReply)();
      }
      
      // Reset animations
      translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
      opacity.value = withSpring(0);
      scale.value = withSpring(1);
      iconRotation.value = withSpring(0);
    });

  const messageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const replyIconStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      opacity.value,
      [0, 0.5, 1],
      ['transparent', colors.brand.red + '40', colors.brand.red]
    );

    return {
      opacity: opacity.value,
      transform: [
        { scale: scale.value },
        { rotate: `${iconRotation.value}deg` }
      ],
      backgroundColor,
    };
  });

  const replyIconPosition = isOwnMessage ? {
    position: 'absolute' as const,
    right: -50,
    top: '50%' as any,
    marginTop: -18,
  } : {
    position: 'absolute' as const,
    left: -50,
    top: '50%' as any,
    marginTop: -18,
  };

  return (
    <View className="relative">
      <GestureDetector gesture={panGesture}>
        <Animated.View style={messageStyle}>
          {children}
        </Animated.View>
      </GestureDetector>
      
      {/* Reply Icon */}
      <Animated.View 
        style={[
          replyIconStyle,
          replyIconPosition,
          {
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
          }
        ]}
      >
        <Ionicons 
          name={isOwnMessage ? "arrow-redo" : "arrow-undo"} 
          size={18} 
          color="white" 
        />
      </Animated.View>
    </View>
  );
};

export default SwipeToReply;
