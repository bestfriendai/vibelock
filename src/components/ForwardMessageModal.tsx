import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../providers/ThemeProvider";
import { ChatMessage, ChatRoom } from "../types";
import useChatStore from "../state/chatStore";
import { formatDistanceToNow } from "date-fns";

interface ForwardMessageModalProps {
  visible: boolean;
  onClose: () => void;
  message: ChatMessage | null;
  onForward: (targetRoomId: string, comment?: string) => Promise<void>;
}

export const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({ visible, onClose, message, onForward }) => {
  const { colors } = useTheme();
  const { chatRooms } = useChatStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [filteredRooms, setFilteredRooms] = useState<ChatRoom[]>([]);
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setFilteredRooms(chatRooms);
      setSearchQuery("");
      setSelectedRoomId(null);
      setComment("");
    }
  }, [visible, chatRooms]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = chatRooms.filter((room) => room.name.toLowerCase().includes(searchQuery.toLowerCase()));
      setFilteredRooms(filtered);
    } else {
      setFilteredRooms(chatRooms);
    }
  }, [searchQuery, chatRooms]);

  const handleForward = async () => {
    if (!selectedRoomId) {
      Alert.alert("Error", "Please select a room to forward the message");
      return;
    }

    if (selectedRoomId === message?.chatRoomId) {
      Alert.alert("Error", "Cannot forward message to the same room");
      return;
    }

    setIsLoading(true);

    try {
      await onForward(selectedRoomId, comment.trim() || undefined);
      Alert.alert("Success", "Message forwarded successfully");
      onClose();
    } catch (error) {
      console.error("Failed to forward message:", error);
      Alert.alert("Error", "Failed to forward message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderRoom = ({ item }: { item: ChatRoom }) => {
    const isSelected = selectedRoomId === item.id;
    const isCurrentRoom = item.id === message?.chatRoomId;

    return (
      <TouchableOpacity
        style={[
          styles.roomItem,
          { backgroundColor: colors.surface[800] },
          isSelected && { backgroundColor: colors.brand.red + "20", borderColor: colors.brand.red },
          isCurrentRoom && styles.disabledRoom,
        ]}
        onPress={() => !isCurrentRoom && setSelectedRoomId(item.id)}
        disabled={isCurrentRoom}
        activeOpacity={0.7}
      >
        <View style={styles.roomHeader}>
          <View style={styles.roomInfo}>
            <Text
              style={[
                styles.roomName,
                { color: colors.text.primary },
                isCurrentRoom && { color: colors.text.secondary },
              ]}
            >
              {item.name}
              {isCurrentRoom && " (Current Room)"}
            </Text>
            <View style={styles.roomMeta}>
              <Ionicons name="people-outline" size={12} color={colors.text.secondary} />
              <Text style={[styles.memberCount, { color: colors.text.secondary }]}>{item.memberCount} members</Text>
              {item.lastActivity && (
                <>
                  <Text style={[styles.dot, { color: colors.text.secondary }]}>•</Text>
                  <Text style={[styles.lastActivity, { color: colors.text.secondary }]}>
                    {formatDistanceToNow(new Date(item.lastActivity), { addSuffix: true })}
                  </Text>
                </>
              )}
            </View>
          </View>
          {isSelected && <Ionicons name="checkmark-circle" size={24} color={colors.brand.red} />}
        </View>
        {item.description && (
          <Text style={[styles.roomDescription, { color: colors.text.secondary }]} numberOfLines={1}>
            {item.description}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderMessagePreview = () => {
    if (!message) return null;

    return (
      <View style={[styles.messagePreview, { backgroundColor: colors.surface[800] }]}>
        <Text style={[styles.previewLabel, { color: colors.text.secondary }]}>
          Forwarding message from {message.senderName}
        </Text>
        <Text style={[styles.previewContent, { color: colors.text.primary }]} numberOfLines={2}>
          {message.content}
        </Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.header, { backgroundColor: colors.surface[800] }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text.primary }]}>Forward Message</Text>
          <TouchableOpacity
            onPress={handleForward}
            style={[styles.forwardButton, !selectedRoomId && styles.disabledButton]}
            disabled={!selectedRoomId || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.brand.red} />
            ) : (
              <Text
                style={[styles.forwardButtonText, { color: selectedRoomId ? colors.brand.red : colors.text.secondary }]}
              >
                Forward
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {renderMessagePreview()}

        <View style={styles.searchContainer}>
          <View style={[styles.searchInputContainer, { backgroundColor: colors.surface[700] }]}>
            <Ionicons name="search" size={20} color={colors.text.secondary} />
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: colors.text.primary }]}
              placeholder="Search rooms..."
              placeholderTextColor={colors.text.secondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <FlatList
          data={filteredRooms}
          keyExtractor={(item) => item.id}
          renderItem={renderRoom}
          contentContainerStyle={styles.roomsList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.text.secondary} />
              <Text style={[styles.emptyText, { color: colors.text.secondary }]}>No rooms found</Text>
            </View>
          }
        />

        <View style={[styles.commentContainer, { backgroundColor: colors.surface[800] }]}>
          <Text style={[styles.commentLabel, { color: colors.text.primary }]}>Add a comment (optional)</Text>
          <TextInput
            style={[styles.commentInput, { color: colors.text.primary, backgroundColor: colors.surface[700] }]}
            placeholder="Type your comment..."
            placeholderTextColor={colors.text.secondary}
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={200}
            editable={!isLoading}
          />
          <Text style={[styles.characterCount, { color: colors.text.secondary }]}>{comment.length}/200</Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  forwardButton: {
    padding: 8,
  },
  forwardButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
  messagePreview: {
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
  },
  previewLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  previewContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  roomsList: {
    paddingHorizontal: 16,
  },
  roomItem: {
    padding: 12,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  disabledRoom: {
    opacity: 0.5,
  },
  roomHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  roomMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  memberCount: {
    fontSize: 12,
  },
  dot: {
    fontSize: 12,
  },
  lastActivity: {
    fontSize: 12,
  },
  roomDescription: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 64,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
  commentContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  commentInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
    maxHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
  },
});
