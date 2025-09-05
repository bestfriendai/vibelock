import React, { useState } from "react";
import { View, Text, Pressable, TextInput, Modal, Alert, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useSafetyStore from "../state/safetyStore";

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  itemId: string;
  itemType: "review" | "profile";
  itemName?: string;
}

const REPORT_REASONS = [
  {
    key: "inappropriate_content",
    label: "Inappropriate Content",
    description: "Contains offensive or inappropriate material",
  },
  { key: "fake_profile", label: "Fake Profile", description: "This appears to be a fake or misleading profile" },
  { key: "harassment", label: "Harassment", description: "Contains harassment or bullying content" },
  { key: "spam", label: "Spam", description: "Spam or repetitive content" },
  { key: "other", label: "Other", description: "Other reason not listed above" },
] as const;

export default function ReportModal({ visible, onClose, itemId, itemType, itemName }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const { reportContent, isLoading } = useSafetyStore();

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert("Error", "Please select a reason for reporting");
      return;
    }

    try {
      await reportContent({
        reportedItemId: itemId,
        reportedItemType: itemType,
        reason: selectedReason as any,
        description: description.trim() || undefined,
      });

      Alert.alert("Report Submitted", "Thank you for your report. We'll review it and take appropriate action.", [
        { text: "OK", onPress: onClose },
      ]);

      // Reset form
      setSelectedReason("");
      setDescription("");
    } catch (error) {
      Alert.alert("Error", "Failed to submit report. Please try again.");
    }
  };

  const handleClose = () => {
    setSelectedReason("");
    setDescription("");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View className="flex-1 bg-surface-900">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
          <Pressable onPress={handleClose}>
            <Text className="text-red-500 font-medium">Cancel</Text>
          </Pressable>
          <Text className="text-lg font-semibold text-gray-900">Report {itemType}</Text>
          <Pressable
            onPress={handleSubmit}
            disabled={!selectedReason || isLoading}
            className={!selectedReason || isLoading ? "opacity-50" : ""}
          >
            <Text className="text-red-500 font-medium">{isLoading ? "Submitting..." : "Submit"}</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1">
          <View className="p-4">
            {/* Item Info */}
            <View className="bg-gray-50 rounded-lg p-4 mb-6">
              <Text className="text-gray-600 text-sm mb-1">Reporting {itemType}:</Text>
              <Text className="text-gray-900 font-medium">{itemName || `${itemType} #${itemId.slice(-6)}`}</Text>
            </View>

            {/* Reason Selection */}
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-4">Why are you reporting this {itemType}?</Text>

              <View className="space-y-3">
                {REPORT_REASONS.map((reason) => (
                  <Pressable
                    key={reason.key}
                    className={`border rounded-lg p-4 ${
                      selectedReason === reason.key ? "border-red-500 bg-red-50" : "border-gray-300 bg-white"
                    }`}
                    onPress={() => setSelectedReason(reason.key)}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text
                          className={`font-medium ${selectedReason === reason.key ? "text-red-700" : "text-gray-900"}`}
                        >
                          {reason.label}
                        </Text>
                        <Text
                          className={`text-sm mt-1 ${selectedReason === reason.key ? "text-red-600" : "text-gray-600"}`}
                        >
                          {reason.description}
                        </Text>
                      </View>
                      <View
                        className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                          selectedReason === reason.key ? "border-red-500 bg-red-500" : "border-gray-300"
                        }`}
                      >
                        {selectedReason === reason.key && <Ionicons name="checkmark" size={12} color="white" />}
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Additional Details */}
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-2">Additional Details (Optional)</Text>
              <Text className="text-gray-600 text-sm mb-4">
                Provide any additional context that might help us understand the issue.
              </Text>

              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 h-24"
                placeholder="Describe the issue in more detail..."
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
                maxLength={500}
              />
              <Text className="text-gray-500 text-sm mt-2 text-right">{description.length}/500</Text>
            </View>

            {/* Guidelines */}
            <View className="bg-blue-50 rounded-lg p-4">
              <View className="flex-row items-start">
                <Ionicons name="information-circle" size={20} color="#3B82F6" />
                <View className="ml-3 flex-1">
                  <Text className="text-blue-900 font-medium mb-2">Community Guidelines</Text>
                  <Text className="text-blue-800 text-sm">
                    We take reports seriously and review them promptly. False reports may result in account
                    restrictions. Thank you for helping keep our community safe.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
