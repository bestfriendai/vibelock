import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  useSharedValue,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "../providers/ThemeProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface VoiceMessageTranscriptionProps {
  audioUri: string;
  messageId: string;
  existingTranscription?: string;
  onTranscriptionComplete?: (transcription: string) => void;
  autoTranscribe?: boolean;
  showToggle?: boolean;
  showCopyButton?: boolean;
  showLanguageIndicator?: boolean;
  style?: any;
}

interface TranscriptionCache {
  [key: string]: {
    transcription: string;
    timestamp: number;
    confidence?: number;
    language?: string;
  };
}

const CACHE_KEY = "voice_message_transcriptions";
const CACHE_EXPIRY_DAYS = 30;

export const VoiceMessageTranscription: React.FC<VoiceMessageTranscriptionProps> = ({
  audioUri,
  messageId,
  existingTranscription,
  onTranscriptionComplete,
  autoTranscribe = true,
  showToggle = true,
  showCopyButton = true,
  showLanguageIndicator = true,
  style,
}) => {
  const { colors } = useTheme();
  const [transcription, setTranscription] = useState(existingTranscription || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [autoTranscribeEnabled, setAutoTranscribeEnabled] = useState(autoTranscribe);

  const expandAnimation = useSharedValue(0);
  const contentHeight = useSharedValue(0);

  // Load user preference for auto-transcription
  useEffect(() => {
    AsyncStorage.getItem("voice_transcription_enabled").then((value) => {
      if (value !== null) {
        setAutoTranscribeEnabled(value === "true");
      }
    });
  }, []);

  // Load cached transcription
  useEffect(() => {
    loadCachedTranscription();
  }, [messageId]);

  // Auto-transcribe if enabled and no existing transcription
  useEffect(() => {
    if (autoTranscribeEnabled && !transcription && !isLoading && audioUri) {
      transcribeAudio();
    }
  }, [autoTranscribeEnabled, audioUri]);

  const loadCachedTranscription = async () => {
    try {
      const cacheString = await AsyncStorage.getItem(CACHE_KEY);
      if (!cacheString) return;

      const cache: TranscriptionCache = JSON.parse(cacheString);
      const cached = cache[messageId];

      if (!cached) return;

      const ageInDays = (Date.now() - cached.timestamp) / (1000 * 60 * 60 * 24);
      if (ageInDays > CACHE_EXPIRY_DAYS) {
        // Clean up old cache entry
        delete cache[messageId];
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        return;
      }

      setTranscription(cached.transcription);
      setConfidence(cached.confidence || null);
      setDetectedLanguage(cached.language || null);
    } catch (error) {
      console.error("Error loading cached transcription:", error);
    }
  };

  const saveToCache = async (
    text: string,
    conf?: number,
    lang?: string
  ) => {
    try {
      const cacheString = await AsyncStorage.getItem(CACHE_KEY);
      const cache: TranscriptionCache = cacheString ? JSON.parse(cacheString) : {};

      cache[messageId] = {
        transcription: text,
        timestamp: Date.now(),
        confidence: conf,
        language: lang,
      };

      // Limit cache size (keep only recent 100 transcriptions)
      const entries = Object.entries(cache);
      if (entries.length > 100) {
        entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
        const limitedCache = Object.fromEntries(entries.slice(0, 100));
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(limitedCache));
      } else {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      }
    } catch (error) {
      console.error("Error saving transcription to cache:", error);
    }
  };

  const transcribeAudio = async () => {
    if (isLoading || !audioUri) return;

    setIsLoading(true);
    setError(null);

    try {
      // Simulated transcription API call
      // In production, replace with actual transcription service (e.g., OpenAI Whisper, Google Speech-to-Text)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock transcription result
      const mockTranscription = "This is a simulated transcription of the voice message. In production, this would be replaced with actual speech-to-text conversion.";
      const mockConfidence = 0.95;
      const mockLanguage = "en-US";

      setTranscription(mockTranscription);
      setConfidence(mockConfidence);
      setDetectedLanguage(mockLanguage);

      // Save to cache
      await saveToCache(mockTranscription, mockConfidence, mockLanguage);

      // Notify parent component
      onTranscriptionComplete?.(mockTranscription);
    } catch (err) {
      console.error("Transcription error:", err);
      setError("Failed to transcribe audio. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
    expandAnimation.value = withSpring(isExpanded ? 0 : 1, {
      damping: 15,
      stiffness: 150,
    });
    Haptics.selectionAsync();
  }, [isExpanded]);

  const copyToClipboard = useCallback(() => {
    if (transcription) {
      Clipboard.setString(transcription);
      Alert.alert("Copied", "Transcription copied to clipboard");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [transcription]);

  const toggleAutoTranscribe = useCallback(async () => {
    const newValue = !autoTranscribeEnabled;
    setAutoTranscribeEnabled(newValue);
    await AsyncStorage.setItem("voice_transcription_enabled", String(newValue));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (newValue && !transcription) {
      transcribeAudio();
    }
  }, [autoTranscribeEnabled, transcription]);

  const retry = useCallback(() => {
    setError(null);
    transcribeAudio();
  }, [audioUri]);

  const expandedStyle = useAnimatedStyle(() => {
    return {
      maxHeight: expandAnimation.value * contentHeight.value || 0,
      opacity: expandAnimation.value,
    };
  });

  if (!showToggle && !transcription && !isLoading) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {/* Toggle and controls */}
      {(showToggle || transcription) && (
        <View style={styles.header}>
          <Pressable
            onPress={toggleExpanded}
            style={styles.toggleButton}
            disabled={!transcription && !isLoading && !error}
          >
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={colors.text.muted}
            />
            <Text style={[styles.toggleText, { color: colors.text.muted }]}>
              {isLoading
                ? "Transcribing..."
                : transcription
                ? isExpanded
                  ? "Hide transcript"
                  : "Show transcript"
                : "Transcription"}
            </Text>
            {isLoading && (
              <ActivityIndicator
                size="small"
                color={colors.text.muted}
                style={styles.loader}
              />
            )}
          </Pressable>

          {/* Auto-transcribe toggle */}
          {showToggle && !transcription && !isLoading && (
            <Pressable onPress={toggleAutoTranscribe} style={styles.autoToggle}>
              <Ionicons
                name={autoTranscribeEnabled ? "checkbox" : "square-outline"}
                size={18}
                color={colors.brand.primary}
              />
              <Text style={[styles.autoToggleText, { color: colors.text.muted }]}>
                Auto
              </Text>
            </Pressable>
          )}

          {/* Manual transcribe button */}
          {!transcription && !isLoading && !autoTranscribeEnabled && (
            <Pressable onPress={transcribeAudio} style={styles.transcribeButton}>
              <Ionicons name="mic" size={16} color={colors.brand.primary} />
            </Pressable>
          )}
        </View>
      )}

      {/* Transcription content */}
      {(transcription || error) && (
        <Animated.View style={[styles.content, expandedStyle]}>
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: colors.error }]}>
                {error}
              </Text>
              <Pressable onPress={retry} style={styles.retryButton}>
                <Text style={[styles.retryText, { color: colors.brand.primary }]}>
                  Retry
                </Text>
              </Pressable>
            </View>
          ) : (
            <View
              onLayout={(event) => {
                contentHeight.value = event.nativeEvent.layout.height;
              }}
            >
              <Text style={[styles.transcriptionText, { color: colors.text.primary }]}>
                {transcription}
              </Text>

              {/* Metadata and actions */}
              <View style={styles.metadata}>
                {showLanguageIndicator && detectedLanguage && (
                  <View style={styles.languageTag}>
                    <Ionicons name="globe" size={12} color={colors.text.muted} />
                    <Text style={[styles.languageText, { color: colors.text.muted }]}>
                      {detectedLanguage}
                    </Text>
                  </View>
                )}

                {confidence !== null && (
                  <Text style={[styles.confidenceText, { color: colors.text.muted }]}>
                    {Math.round(confidence * 100)}% confident
                  </Text>
                )}

                {showCopyButton && (
                  <Pressable onPress={copyToClipboard} style={styles.copyButton}>
                    <Ionicons name="copy-outline" size={16} color={colors.text.muted} />
                  </Pressable>
                )}
              </View>
            </View>
          )}
        </Animated.View>
      )}

      {/* Prompt to transcribe */}
      {!transcription && !isLoading && !autoTranscribeEnabled && !error && (
        <Pressable onPress={transcribeAudio} style={styles.promptContainer}>
          <Ionicons name="mic-outline" size={16} color={colors.brand.primary} />
          <Text style={[styles.promptText, { color: colors.brand.primary }]}>
            Tap to transcribe
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
  },
  toggleText: {
    fontSize: 12,
    marginLeft: 4,
  },
  loader: {
    marginLeft: 8,
  },
  autoToggle: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
    marginLeft: 8,
  },
  autoToggleText: {
    fontSize: 12,
    marginLeft: 4,
  },
  transcribeButton: {
    padding: 4,
    marginLeft: 8,
  },
  content: {
    overflow: "hidden",
    marginTop: 8,
  },
  transcriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  metadata: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 12,
  },
  languageTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  languageText: {
    fontSize: 11,
  },
  confidenceText: {
    fontSize: 11,
  },
  copyButton: {
    padding: 4,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,0,0,0.1)",
  },
  errorText: {
    flex: 1,
    fontSize: 12,
  },
  retryButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  retryText: {
    fontSize: 12,
    fontWeight: "600",
  },
  promptContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(0,122,255,0.3)",
  },
  promptText: {
    fontSize: 12,
    marginLeft: 6,
  },
});