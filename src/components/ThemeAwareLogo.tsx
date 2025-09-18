import React from "react";
import { Image, ImageStyle, StyleProp } from "react-native";
import { useTheme } from "../providers/ThemeProvider";

interface ThemeAwareLogoProps {
  width?: number;
  height?: number;
  size?: number;
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
  size,
  style,
  resizeMode = "contain",
}: ThemeAwareLogoProps) {
  const { isDarkMode } = useTheme();

  // Select the appropriate logo based on theme
  const logoSource = isDarkMode
    ? require("../../assets/LockerRoomLogo.png") // Black background for dark theme
    : require("../../assets/LockerRoomTransparent1.png"); // Transparent for light theme

  const finalWidth = size || width;
  const finalHeight = size || height;

  return (
    <Image source={logoSource} style={[{ width: finalWidth, height: finalHeight }, style]} resizeMode={resizeMode} />
  );
}
