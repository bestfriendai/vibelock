import React from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../providers/ThemeProvider";

interface Props {
  visible: boolean;
  onClose: () => void;
  onReply: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

export default function MessageActionsModal({
  visible,
  onClose,
  onReply,
  onCopy,
  onDelete,
}: Props) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
        }}
        onPress={onClose}
      >
        <View
          style={{
            backgroundColor: colors.surface[800],
            borderRadius: 12,
            padding: 16,
            width: "80%",
          }}
        >
          <Pressable
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
            }}
            onPress={onReply}
          >
            <Ionicons name="arrow-undo" size={24} color={colors.text.primary} />
            <Text
              style={{
                color: colors.text.primary,
                fontSize: 16,
                marginLeft: 16,
              }}
            >
              Reply
            </Text>
          </Pressable>
          <Pressable
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
            }}
            onPress={onCopy}
          >
            <Ionicons name="copy" size={24} color={colors.text.primary} />
            <Text
              style={{
                color: colors.text.primary,
                fontSize: 16,
                marginLeft: 16,
              }}
            >
              Copy
            </Text>
          </Pressable>
          <Pressable
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
            }}
            onPress={onDelete}
          >
            <Ionicons name="trash" size={24} color={colors.brand.red} />
            <Text
              style={{ color: colors.brand.red, fontSize: 16, marginLeft: 16 }}
            >
              Delete
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}