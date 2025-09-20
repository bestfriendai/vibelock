import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { performanceMonitor } from '../utils/performance';
import { memoryManager } from '../services/memoryManager';
import { messageVirtualizer } from '../services/messageVirtualizer';
import { messagePaginationManager } from '../services/messagePaginationService';
import useChatStore from '../state/chatStore';

interface PerformanceDashboardProps {
  visible?: boolean;
  onClose?: () => void;
}

export default function PerformanceDashboard({ visible = __DEV__, onClose }: PerformanceDashboardProps) {
  const [metrics, setMetrics] = useState<any>({});
  const [memoryReport, setMemoryReport] = useState<any>({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!visible) return;

    const updateMetrics = async () => {
      // Get performance metrics
      const perfMetrics = performanceMonitor.getDetailedMetrics();
      const memReport = await memoryManager.getMemoryReport();
      const virtMetrics = messageVirtualizer.getPerformanceMetrics();
      const pagMetrics = messagePaginationManager.getMetrics();
      const storeMetrics = useChatStore.getState().getPerformanceMetrics();

      setMetrics({
        performance: Array.from(perfMetrics.entries()),
        virtualization: virtMetrics,
        pagination: pagMetrics,
        store: storeMetrics
      });

      setMemoryReport(memReport);
    };

    // Initial update
    updateMetrics();

    // Set up refresh interval
    const interval = setInterval(updateMetrics, 1000);
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [visible]);

  if (!visible || !__DEV__) return null;

  const getStatusColor = (value: number, threshold: number): string => {
    if (value > threshold * 1.5) return '#ff4444';
    if (value > threshold) return '#ffaa00';
    return '#44ff44';
  };

  const formatMemory = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <View className={`absolute ${isExpanded ? 'top-20 left-4 right-4 bottom-20' : 'top-20 right-4'} bg-black/90 rounded-lg p-2 z-50`}>
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-white font-bold">Performance Monitor</Text>
        <View className="flex-row gap-2">
          <Pressable onPress={() => setIsExpanded(!isExpanded)} className="px-2 py-1 bg-gray-700 rounded">
            <Text className="text-white text-xs">{isExpanded ? 'Minimize' : 'Expand'}</Text>
          </Pressable>
          {onClose && (
            <Pressable onPress={onClose} className="px-2 py-1 bg-red-600 rounded">
              <Text className="text-white text-xs">Close</Text>
            </Pressable>
          )}
        </View>
      </View>

      {!isExpanded ? (
        // Compact view
        <View className="flex-row flex-wrap gap-2">
          <View className="bg-gray-800 rounded px-2 py-1">
            <Text className="text-gray-400 text-xs">FPS</Text>
            <Text className="text-white text-sm font-mono">{metrics.store?.performance?.fpsTrend || 'N/A'}</Text>
          </View>
          <View className="bg-gray-800 rounded px-2 py-1">
            <Text className="text-gray-400 text-xs">Memory</Text>
            <Text className="text-white text-sm font-mono">
              {memoryReport.usedMemory ? `${((memoryReport.usedMemory / memoryReport.totalMemory) * 100).toFixed(1)}%` : 'N/A'}
            </Text>
          </View>
          <View className="bg-gray-800 rounded px-2 py-1">
            <Text className="text-gray-400 text-xs">Components</Text>
            <Text className="text-white text-sm font-mono">{memoryReport.componentCount || 0}</Text>
          </View>
        </View>
      ) : (
        // Expanded view
        <ScrollView className="flex-1">
          {/* Memory Section */}
          <View className="mb-4">
            <Text className="text-white font-semibold mb-2">Memory Usage</Text>
            <View className="bg-gray-800 rounded p-2">
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-400 text-xs">Used / Total</Text>
                <Text className="text-white text-xs font-mono">
                  {formatMemory(memoryReport.usedMemory || 0)} / {formatMemory(memoryReport.totalMemory || 0)}
                </Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-400 text-xs">Components</Text>
                <Text className="text-white text-xs font-mono">{memoryReport.componentCount || 0}</Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-400 text-xs">Subscriptions</Text>
                <Text className="text-white text-xs font-mono">{memoryReport.subscriptionCount || 0}</Text>
              </View>
              {memoryReport.leaks && memoryReport.leaks.length > 0 && (
                <View className="mt-2 pt-2 border-t border-gray-700">
                  <Text className="text-red-400 text-xs font-semibold">Leaks Detected: {memoryReport.leaks.length}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Performance Metrics */}
          <View className="mb-4">
            <Text className="text-white font-semibold mb-2">Performance Metrics</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {metrics.performance?.map(([label, metric]: [string, any]) => (
                  <View key={label} className="bg-gray-800 rounded p-2 min-w-[120]">
                    <Text className="text-gray-400 text-xs" numberOfLines={1}>{label}</Text>
                    <Text className="text-white text-sm font-mono">{metric.average?.toFixed(1)}ms</Text>
                    <Text className="text-gray-500 text-xs">
                      {metric.trend === 'degrading' ? '📉' : metric.trend === 'improving' ? '📈' : '➡️'} {metric.trend}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Virtualization */}
          <View className="mb-4">
            <Text className="text-white font-semibold mb-2">Message Virtualization</Text>
            <View className="bg-gray-800 rounded p-2">
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-400 text-xs">Renders</Text>
                <Text className="text-white text-xs font-mono">{metrics.virtualization?.renders || 0}</Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-400 text-xs">Memory Saved</Text>
                <Text className="text-white text-xs font-mono">{formatMemory(metrics.virtualization?.memSaved || 0)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-400 text-xs">Cache Hit Rate</Text>
                <Text className="text-white text-xs font-mono">
                  {((metrics.virtualization?.cacheHitRate || 0) * 100).toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>

          {/* Pagination */}
          {metrics.pagination && metrics.pagination.length > 0 && (
            <View className="mb-4">
              <Text className="text-white font-semibold mb-2">Message Pagination</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {metrics.pagination.slice(-5).map((metric: any, index: number) => (
                    <View key={index} className="bg-gray-800 rounded p-2 min-w-[100]">
                      <Text className="text-gray-400 text-xs">Batch {index + 1}</Text>
                      <Text className="text-white text-xs font-mono">{metric.batchSize} msgs</Text>
                      <Text className="text-gray-500 text-xs">{metric.loadTime}ms</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Actions */}
          <View className="mt-4 pt-4 border-t border-gray-700">
            <View className="flex-row flex-wrap gap-2">
              <Pressable
                onPress={async () => {
                  const cleaned = await memoryManager.forceCleanup();
                  console.log(`Cleaned ${cleaned} items`);
                }}
                className="bg-blue-600 rounded px-3 py-1"
              >
                <Text className="text-white text-xs">Force Cleanup</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const report = performanceMonitor.exportMetrics();
                  console.log('Performance Report:', report);
                }}
                className="bg-green-600 rounded px-3 py-1"
              >
                <Text className="text-white text-xs">Export Report</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  performanceMonitor.clearMetrics();
                  messageVirtualizer.clear();
                  messagePaginationManager.clearAllState();
                }}
                className="bg-red-600 rounded px-3 py-1"
              >
                <Text className="text-white text-xs">Clear Data</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}