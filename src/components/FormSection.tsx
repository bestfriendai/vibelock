import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
  showValidation = false
}: Props) {
  const getValidationColor = () => {
    if (error) return "text-red-400";
    if (success || isValid) return "text-green-400";
    return "text-text-secondary";
  };

  const getValidationIcon = () => {
    if (error) return "alert-circle";
    if (success || isValid) return "checkmark-circle";
    return null;
  };

  return (
    <View className={`mb-8 ${className}`}>
      {/* Section Header */}
      <View className="mb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Text className="text-text-primary text-xl font-bold">
              {title}
            </Text>
            {required && (
              <Text className="text-brand-red text-xl font-bold ml-1">*</Text>
            )}
          </View>
          
          {/* Validation Icon */}
          {showValidation && getValidationIcon() && (
            <Ionicons 
              name={getValidationIcon()!} 
              size={20} 
              color={error ? "#EF4444" : "#22C55E"} 
            />
          )}
        </View>
        
        {subtitle && (
          <Text className={`text-base mt-1 leading-5 ${getValidationColor()}`}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Section Content */}
      <View>
        {children}
      </View>

      {/* Error Message */}
      {error && (
        <View className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <View className="flex-row items-center">
            <Ionicons name="alert-circle" size={16} color="#EF4444" />
            <Text className="text-red-400 text-sm font-medium ml-2">
              {error}
            </Text>
          </View>
        </View>
      )}

      {/* Success Message */}
      {success && (
        <View className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
          <View className="flex-row items-center">
            <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
            <Text className="text-green-400 text-sm font-medium ml-2">
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