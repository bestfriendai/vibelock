import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../providers/ThemeProvider";
import { useNavigation } from "@react-navigation/native";

interface AuthRequiredScreenProps {
  title?: string;
  message?: string;
  showSignUpButton?: boolean;
  onSignIn?: () => void;
  onSignUp?: () => void;
}

export const AuthRequiredScreen: React.FC<AuthRequiredScreenProps> = ({
  title = "Authentication Required",
  message = "Please sign in to access this feature",
  showSignUpButton = true,
  onSignIn,
  onSignUp,
}) => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  const handleSignIn = () => {
    if (onSignIn) {
      onSignIn();
    } else {
      navigation.navigate("SignIn");
    }
  };

  const handleSignUp = () => {
    if (onSignUp) {
      onSignUp();
    } else {
      navigation.navigate("SignUp");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: colors.brand.redLight }]}>
            <Ionicons name="lock-closed" size={48} color={colors.brand.red} />
          </View>

          <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>

          <Text style={[styles.message, { color: colors.text.secondary }]}>{message}</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.brand.red }]}
              onPress={handleSignIn}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, { color: colors.background }]}>Sign In</Text>
            </TouchableOpacity>

            {showSignUpButton && (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, { borderColor: colors.brand.red }]}
                onPress={handleSignUp}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, { color: colors.brand.red }]}>Create Account</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 32,
  },
  buttonContainer: {
    width: "100%",
    maxWidth: 320,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
