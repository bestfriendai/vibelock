import React from "react";
import { View, Text } from "react-native";

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}

export default function FormSection({ 
  title, 
  subtitle, 
  children, 
  required = false,
  className = ""
}: Props) {
  return (
    <View className={`mb-8 ${className}`}>
      {/* Section Header */}
      <View className="mb-4">
        <View className="flex-row items-center">
          <Text className="text-text-primary text-xl font-bold">
            {title}
          </Text>
          {required && (
            <Text className="text-brand-red text-xl font-bold ml-1">*</Text>
          )}
        </View>
        {subtitle && (
          <Text className="text-text-secondary text-base mt-1 leading-5">
            {subtitle}
          </Text>
        )}
      </View>

      {/* Section Content */}
      <View>
        {children}
      </View>

      {/* Section Divider */}
      <View className="mt-6 h-px bg-border" />
    </View>
  );
}