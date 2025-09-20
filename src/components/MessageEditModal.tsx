import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';
import { ChatMessage } from '../types';

interface MessageEditModalProps {
  visible: boolean;
  onClose: () => void;
  message: ChatMessage | null;
  onSave: (newContent: string) => Promise<void>;
}

const MAX_MESSAGE_LENGTH = 5000;

export const MessageEditModal: React.FC<MessageEditModalProps> = ({
  visible,
  onClose,
  message,
  onSave,
}) => {
  const { colors } = useTheme();
  const [editedContent, setEditedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (message) {
      setEditedContent(message.content);
      setCharacterCount(message.content.length);
      setHasChanges(false);
    }
  }, [message]);

  useEffect(() => {
    if (visible && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [visible]);

  const handleTextChange = (text: string) => {
    if (text.length <= MAX_MESSAGE_LENGTH) {
      setEditedContent(text);
      setCharacterCount(text.length);
      setHasChanges(text !== message?.content);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setEditedContent('');
              setHasChanges(false);
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  const handleSave = async () => {
    const trimmedContent = editedContent.trim();

    if (!trimmedContent) {
      Alert.alert('Error', 'Message cannot be empty');
      return;
    }

    if (trimmedContent === message?.content) {
      onClose();
      return;
    }

    setIsLoading(true);

    try {
      await onSave(trimmedContent);
      setEditedContent('');
      setHasChanges(false);
      onClose();
    } catch (error) {
      console.error('Failed to save edited message:', error);
      Alert.alert(
        'Error',
        'Failed to save your changes. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!message) return null;

  const isNearLimit = characterCount > MAX_MESSAGE_LENGTH * 0.9;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
      transparent
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.container, { backgroundColor: colors.surface[800] }]}>
          <View style={[styles.header, { borderBottomColor: colors.border.default }]}>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.headerButton}
              disabled={isLoading}
            >
              <Text style={[styles.cancelText, { color: colors.text.error }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <Text style={[styles.title, { color: colors.text.primary }]}>
              Edit Message
            </Text>

            <TouchableOpacity
              onPress={handleSave}
              style={[styles.headerButton, !hasChanges && styles.disabledButton]}
              disabled={!hasChanges || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.brand.red} />
              ) : (
                <Text
                  style={[
                    styles.saveText,
                    { color: hasChanges ? colors.brand.red : colors.text.secondary },
                  ]}
                >
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface[700] }]}>
              <TextInput
                ref={inputRef}
                style={[
                  styles.input,
                  { color: colors.text.primary, minHeight: 100, maxHeight: 200 },
                ]}
                value={editedContent}
                onChangeText={handleTextChange}
                placeholder="Enter your message..."
                placeholderTextColor={colors.text.secondary}
                multiline
                autoFocus
                editable={!isLoading}
                textAlignVertical="top"
                selectionColor={colors.brand.red}
              />
            </View>

            <View style={styles.footer}>
              <View style={styles.infoRow}>
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={colors.text.secondary}
                />
                <Text style={[styles.infoText, { color: colors.text.secondary }]}>
                  Messages can be edited within 15 minutes
                </Text>
              </View>

              <Text
                style={[
                  styles.characterCount,
                  { color: isNearLimit ? colors.text.error : colors.text.secondary },
                ]}
              >
                {characterCount} / {MAX_MESSAGE_LENGTH}
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 0,
    minHeight: 300,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    minWidth: 60,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  cancelText: {
    fontSize: 16,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputContainer: {
    borderRadius: 12,
    padding: 12,
  },
  input: {
    fontSize: 16,
    lineHeight: 22,
  },
  footer: {
    marginTop: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
  },
});