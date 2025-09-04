import React, { useState, useEffect } from "react";
import { View, Dimensions, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
  interpolate,
} from "react-native-reanimated";
import AnimatedButton from "../components/AnimatedButton";
import ProgressIndicator from "../components/ProgressIndicator";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const onboardingSteps = [
  {
    icon: "eye-outline" as keyof typeof Ionicons.glyphMap,
    title: "Browse Anonymously",
    description: "See what others are saying about potential dates in your area. All reviews are completely anonymous.",
    color: "#FF8A65",
  },
  {
    icon: "chatbubble-outline" as keyof typeof Ionicons.glyphMap,
    title: "Share Your Experience", 
    description: "Help others by sharing your dating experiences. Your identity stays protected while helping the community.",
    color: "#FFCC80",
  },
  {
    icon: "people-outline" as keyof typeof Ionicons.glyphMap,
    title: "Connect Safely",
    description: "Join location-based chat rooms to discuss dating experiences and get advice from your local community.",
    color: "#F8BBD9",
  }
];

export default function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const [currentStep, setCurrentStep] = useState(0);
  
  // Animation values
  const translateX = useSharedValue(0);
  const logoScale = useSharedValue(0);
  const logoRotation = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(30);
  const descriptionOpacity = useSharedValue(0);
  const descriptionTranslateY = useSharedValue(30);
  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(30);

  // Initialize entrance animations
  useEffect(() => {
    // Logo entrance
    logoScale.value = withDelay(200, withSpring(1, { damping: 15, stiffness: 200 }));
    logoRotation.value = withDelay(200, withSpring(360, { damping: 15, stiffness: 200 }));
    
    // Content entrance sequence
    setTimeout(() => {
      animateStepContent();
    }, 800);
  }, []);

  // Animate step content
  const animateStepContent = () => {
    iconScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    
    titleOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
    titleTranslateY.value = withDelay(100, withSpring(0, { damping: 15, stiffness: 200 }));
    
    descriptionOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
    descriptionTranslateY.value = withDelay(200, withSpring(0, { damping: 15, stiffness: 200 }));
    
    buttonsOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
    buttonsTranslateY.value = withDelay(300, withSpring(0, { damping: 15, stiffness: 200 }));
  };

  // Reset animations for step change
  const resetAnimations = () => {
    iconScale.value = 0;
    titleOpacity.value = 0;
    titleTranslateY.value = 30;
    descriptionOpacity.value = 0;
    descriptionTranslateY.value = 30;
    buttonsOpacity.value = 0;
    buttonsTranslateY.value = 30;
  };

  const changeStep = (newStep: number) => {
    if (newStep >= 0 && newStep < onboardingSteps.length) {
      resetAnimations();
      setCurrentStep(newStep);
      setTimeout(() => {
        animateStepContent();
      }, 100);
    }
  };

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      changeStep(currentStep + 1);
    } else {
      navigation.navigate("Auth");
    }
  };

  const handleSkip = () => {
    navigation.navigate("Auth");
  };

  const handleBack = () => {
    if (currentStep > 0) {
      changeStep(currentStep - 1);
    }
  };

  // Pan gesture for swipe navigation
  const panGesture = Gesture.Pan()
    .onStart(() => {
      // Store initial position
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      const shouldGoNext = event.translationX < -SCREEN_WIDTH * 0.2 && event.velocityX < -500;
      const shouldGoBack = event.translationX > SCREEN_WIDTH * 0.2 && event.velocityX > 500;

      if (shouldGoNext && currentStep < onboardingSteps.length - 1) {
        translateX.value = withSpring(-SCREEN_WIDTH);
        runOnJS(changeStep)(currentStep + 1);
      } else if (shouldGoBack && currentStep > 0) {
        translateX.value = withSpring(SCREEN_WIDTH);
        runOnJS(changeStep)(currentStep - 1);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const currentStepData = onboardingSteps[currentStep];

  // Animated styles
  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotation.value}deg` },
    ],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const descriptionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: descriptionOpacity.value,
    transform: [{ translateY: descriptionTranslateY.value }],
  }));

  const buttonsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsTranslateY.value }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backgroundAnimatedStyle = useAnimatedStyle(() => {
    const progress = currentStep / (onboardingSteps.length - 1);
    const backgroundOpacity = interpolate(
      progress,
      [0, 0.5, 1],
      [0.1, 0.15, 0.2]
    );
    
    return {
      backgroundColor: `${currentStepData.color}${Math.round(backgroundOpacity * 255).toString(16).padStart(2, '0')}`,
    };
  });

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaView className="flex-1 bg-surface-900">
        <Animated.View style={backgroundAnimatedStyle} className="absolute inset-0" />
        
        <GestureDetector gesture={panGesture}>
          <Animated.View style={containerAnimatedStyle} className="flex-1">
            {/* Skip Button */}
            <View className="flex-row justify-end px-6 pt-4">
              <AnimatedButton
                title="Skip"
                variant="ghost"
                size="small"
                onPress={handleSkip}
              />
            </View>

            {/* Content */}
            <View className="flex-1 justify-center items-center px-6">
              {/* Logo */}
              <Animated.View style={logoAnimatedStyle}>
                <View className="w-24 h-24 mb-12 shadow-lg">
                  <Image
                    source={require("../../assets/logo-circular.png")}
                    style={{ width: 96, height: 96 }}
                    resizeMode="contain"
                  />
                </View>
              </Animated.View>

              {/* Step Icon */}
              <Animated.View style={iconAnimatedStyle}>
                <View 
                  className="w-20 h-20 rounded-full items-center justify-center mb-8 shadow-lg"
                  style={{ backgroundColor: currentStepData.color }}
                >
                  <Ionicons name={currentStepData.icon} size={32} color="#FFFFFF" />
                </View>
              </Animated.View>

              {/* Step Content */}
              <Animated.Text 
                style={titleAnimatedStyle}
                className="text-3xl font-bold text-text-primary mb-4 text-center"
              >
                {currentStepData.title}
              </Animated.Text>
              
              <Animated.Text 
                style={descriptionAnimatedStyle}
                className="text-text-secondary text-center mb-12 text-lg leading-7 px-4"
              >
                {currentStepData.description}
              </Animated.Text>

              {/* Progress Indicators */}
              <ProgressIndicator
                steps={onboardingSteps.length}
                currentStep={currentStep}
                activeColor={currentStepData.color}
                className="mb-8"
              />
            </View>

            {/* Bottom Actions */}
            <Animated.View style={buttonsAnimatedStyle} className="px-6 pb-8">
              <AnimatedButton
                title={currentStep === onboardingSteps.length - 1 ? "Get Started" : "Next"}
                variant="primary"
                size="large"
                onPress={handleNext}
                className="mb-4"
              />

              {currentStep > 0 && (
                <AnimatedButton
                  title="Back"
                  variant="ghost"
                  size="medium"
                  onPress={handleBack}
                />
              )}
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}