import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay } from "react-native-reanimated";
import AnimatedButton from "../components/AnimatedButton";
import ThemeAwareLogo from "../components/ThemeAwareLogo";

export default function AuthScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  // Animation values
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(30);
  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(50);

  // Initialize entrance animations
  useEffect(() => {
    // Logo entrance
    logoScale.value = withDelay(300, withSpring(1, { damping: 15, stiffness: 200 }));
    logoOpacity.value = withDelay(300, withTiming(1, { duration: 800 }));

    // Title entrance
    titleOpacity.value = withDelay(600, withTiming(1, { duration: 600 }));
    titleTranslateY.value = withDelay(600, withSpring(0, { damping: 15, stiffness: 200 }));

    // Buttons entrance
    buttonsOpacity.value = withDelay(900, withTiming(1, { duration: 600 }));
    buttonsTranslateY.value = withDelay(900, withSpring(0, { damping: 15, stiffness: 200 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignIn = () => {
    navigation.navigate("SignIn");
  };

  const handleSignUp = () => {
    navigation.navigate("SignUp");
  };

  // Animated styles
  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const buttonsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsTranslateY.value }],
  }));

  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      <View className="flex-1 justify-center items-center px-6">
        {/* Logo Section */}
        <Animated.View style={logoAnimatedStyle} className="items-center mb-16">
          <View className="w-32 h-32 mb-8 shadow-2xl">
            <ThemeAwareLogo width={128} height={128} />
          </View>
        </Animated.View>

        {/* Title Section */}
        <Animated.View style={titleAnimatedStyle} className="items-center mb-16">
          <Text className="text-4xl font-bold text-text-primary mb-4 text-center">{t("appTitle")}</Text>
          <Text className="text-text-secondary text-center text-lg leading-7 px-4">{t("subtitle")}</Text>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View style={buttonsAnimatedStyle} className="w-full space-y-4">
          <AnimatedButton
            title={t("signIn")}
            variant="primary"
            size="large"
            onPress={handleSignIn}
            className="w-full"
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Sign in to your account"
            accessibilityHint="Opens the sign in screen"
          />

          <AnimatedButton
            title={t("createAccount")}
            variant="secondary"
            size="large"
            onPress={handleSignUp}
            className="w-full"
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Create a new account"
            accessibilityHint="Opens the sign up screen"
          />

          <View className="items-center mt-8">
            <Text className="text-text-muted text-sm text-center leading-6">
              By continuing, you agree to our <Text className="text-brand-red">{t("termsOfService")}</Text> and{" "}
              <Text className="text-brand-red">{t("privacyPolicy")}</Text>
            </Text>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
