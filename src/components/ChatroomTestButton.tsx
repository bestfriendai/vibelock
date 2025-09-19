import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';
import { runChatroomTest, TestResult } from '../utils/chatroomTest';

interface ChatroomTestButtonProps {
  onTestComplete?: (results: TestResult[]) => void;
}

export const ChatroomTestButton: React.FC<ChatroomTestButtonProps> = ({ onTestComplete }) => {
  const { colors } = useTheme();
  const [isRunning, setIsRunning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  const handleRunTest = async () => {
    setIsRunning(true);
    try {
      const results = await runChatroomTest();
      setTestResults(results);
      setShowResults(true);
      onTestComplete?.(results);
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? 'checkmark-circle' : 'close-circle';
  };

  const getStatusColor = (success: boolean) => {
    return success ? colors.status.success : colors.status.error;
  };

  const passedCount = testResults.filter(r => r.success).length;
  const totalCount = testResults.length;

  return (
    <>
      <TouchableOpacity
        onPress={handleRunTest}
        disabled={isRunning}
        className="bg-blue-600 px-4 py-2 rounded-lg flex-row items-center"
        style={{ opacity: isRunning ? 0.6 : 1 }}
      >
        <Ionicons 
          name={isRunning ? "hourglass" : "flask"} 
          size={16} 
          color="white" 
          style={{ marginRight: 8 }}
        />
        <Text className="text-white font-medium">
          {isRunning ? 'Running Tests...' : 'Test Chatroom'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showResults}
        transparent
        animationType="slide"
        onRequestClose={() => setShowResults(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View 
            className="bg-white rounded-lg p-6 w-full max-w-md max-h-96"
            style={{ backgroundColor: colors.background }}
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text 
                className="text-xl font-bold"
                style={{ color: colors.text.primary }}
              >
                Test Results
              </Text>
              <TouchableOpacity onPress={() => setShowResults(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text 
                className="text-lg font-semibold"
                style={{ color: colors.text.primary }}
              >
                {passedCount}/{totalCount} Tests Passed
              </Text>
              <View 
                className="h-2 bg-gray-200 rounded-full mt-2"
                style={{ backgroundColor: colors.background }}
              >
                <View 
                  className="h-2 rounded-full"
                  style={{ 
                    width: `${totalCount > 0 ? (passedCount / totalCount) * 100 : 0}%`,
                    backgroundColor: passedCount === totalCount ? colors.status.success : colors.status.warning
                  }}
                />
              </View>
            </View>

            <ScrollView className="flex-1">
              {testResults.map((result, index) => (
                <View key={index} className="flex-row items-start mb-3 p-2 rounded">
                  <Ionicons 
                    name={getStatusIcon(result.success)} 
                    size={20} 
                    color={getStatusColor(result.success)}
                    style={{ marginRight: 8, marginTop: 2 }}
                  />
                  <View className="flex-1">
                    <Text 
                      className="font-medium"
                      style={{ color: colors.text.primary }}
                    >
                      {result.step}
                    </Text>
                    {result.error && (
                      <Text 
                        className="text-sm mt-1"
                        style={{ color: colors.status.error }}
                      >
                        {result.error}
                      </Text>
                    )}
                    {result.data && (
                      <Text 
                        className="text-xs mt-1"
                        style={{ color: colors.text.secondary }}
                      >
                        {JSON.stringify(result.data, null, 2)}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setShowResults(false)}
              className="mt-4 bg-blue-600 py-3 rounded-lg"
            >
              <Text className="text-white text-center font-medium">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default ChatroomTestButton;
