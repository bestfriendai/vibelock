import React, { useState, useEffect } from "react";
import { View, Text, TouchableWithoutFeedback, Keyboard, ScrollView, Alert, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import AnimatedButton from "../components/AnimatedButton";
import AnimatedInput from "../components/AnimatedInput";
import ThemeAwareLogo from "../components/ThemeAwareLogo";
import { authService } from "../services/auth";
import { AppError, parseSupabaseError } from "../utils/errorHandling";

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");

  console.log("ForgotPasswordScreen rendered", { emailSent, isLoading, error });

  // Animation values
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(50);
  const footerOpacity = useSharedValue(0);
  const footerTranslateY = useSharedValue(30);

  // Initialize entrance animations
  useEffect(() => {
    // Logo entrance
    logoScale.value = withDelay(200, withSpring(1, { damping: 15, stiffness: 200 }));
    logoOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));

    // Form entrance
    formOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    formTranslateY.value = withDelay(400, withSpring(0, { damping: 15, stiffness: 200 }));

    // Footer entrance
    footerOpacity.value = withDelay(600, withTiming(1, { duration: 600 }));
    footerTranslateY.value = withDelay(600, withSpring(0, { damping: 15, stiffness: 200 }));
  }, []);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleResetPassword = async () => {
    setError("");

    // Validate email
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPassword(email);
      setEmailSent(true);
    } catch (err: any) {
      const appError = err instanceof AppError ? err : parseSupabaseError(err);
      
      // Handle specific error cases
      if (appError.message.includes("User not found") || appError.message.includes("Invalid email")) {
        setError("No account found with this email address");
      } else if (appError.message.includes("Email rate limit exceeded")) {
        setError("Too many reset attempts. Please wait before trying again");
      } else {
        setError(appError.message || "Failed to send reset email. Please try again");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSignIn = () => {
    navigation.goBack();
  };

  // Simple fallback for debugging
  if (__DEV__ && false) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'white', fontSize: 24, marginBottom: 20 }}>Forgot Password</Text>
        <Text style={{ color: '#9CA3AF', textAlign: 'center', marginBottom: 20 }}>
          Enter your email to reset your password
        </Text>
        <Pressable
          onPress={handleBackToSignIn}
          style={{ backgroundColor: '#3B82F6', padding: 12, borderRadius: 8 }}
        >
          <Text style={{ color: 'white' }}>Back to Sign In</Text>
        </Pressable>
      </View>
    );
  }

  // Animated styles
  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const formAnimatedStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formTranslateY.value }],
  }));

  const footerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: footerOpacity.value,
    transform: [{ translateY: footerTranslateY.value }],
  }));

  if (emailSent) {
    return (
      <LinearGradient colors={["#1a1a1a", "#2d2d2d", "#1a1a1a"]} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
              <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
                {/* Success Icon */}
                <Animated.View style={[logoAnimatedStyle, { alignItems: 'center', marginBottom: 32 }]}>
                  <View style={{
                    width: 80,
                    height: 80,
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    borderRadius: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16
                  }}>
                    <Ionicons name="checkmark-circle" size={48} color="#10b981" />
                  </View>
                  <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
                    Check Your Email
                  </Text>
                  <Text style={{ color: '#9CA3AF', textAlign: 'center', fontSize: 16, lineHeight: 24 }}>
                    We've sent a password reset link to{"\n"}
                    <Text style={{ color: 'white', fontWeight: '500' }}>{email}</Text>
                  </Text>
                </Animated.View>

                {/* Instructions */}
                <Animated.View style={[formAnimatedStyle, { marginBottom: 32 }]}>
                  <View style={{
                    backgroundColor: 'rgba(55, 65, 81, 0.5)',
                    borderRadius: 16,
                    padding: 24,
                    borderWidth: 1,
                    borderColor: 'rgba(55, 65, 81, 0.5)'
                  }}>
                    <Text style={{ color: 'white', fontSize: 18, fontWeight: '600', marginBottom: 12 }}>Next Steps:</Text>
                    <View style={{ gap: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <Text style={{ color: '#60A5FA', fontWeight: 'bold', marginRight: 12 }}>1.</Text>
                        <Text style={{ color: '#D1D5DB', flex: 1 }}>Check your email inbox (and spam folder)</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <Text style={{ color: '#60A5FA', fontWeight: 'bold', marginRight: 12 }}>2.</Text>
                        <Text style={{ color: '#D1D5DB', flex: 1 }}>Click the reset password link</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <Text style={{ color: '#60A5FA', fontWeight: 'bold', marginRight: 12 }}>3.</Text>
                        <Text style={{ color: '#D1D5DB', flex: 1 }}>Create a new password</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <Text style={{ color: '#60A5FA', fontWeight: 'bold', marginRight: 12 }}>4.</Text>
                        <Text style={{ color: '#D1D5DB', flex: 1 }}>Return to the app and sign in</Text>
                      </View>
                    </View>
                  </View>
                </Animated.View>

                {/* Action Buttons */}
                <Animated.View style={[footerAnimatedStyle, { gap: 16 }]}>
                  <AnimatedButton
                    title="Back to Sign In"
                    variant="primary"
                    onPress={handleBackToSignIn}
                  />

                  <AnimatedButton
                    title="Resend Email"
                    variant="ghost"
                    onPress={() => {
                      setEmailSent(false);
                      handleResetPassword();
                    }}
                  />
                </Animated.View>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#1a1a1a", "#2d2d2d", "#1a1a1a"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
              {/* Back Button */}
              <View style={{ position: 'absolute', top: 16, left: 24, zIndex: 10 }}>
                <Pressable
                  onPress={handleBackToSignIn}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: 'rgba(55, 65, 81, 0.5)',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Ionicons name="arrow-back" size={20} color="white" />
                </Pressable>
              </View>

              {/* Logo */}
              <Animated.View style={[logoAnimatedStyle, { alignItems: 'center', marginBottom: 32 }]}>
                <ThemeAwareLogo size={80} />
                <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 16, marginBottom: 8 }}>
                  Reset Password
                </Text>
                <Text style={{ color: '#9CA3AF', textAlign: 'center', fontSize: 16 }}>
                  Enter your email address and we'll send you a link to reset your password
                </Text>
              </Animated.View>

              {/* Form */}
              <Animated.View style={formAnimatedStyle}>
                <AnimatedInput
                  placeholder="Email"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setError("");
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={handleResetPassword}
                  style={{ marginBottom: 24 }}
                />

                {/* Error Message */}
                {error ? (
                  <View style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 1,
                    borderColor: 'rgba(239, 68, 68, 0.2)',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 24
                  }}>
                    <Text style={{ color: '#F87171', textAlign: 'center' }}>{error}</Text>
                  </View>
                ) : null}

                {/* Submit Button */}
                <AnimatedButton
                  title="Send Reset Link"
                  variant="primary"
                  loading={isLoading}
                  onPress={handleResetPassword}
                  style={{ marginBottom: 24 }}
                />
              </Animated.View>

              {/* Footer */}
              <Animated.View style={[footerAnimatedStyle, { alignItems: 'center' }]}>
                <Text style={{ color: '#9CA3AF', textAlign: 'center', fontSize: 14, marginBottom: 16 }}>
                  Remember your password?
                </Text>
                <AnimatedButton
                  title="Back to Sign In"
                  variant="ghost"
                  size="small"
                  onPress={handleBackToSignIn}
                />
              </Animated.View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </LinearGradient>
  );
}
