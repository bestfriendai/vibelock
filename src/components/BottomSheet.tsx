import React, { useRef, useImperativeHandle, forwardRef, useState } from "react";
import {
  Modal,
  View,
  Animated,
  PanResponder,
  Dimensions,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface BottomSheetProps {
  children: React.ReactNode;
  snapPoints?: number[];
  onClose?: () => void;
  enablePanDownToClose?: boolean;
  backdropOpacity?: number;
}

export interface BottomSheetRef {
  open: () => void;
  close: () => void;
  snapToIndex: (index: number) => void;
}

export const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  ({ children, snapPoints = [0.5], onClose, enablePanDownToClose = true, backdropOpacity = 0.5 }, ref) => {
    const [visible, setVisible] = useState(false);
    const [currentSnapIndex, setCurrentSnapIndex] = useState(0);
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    const sheetHeight = SCREEN_HEIGHT * (snapPoints[currentSnapIndex] ?? snapPoints[0] ?? 0.5);

    const openSheet = () => {
      setVisible(true);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: SCREEN_HEIGHT - sheetHeight,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const closeSheet = () => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisible(false);
        onClose?.();
      });
    };

    const snapToIndex = (index: number) => {
      if (index >= 0 && index < snapPoints.length && snapPoints[index] != null) {
        setCurrentSnapIndex(index);
        const newHeight = SCREEN_HEIGHT * snapPoints[index];
        Animated.spring(translateY, {
          toValue: SCREEN_HEIGHT - newHeight,
          useNativeDriver: true,
        }).start();
      }
    };

    useImperativeHandle(ref, () => ({
      open: openSheet,
      close: closeSheet,
      snapToIndex,
    }));

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => enablePanDownToClose,
        onMoveShouldSetPanResponder: () => enablePanDownToClose,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            translateY.setValue(SCREEN_HEIGHT - sheetHeight + gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 50 && enablePanDownToClose) {
            closeSheet();
          } else {
            Animated.spring(translateY, {
              toValue: SCREEN_HEIGHT - sheetHeight,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    ).current;

    return (
      <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={closeSheet}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={closeSheet}>
            <Animated.View
              style={{
                flex: 1,
                backgroundColor: "black",
                opacity: backdropAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, backdropOpacity],
                }),
              }}
            />
          </TouchableWithoutFeedback>

          <Animated.View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              backgroundColor: "#1C1C1E",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              height: sheetHeight,
              transform: [{ translateY }],
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -3 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
              elevation: 5,
            }}
            {...panResponder.panHandlers}
          >
            <View className="items-center py-3">
              <View className="w-12 h-1 bg-gray-500 rounded-full" />
            </View>
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    );
  },
);

BottomSheet.displayName = "BottomSheet";
