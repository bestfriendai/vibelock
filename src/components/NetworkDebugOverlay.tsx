import React, { useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { Ionicons } from "@expo/vector-icons";

interface NetworkState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type: string;
  details: any;
  timestamp: string;
}

export default function NetworkDebugOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [networkHistory, setNetworkHistory] = useState<NetworkState[]>([]);
  const [currentState, setCurrentState] = useState<NetworkState | null>(null);

  useEffect(() => {
    // Get initial state
    NetInfo.fetch().then((state) => {
      const networkState: NetworkState = {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        details: state.details,
        timestamp: new Date().toLocaleTimeString()
      };
      setCurrentState(networkState);
      setNetworkHistory(prev => [networkState, ...prev.slice(0, 9)]); // Keep last 10
    });

    // Listen for changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      const networkState: NetworkState = {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        details: state.details,
        timestamp: new Date().toLocaleTimeString()
      };
      setCurrentState(networkState);
      setNetworkHistory(prev => [networkState, ...prev.slice(0, 9)]); // Keep last 10
    });

    return unsubscribe;
  }, []);

  const getConnectionStatus = (state: NetworkState) => {
    const isConnected = Boolean(state.isConnected);
    const hasInternetAccess = state.isInternetReachable === true || 
                            (state.isInternetReachable === null && isConnected);
    return isConnected && hasInternetAccess;
  };

  if (!isVisible) {
    return (
      <Pressable
        onPress={() => setIsVisible(true)}
        className="absolute top-20 right-4 bg-blue-600 rounded-full p-2 z-50"
      >
        <Ionicons name="bug" size={16} color="white" />
      </Pressable>
    );
  }

  return (
    <View className="absolute top-20 right-4 bg-black/90 rounded-lg p-3 max-w-80 z-50">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-white font-bold text-sm">Network Debug</Text>
        <Pressable onPress={() => setIsVisible(false)}>
          <Ionicons name="close" size={16} color="white" />
        </Pressable>
      </View>

      {currentState && (
        <View className="mb-3">
          <Text className="text-white font-semibold text-xs mb-1">Current State:</Text>
          <View className="bg-gray-800 rounded p-2">
            <Text className="text-white text-xs">
              Connected: {String(currentState.isConnected)}
            </Text>
            <Text className="text-white text-xs">
              Internet: {String(currentState.isInternetReachable)}
            </Text>
            <Text className="text-white text-xs">
              Type: {currentState.type}
            </Text>
            <Text className={`text-xs font-bold ${getConnectionStatus(currentState) ? 'text-green-400' : 'text-red-400'}`}>
              Status: {getConnectionStatus(currentState) ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </View>
        </View>
      )}

      <Text className="text-white font-semibold text-xs mb-1">History:</Text>
      <View className="max-h-40">
        {networkHistory.map((state, index) => (
          <View key={index} className="bg-gray-800 rounded p-2 mb-1">
            <Text className="text-gray-300 text-xs">
              {state.timestamp} - {getConnectionStatus(state) ? '🟢' : '🔴'}
            </Text>
            <Text className="text-white text-xs">
              C:{String(state.isConnected)} I:{String(state.isInternetReachable)} T:{state.type}
            </Text>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => {
          NetInfo.fetch().then((state) => {
            console.log('🔍 Manual network check:', state);
          });
        }}
        className="bg-blue-600 rounded p-2 mt-2"
      >
        <Text className="text-white text-xs text-center font-medium">Refresh</Text>
      </Pressable>
    </View>
  );
}
