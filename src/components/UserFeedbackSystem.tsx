import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Dimensions,
  Pressable,
  AccessibilityInfo,
  Vibration,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useTheme } from '../providers/ThemeProvider';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface FeedbackItem {
  id: string;
  message: string;
  type: FeedbackType;
  duration?: number;
  actions?: FeedbackAction[];
  progress?: {
    current: number;
    total: number;
  };
  timestamp: Date;
}

interface FeedbackAction {
  label: string;
  onPress: () => void;
  style?: 'primary' | 'secondary' | 'destructive';
}

interface UserFeedbackContextType {
  showToast: (message: string, type?: FeedbackType, duration?: number) => void;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  showError: (error: string | Error, actions?: FeedbackAction[]) => void;
  showSuccess: (message: string, duration?: number) => void;
  showProgress: (current: number, total: number, message?: string) => void;
  hideProgress: () => void;
  clearAll: () => void;
}

const UserFeedbackContext = createContext<UserFeedbackContextType | undefined>(undefined);

export const useUserFeedback = () => {
  const context = useContext(UserFeedbackContext);
  if (!context) {
    throw new Error('useUserFeedback must be used within UserFeedbackProvider');
  }
  return context;
};

export const UserFeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors } = useTheme();
  const [feedbackQueue, setFeedbackQueue] = useState<FeedbackItem[]>([]);
  const [loadingState, setLoadingState] = useState<{ visible: boolean; message?: string }>({
    visible: false
  });
  const [progressState, setProgressState] = useState<{
    visible: boolean;
    current: number;
    total: number;
    message?: string;
  }>({ visible: false, current: 0, total: 0 });

  const animatedValues = useRef<Map<string, Animated.Value>>(new Map());
  const timeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Provide haptic feedback based on type
  const provideHapticFeedback = useCallback((type: FeedbackType) => {
    if (Platform.OS === 'ios') {
      switch (type) {
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'error':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case 'warning':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        default:
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } else if (Platform.OS === 'android') {
      Vibration.vibrate(type === 'error' ? 100 : 50);
    }
  }, []);

  // Announce for accessibility
  const announceForAccessibility = useCallback((message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  }, []);

  const showToast = useCallback(
    (message: string, type: FeedbackType = 'info', duration: number = 3000) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const newItem: FeedbackItem = {
        id,
        message,
        type,
        duration,
        timestamp: new Date()
      };

      // Initialize animation value
      const animValue = new Animated.Value(0);
      animatedValues.current.set(id, animValue);

      // Add to queue
      setFeedbackQueue(prev => {
        // Limit queue size to prevent memory issues
        const updated = [...prev, newItem].slice(-5);
        return updated;
      });

      // Animate in
      Animated.spring(animValue, {
        toValue: 1,
        useNativeDriver: true,
        tension: 40,
        friction: 7
      }).start();

      // Provide haptic feedback
      provideHapticFeedback(type);

      // Announce for accessibility
      announceForAccessibility(message);

      // Auto remove after duration
      if (duration > 0) {
        const timeout = setTimeout(() => {
          removeItem(id);
        }, duration);
        timeouts.current.set(id, timeout);
      }
    },
    [provideHapticFeedback, announceForAccessibility]
  );

  const showLoading = useCallback((message?: string) => {
    setLoadingState({ visible: true, message });
    announceForAccessibility(message || 'Loading...');
  }, [announceForAccessibility]);

  const hideLoading = useCallback(() => {
    setLoadingState({ visible: false });
  }, []);

  const showError = useCallback(
    (error: string | Error, actions?: FeedbackAction[]) => {
      const errorMessage = typeof error === 'string' ? error : error.message;
      const id = `error-${Date.now()}`;
      const newItem: FeedbackItem = {
        id,
        message: errorMessage,
        type: 'error',
        actions,
        timestamp: new Date()
      };

      const animValue = new Animated.Value(0);
      animatedValues.current.set(id, animValue);

      setFeedbackQueue(prev => [...prev, newItem].slice(-5));

      Animated.spring(animValue, {
        toValue: 1,
        useNativeDriver: true
      }).start();

      provideHapticFeedback('error');
      announceForAccessibility(`Error: ${errorMessage}`);
    },
    [provideHapticFeedback, announceForAccessibility]
  );

  const showSuccess = useCallback(
    (message: string, duration: number = 2000) => {
      showToast(message, 'success', duration);
    },
    [showToast]
  );

  const showProgress = useCallback(
    (current: number, total: number, message?: string) => {
      setProgressState({ visible: true, current, total, message });
      const percentage = Math.round((current / total) * 100);
      announceForAccessibility(`Progress: ${percentage}%${message ? ` - ${message}` : ''}`);
    },
    [announceForAccessibility]
  );

  const hideProgress = useCallback(() => {
    setProgressState({ visible: false, current: 0, total: 0 });
  }, []);

  const removeItem = useCallback((id: string) => {
    // Animate out
    const animValue = animatedValues.current.get(id);
    if (animValue) {
      Animated.timing(animValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }).start(() => {
        // Remove from queue
        setFeedbackQueue(prev => prev.filter(item => item.id !== id));

        // Clean up
        animatedValues.current.delete(id);
        const timeout = timeouts.current.get(id);
        if (timeout) {
          clearTimeout(timeout);
          timeouts.current.delete(id);
        }
      });
    }
  }, []);

  const clearAll = useCallback(() => {
    feedbackQueue.forEach(item => removeItem(item.id));
    hideLoading();
    hideProgress();
  }, [feedbackQueue, removeItem, hideLoading, hideProgress]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      timeouts.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  const getIconForType = (type: FeedbackType) => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'warning':
        return 'warning';
      case 'info':
        return 'information-circle';
      case 'loading':
        return 'reload';
      default:
        return 'information-circle';
    }
  };

  const getColorForType = (type: FeedbackType) => {
    switch (type) {
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#F44336';
      case 'warning':
        return '#FFC107';
      case 'info':
        return '#2196F3';
      case 'loading':
        return colors.text.secondary;
      default:
        return colors.text.primary;
    }
  };

  return (
    <UserFeedbackContext.Provider
      value={{
        showToast,
        showLoading,
        hideLoading,
        showError,
        showSuccess,
        showProgress,
        hideProgress,
        clearAll
      }}
    >
      {children}

      {/* Toast Notifications */}
      <View style={styles.toastContainer} pointerEvents="box-none">
        {feedbackQueue.map((item, index) => {
          const animValue = animatedValues.current.get(item.id) || new Animated.Value(0);

          return (
            <Animated.View
              key={item.id}
              style={[
                styles.toastItem,
                {
                  transform: [
                    {
                      translateY: animValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-100, 0]
                      })
                    },
                    {
                      scale: animValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1]
                      })
                    }
                  ],
                  opacity: animValue,
                  bottom: 100 + index * 70
                }
              ]}
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              <BlurView intensity={90} style={styles.toastBlur}>
                <View style={[styles.toastContent, { backgroundColor: getColorForType(item.type) + '20' }]}>
                  <Ionicons
                    name={getIconForType(item.type) as any}
                    size={24}
                    color={getColorForType(item.type)}
                  />
                  <Text
                    style={[styles.toastText, { color: colors.text.primary }]}
                    numberOfLines={2}
                  >
                    {item.message}
                  </Text>
                  {item.actions && item.actions.length > 0 && (
                    <View style={styles.toastActions}>
                      {item.actions.map((action, idx) => (
                        <Pressable
                          key={idx}
                          onPress={() => {
                            action.onPress();
                            removeItem(item.id);
                          }}
                          style={[
                            styles.toastAction,
                            action.style === 'destructive' && styles.toastActionDestructive
                          ]}
                        >
                          <Text style={styles.toastActionText}>{action.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  <Pressable
                    onPress={() => removeItem(item.id)}
                    style={styles.toastClose}
                    accessibilityLabel="Dismiss"
                    accessibilityRole="button"
                  >
                    <Ionicons name="close" size={20} color={colors.text.muted} />
                  </Pressable>
                </View>
              </BlurView>
            </Animated.View>
          );
        })}
      </View>

      {/* Loading Overlay */}
      {loadingState.visible && (
        <View style={styles.loadingOverlay} accessibilityRole="progressbar">
          <BlurView intensity={80} style={styles.loadingContent}>
            <Animated.View
              style={{
                transform: [{
                  rotate: '45deg'
                }]
              }}
            >
              <Ionicons name="reload" size={32} color={colors.brand.red} />
            </Animated.View>
            {loadingState.message && (
              <Text style={[styles.loadingText, { color: colors.text.primary }]}>
                {loadingState.message}
              </Text>
            )}
          </BlurView>
        </View>
      )}

      {/* Progress Overlay */}
      {progressState.visible && (
        <View style={styles.progressOverlay} accessibilityRole="progressbar">
          <BlurView intensity={80} style={styles.progressContent}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(progressState.current / progressState.total) * 100}%`,
                    backgroundColor: colors.brand.red
                  }
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.text.primary }]}>
              {Math.round((progressState.current / progressState.total) * 100)}%
            </Text>
            {progressState.message && (
              <Text style={[styles.progressMessage, { color: colors.text.secondary }]}>
                {progressState.message}
              </Text>
            )}
          </BlurView>
        </View>
      )}
    </UserFeedbackContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999
  },
  toastItem: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  toastBlur: {
    borderRadius: 12
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    minHeight: 60
  },
  toastText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '500'
  },
  toastActions: {
    flexDirection: 'row',
    marginLeft: 12
  },
  toastAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8
  },
  toastActionDestructive: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)'
  },
  toastActionText: {
    fontSize: 12,
    fontWeight: '600'
  },
  toastClose: {
    marginLeft: 8,
    padding: 4
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  loadingContent: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500'
  },
  progressOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  progressContent: {
    padding: 24,
    borderRadius: 16,
    width: SCREEN_WIDTH * 0.8
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 3
  },
  progressText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center'
  },
  progressMessage: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center'
  }
});

export default UserFeedbackProvider;