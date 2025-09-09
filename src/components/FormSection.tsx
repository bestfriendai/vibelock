import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../providers/ThemeProvider";

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
  error?: string;
  success?: string;
  isValid?: boolean;
  showValidation?: boolean;
}

export default function FormSection({
  title,
  subtitle,
  children,
  required = false,
  className = "",
  error,
  success,
  isValid,
  showValidation = false,
}: Props) {
  const { colors } = useTheme();

  const getValidationColor = () => {
    if (error) return "#EF4444";
    if (success || isValid) return "#22C55E";
    return colors.text.secondary;
  };

  const getValidationIcon = () => {
    if (error) return "alert-circle";
    if (success || isValid) return "checkmark-circle";
    return null;
  };

  return (
    <View
      className={`mb-6 ${className}`}
      accessible={true}
      accessibilityLabel={`${title} section${required ? ", required" : ""}`}
    >
      {/* Section Header */}
      <View className="mb-6">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Text className="text-xl font-bold" style={{ color: colors.text.primary }}>
              {title}
            </Text>
            {required && (
              <Text className="text-xl font-bold ml-1" style={{ color: colors.brand.red }}>
                *
              </Text>
            )}
          </View>

          {/* Validation Icon */}
          {showValidation && getValidationIcon() && (
            <Ionicons name={getValidationIcon()!} size={20} color={error ? "#EF4444" : "#22C55E"} />
          )}
        </View>

        {subtitle && (
          <Text className="text-base mt-1 leading-5" style={{ color: getValidationColor() }}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Section Content */}
      <View>{children}</View>

      {/* Error Message */}
      {error && (
        <View className="mt-3 p-3 border rounded-xl" style={{ backgroundColor: "#EF444410", borderColor: "#EF444420" }}>
          <View className="flex-row items-center">
            <Ionicons name="alert-circle" size={16} color="#EF4444" />
            <Text className="text-sm font-medium ml-2" style={{ color: "#EF4444" }}>
              {error}
            </Text>
          </View>
        </View>
      )}

      {/* Success Message */}
      {success && (
        <View className="mt-3 p-3 border rounded-xl" style={{ backgroundColor: "#22C55E10", borderColor: "#22C55E20" }}>
          <View className="flex-row items-center">
            <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
            <Text className="text-sm font-medium ml-2" style={{ color: "#22C55E" }}>
              {success}
            </Text>
          </View>
        </View>
      )}

      {/* Section Divider */}
      <View className="mt-6 h-px bg-border" />
    </View>
  );
}
