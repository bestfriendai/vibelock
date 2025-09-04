import React, { useEffect } from "react";
import { View, Text, Image, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import AnimatedButton from "../components/AnimatedButton";
import useAuthStore from "../state/authStore";

const features = [
  {
    icon: "eye-outline" as keyof typeof Ionicons.glyphMap,
    title: "Browse Anonymously",
    description: "See what others are saying about potential dates",
  },
  {
    icon: "chatbubble-outline" as keyof typeof Ionicons.glyphMap,
    title: "Share Experiences",
    description: "Help others with your dating insights",
  },
  {
    icon: "people-outline" as keyof typeof Ionicons.glyphMap,
    title: "Connect Safely",
    description: "Join location-based community discussions",
  }
];

export default function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const { setGuestMode } = useAuthStore();
  
  // Animation values
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const heroOpacity = useSharedValue(0);
  const heroTranslateY = useSharedValue(50);
  const featuresOpacity = useSharedValue(0);
  const featuresTranslateY = useSharedValue(30);
  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(50);

  // Initialize entrance animations
  useEffect(() => {
    // Logo entrance
    logoScale.value = withDelay(300, withSpring(1, { damping: 15, stiffness: 200 }));
    logoOpacity.value = withDelay(300, withTiming(1, { duration: 800 }));

    // Hero section entrance
    heroOpacity.value = withDelay(600, withTiming(1, { duration: 600 }));
    heroTranslateY.value = withDelay(600, withSpring(0, { damping: 15, stiffness: 200 }));

    // Features entrance
    featuresOpacity.value = withDelay(900, withTiming(1, { duration: 600 }));
    featuresTranslateY.value = withDelay(900, withSpring(0, { damping: 15, stiffness: 200 }));

    // Buttons entrance
    buttonsOpacity.value = withDelay(1200, withTiming(1, { duration: 600 }));
    buttonsTranslateY.value = withDelay(1200, withSpring(0, { damping: 15, stiffness: 200 }));
  }, []);

  const handleSignIn = () => {
    navigation.navigate("SignIn");
  };

  const handleSignUp = () => {
    navigation.navigate("SignUp");
  };

  const handleBrowseAsGuest = () => {
    setGuestMode(true);
    navigation.navigate("MainTabs");
  };

  // Animated styles
  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const heroAnimatedStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ translateY: heroTranslateY.value }],
  }));

  const featuresAnimatedStyle = useAnimatedStyle(() => ({
    opacity: featuresOpacity.value,
    transform: [{ translateY: featuresTranslateY.value }],
  }));

  const buttonsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsTranslateY.value }],
  }));

  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      <LinearGradient
        colors={["#141418", "#1A1A20", "#141418"]}
        className="absolute inset-0"
      />
      
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 px-6 py-8">
          {/* Logo Section */}
          <Animated.View style={logoAnimatedStyle} className="items-center mt-8 mb-12">
            <View className="w-32 h-32 mb-6 shadow-2xl">
              <Image
                source={require("../../assets/logo-circular.png")}
                style={{ width: 128, height: 128 }}
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          {/* Hero Section */}
          <Animated.View style={heroAnimatedStyle} className="items-center mb-16">
            <Text className="text-5xl font-bold text-text-primary mb-6 text-center leading-tight">
              Locker Room Talk
            </Text>
            <Text className="text-xl text-text-secondary text-center leading-8 px-2 mb-8">
              Anonymous dating insights from real people in your community
            </Text>
            
            {/* Stats or Social Proof */}
            <View className="bg-surface-800/50 rounded-2xl p-6 w-full border border-surface-700/50">
              <View className="flex-row justify-around">
                <View className="items-center">
                  <Text className="text-2xl font-bold text-brand-red">10K+</Text>
                  <Text className="text-text-muted text-sm">Reviews</Text>
                </View>
                <View className="items-center">
                  <Text className="text-2xl font-bold text-brand-red">50+</Text>
                  <Text className="text-text-muted text-sm">Cities</Text>
                </View>
                <View className="items-center">
                  <Text className="text-2xl font-bold text-brand-red">100%</Text>
                  <Text className="text-text-muted text-sm">Anonymous</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Features Section */}
          <Animated.View style={featuresAnimatedStyle} className="mb-12">
            <View className="space-y-6">
              {features.map((feature, index) => (
                <View key={index} className="flex-row items-center space-x-4">
                  <View className="w-12 h-12 rounded-full bg-brand-red/20 items-center justify-center">
                    <Ionicons name={feature.icon} size={24} color="#FF6B6B" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-text-primary mb-1">
                      {feature.title}
                    </Text>
                    <Text className="text-text-secondary">
                      {feature.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View style={buttonsAnimatedStyle} className="space-y-4 mt-auto">
            <AnimatedButton
              title="Create Account"
              variant="primary"
              size="large"
              onPress={handleSignUp}
              className="w-full"
            />
            
            <AnimatedButton
              title="Sign In"
              variant="secondary"
              size="large"
              onPress={handleSignIn}
              className="w-full"
            />

            <AnimatedButton
              title="Browse as Guest"
              variant="ghost"
              size="medium"
              onPress={handleBrowseAsGuest}
              className="w-full"
              textClassName="text-text-muted"
            />

            <View className="items-center mt-6">
              <Text className="text-text-muted text-xs text-center leading-5 px-4">
                By continuing, you agree to our{" "}
                <Text className="text-brand-red">Terms of Service</Text> and{" "}
                <Text className="text-brand-red">Privacy Policy</Text>
              </Text>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}