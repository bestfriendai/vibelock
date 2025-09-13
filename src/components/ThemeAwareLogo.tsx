import React from "react";
import { Image, ImageStyle, StyleProp } from "react-native";
import { useTheme } from "../providers/ThemeProvider";

interface ThemeAwareLogoProps {
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
  resizeMode?: "contain" | "cover" | "stretch" | "center" | "repeat";
}

/**
 * ThemeAwareLogo Component
 * 
 * A logo component that automatically switches between different logo versions
 * based on the current theme:
 * - Dark theme: Uses LockerRoomLogo.png (black background version)
 * - Light theme: Uses LockerRoomTransparent1.png (transparent version)
 */
export default function ThemeAwareLogo({
  width = 128,
  height = 128,
  style,
  resizeMode = "contain",
}: ThemeAwareLogoProps) {
  const { isDarkMode } = useTheme();

  // Select the appropriate logo based on theme
  const logoSource = isDarkMode
    ? require("../../assets/LockerRoomLogo.png") // Black background for dark theme
    : require("../../assets/LockerRoomTransparent1.png"); // Transparent for light theme

  return (
    <Image
      source={logoSource}
      style={[{ width, height }, style]}
      resizeMode={resizeMode}
    />
  );
}
