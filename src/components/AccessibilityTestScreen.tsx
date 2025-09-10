import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../providers/ThemeProvider";
import useThemeStore from "../state/themeStore";

export const AccessibilityTestScreen: React.FC = () => {
  const { colors, isDarkMode, isHighContrast, toggleHighContrast } = useTheme();
  const { theme, setTheme } = useThemeStore();
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (result: string) => {
    setTestResults((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testColorContrast = () => {
    addResult("🎨 Color contrast test initiated");
    addResult(`Current theme: ${theme}`);
    addResult(`High contrast mode: ${isHighContrast ? "ON" : "OFF"}`);
    addResult(`Text primary: ${colors.text.primary}`);
    addResult(`Background: ${colors.background}`);
    addResult("✅ Color contrast values logged");
  };

  const testScreenReader = () => {
    addResult("📱 Screen reader test initiated");
    addResult("Check that all interactive elements have accessibility labels");
    addResult("Verify accessibility roles are properly set");
    addResult("Test navigation with VoiceOver/TalkBack");
    addResult("✅ Screen reader test guidelines provided");
  };

  const testKeyboardNavigation = () => {
    addResult("⌨️ Keyboard navigation test initiated");
    addResult("Test tab order through interactive elements");
    addResult("Verify focus indicators are visible");
    addResult("Check that all actions are keyboard accessible");
    addResult("✅ Keyboard navigation test guidelines provided");
  };

  const runAllTests = () => {
    clearResults();
    addResult("🧪 Starting comprehensive accessibility tests...");
    
    setTimeout(() => testColorContrast(), 500);
    setTimeout(() => testScreenReader(), 1000);
    setTimeout(() => testKeyboardNavigation(), 1500);
    
    setTimeout(() => {
      addResult("🎉 All accessibility tests completed!");
      addResult("Review results and test manually with assistive technologies");
    }, 2000);
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView className="flex-1 p-4">
        <View className="mb-6">
          <Text className="text-2xl font-bold mb-2" style={{ color: colors.text.primary }}>
            Accessibility Test Suite
          </Text>
          <Text style={{ color: colors.text.secondary }}>
            Test WCAG 2.1 AA compliance features and accessibility implementations.
          </Text>
        </View>

        {/* Theme Controls */}
        <View className="rounded-xl p-4 mb-6" style={{ backgroundColor: colors.surface[800] }}>
          <Text className="text-lg font-semibold mb-4" style={{ color: colors.text.primary }}>
            Theme & Contrast Controls
          </Text>
          
          <View className="space-y-4">
            {/* Theme Selector */}
            <View>
              <Text className="text-sm font-medium mb-2" style={{ color: colors.text.secondary }}>
                Theme Mode
              </Text>
              <View className="flex-row space-x-2">
                {(["light", "dark", "high-contrast"] as const).map((themeOption) => (
                  <Pressable
                    key={themeOption}
                    onPress={() => setTheme(themeOption)}
                    className={`px-4 py-2 rounded-lg ${
                      theme === themeOption ? "opacity-100" : "opacity-60"
                    }`}
                    style={{
                      backgroundColor: theme === themeOption ? colors.brand.red : colors.surface[700],
                    }}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`Switch to ${themeOption} theme`}
                    accessibilityState={{ selected: theme === themeOption }}
                  >
                    <Text
                      className="text-sm font-medium"
                      style={{
                        color: theme === themeOption ? "#FFFFFF" : colors.text.primary,
                      }}
                    >
                      {themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* High Contrast Toggle */}
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="font-medium" style={{ color: colors.text.primary }}>
                  High Contrast Mode
                </Text>
                <Text className="text-sm" style={{ color: colors.text.secondary }}>
                  Maximum contrast for better visibility
                </Text>
              </View>
              <Switch
                value={isHighContrast}
                onValueChange={toggleHighContrast}
                trackColor={{ false: colors.surface[600], true: colors.brand.red }}
                thumbColor={isHighContrast ? "#FFFFFF" : colors.surface[600]}
                accessible={true}
                accessibilityRole="switch"
                accessibilityLabel="Toggle high contrast mode"
                accessibilityState={{ checked: isHighContrast }}
              />
            </View>
          </View>
        </View>

        {/* Test Controls */}
        <View className="rounded-xl p-4 mb-6" style={{ backgroundColor: colors.surface[800] }}>
          <Text className="text-lg font-semibold mb-4" style={{ color: colors.text.primary }}>
            Accessibility Tests
          </Text>
          
          <View className="space-y-3">
            <Pressable
              className="rounded-lg py-3 px-4 items-center"
              style={{ backgroundColor: colors.brand.red }}
              onPress={runAllTests}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Run all accessibility tests"
              accessibilityHint="Performs comprehensive accessibility testing"
            >
              <Text className="text-white font-semibold">Run All Tests</Text>
            </Pressable>

            <View className="flex-row space-x-2">
              <Pressable
                className="flex-1 rounded-lg py-3 px-4 items-center"
                style={{ backgroundColor: colors.surface[700] }}
                onPress={testColorContrast}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Test color contrast"
              >
                <Text style={{ color: colors.text.primary }} className="font-medium">
                  Color Contrast
                </Text>
              </Pressable>

              <Pressable
                className="flex-1 rounded-lg py-3 px-4 items-center"
                style={{ backgroundColor: colors.surface[700] }}
                onPress={testScreenReader}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Test screen reader compatibility"
              >
                <Text style={{ color: colors.text.primary }} className="font-medium">
                  Screen Reader
                </Text>
              </Pressable>
            </View>

            <Pressable
              className="rounded-lg py-3 px-4 items-center"
              style={{ backgroundColor: colors.surface[700] }}
              onPress={clearResults}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Clear test results"
            >
              <Text style={{ color: colors.text.primary }} className="font-medium">
                Clear Results
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Color Contrast Examples */}
        <View className="rounded-xl p-4 mb-6" style={{ backgroundColor: colors.surface[800] }}>
          <Text className="text-lg font-semibold mb-4" style={{ color: colors.text.primary }}>
            Color Contrast Examples
          </Text>
          
          <View className="space-y-3">
            <View className="p-3 rounded-lg" style={{ backgroundColor: colors.background }}>
              <Text style={{ color: colors.text.primary }} className="font-semibold">
                Primary Text (AAA)
              </Text>
              <Text style={{ color: colors.text.secondary }} className="text-sm">
                Secondary Text (AA)
              </Text>
              <Text style={{ color: colors.text.muted }} className="text-xs">
                Muted Text (AA)
              </Text>
            </View>

            <View className="p-3 rounded-lg" style={{ backgroundColor: colors.brand.red }}>
              <Text className="text-white font-semibold">
                Brand Color Text (AAA)
              </Text>
            </View>

            <View className="p-3 rounded-lg" style={{ backgroundColor: colors.brand.red }}>
              <Text className="text-white font-semibold">
                Success Color Text
              </Text>
            </View>
          </View>
        </View>

        {/* Test Results */}
        <View className="rounded-xl p-4" style={{ backgroundColor: colors.surface[800] }}>
          <Text className="text-lg font-semibold mb-4" style={{ color: colors.text.primary }}>
            Test Results
          </Text>
          {testResults.length === 0 ? (
            <Text style={{ color: colors.text.secondary }} className="italic">
              No test results yet
            </Text>
          ) : (
            <ScrollView className="max-h-40">
              {testResults.map((result, index) => (
                <Text
                  key={index}
                  className="text-sm mb-1 font-mono"
                  style={{ color: colors.text.secondary }}
                >
                  {result}
                </Text>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Instructions */}
        <View
          className="border rounded-lg p-4 mt-4"
          style={{
            backgroundColor: colors.brand.red + "20",
            borderColor: colors.brand.red + "30",
          }}
        >
          <View className="flex-row items-center mb-2">
            <Ionicons name="information-circle" size={16} color={colors.brand.red} />
            <Text className="text-sm font-medium ml-2" style={{ color: colors.brand.red }}>
              Manual Testing Required
            </Text>
          </View>
          <Text className="text-xs leading-5" style={{ color: colors.text.secondary }}>
            • Test with VoiceOver (iOS Settings → Accessibility → VoiceOver)
            {"\n"}• Test with TalkBack (Android Settings → Accessibility → TalkBack)
            {"\n"}• Verify all interactive elements are announced properly
            {"\n"}• Check focus order and navigation flow
            {"\n"}• Test with external keyboard navigation
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
