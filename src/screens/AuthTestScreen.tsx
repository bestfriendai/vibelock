import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { runAuthTests, testSupabaseConnection } from '../utils/supabaseAuthTests';

export default function AuthTestScreen() {
  const navigation = useNavigation<any>();
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<boolean | null>(null);

  const handleRunTests = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setTestResults([]);
    
    try {
      Alert.alert(
        'Running Auth Tests',
        'This will test all Supabase authentication functions. Check the console for detailed results.',
        [{ text: 'OK' }]
      );
      
      await runAuthTests();
      
      Alert.alert(
        'Tests Complete',
        'Authentication tests have finished. Check the console for detailed results.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Test Error', error.message || 'Tests failed to run');
    } finally {
      setIsRunning(false);
    }
  };

  const handleTestConnection = async () => {
    setConnectionStatus(null);
    const isConnected = await testSupabaseConnection();
    setConnectionStatus(isConnected);
    
    Alert.alert(
      'Connection Test',
      isConnected ? 'Supabase connection successful!' : 'Supabase connection failed!',
      [{ text: 'OK' }]
    );
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  if (!__DEV__) {
    return (
      <LinearGradient colors={["#1a1a1a", "#2d2d2d", "#1a1a1a"]} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: 'white', fontSize: 18, textAlign: 'center', marginBottom: 20 }}>
            Auth tests are only available in development mode
          </Text>
          <Pressable
            onPress={handleGoBack}
            style={{
              backgroundColor: '#3B82F6',
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 8
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>Go Back</Text>
          </Pressable>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#1a1a1a", "#2d2d2d", "#1a1a1a"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
            <Pressable
              onPress={handleGoBack}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(55, 65, 81, 0.5)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 15
              }}
            >
              <Ionicons name="arrow-back" size={20} color="white" />
            </Pressable>
            <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>
              Auth Tests
            </Text>
          </View>

          {/* Description */}
          <View style={{
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 1,
            borderColor: 'rgba(59, 130, 246, 0.2)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24
          }}>
            <Text style={{ color: '#60A5FA', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
              🧪 Development Testing Suite
            </Text>
            <Text style={{ color: '#D1D5DB', fontSize: 14, lineHeight: 20 }}>
              This screen allows you to test all Supabase authentication functions including signup, signin, 
              password reset, and session management. Results will be logged to the console.
            </Text>
          </View>

          {/* Connection Status */}
          {connectionStatus !== null && (
            <View style={{
              backgroundColor: connectionStatus ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              borderWidth: 1,
              borderColor: connectionStatus ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
              flexDirection: 'row',
              alignItems: 'center'
            }}>
              <Ionicons 
                name={connectionStatus ? "checkmark-circle" : "close-circle"} 
                size={24} 
                color={connectionStatus ? "#10b981" : "#ef4444"} 
                style={{ marginRight: 12 }}
              />
              <Text style={{ 
                color: connectionStatus ? '#10b981' : '#ef4444', 
                fontSize: 16, 
                fontWeight: '600' 
              }}>
                {connectionStatus ? 'Supabase Connected' : 'Connection Failed'}
              </Text>
            </View>
          )}

          {/* Test Buttons */}
          <View style={{ gap: 16 }}>
            <Pressable
              onPress={handleTestConnection}
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderWidth: 1,
                borderColor: 'rgba(59, 130, 246, 0.3)',
                borderRadius: 12,
                padding: 16,
                alignItems: 'center'
              }}
            >
              <Text style={{ color: '#60A5FA', fontSize: 16, fontWeight: '600' }}>
                Test Connection
              </Text>
              <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>
                Quick connection test to Supabase
              </Text>
            </Pressable>

            <Pressable
              onPress={handleRunTests}
              disabled={isRunning}
              style={{
                backgroundColor: isRunning ? 'rgba(107, 114, 128, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                borderWidth: 1,
                borderColor: isRunning ? 'rgba(107, 114, 128, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                borderRadius: 12,
                padding: 16,
                alignItems: 'center'
              }}
            >
              <Text style={{ 
                color: isRunning ? '#9CA3AF' : '#10b981', 
                fontSize: 16, 
                fontWeight: '600' 
              }}>
                {isRunning ? 'Running Tests...' : 'Run All Auth Tests'}
              </Text>
              <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>
                Comprehensive test of all auth functions
              </Text>
            </Pressable>
          </View>

          {/* Test Info */}
          <View style={{
            backgroundColor: 'rgba(55, 65, 81, 0.3)',
            borderRadius: 12,
            padding: 16,
            marginTop: 24
          }}>
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
              Tests Include:
            </Text>
            <View style={{ gap: 8 }}>
              {[
                'Connection Test',
                'User Sign Up',
                'User Sign In',
                'Session Management',
                'Session Refresh',
                'Password Reset',
                'Sign Out',
                'Invalid Credentials Handling',
                'OAuth Setup Verification'
              ].map((test, index) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: '#60A5FA', marginRight: 8 }}>•</Text>
                  <Text style={{ color: '#D1D5DB', fontSize: 14 }}>{test}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Note */}
          <View style={{
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderWidth: 1,
            borderColor: 'rgba(245, 158, 11, 0.2)',
            borderRadius: 12,
            padding: 16,
            marginTop: 24
          }}>
            <Text style={{ color: '#F59E0B', fontSize: 14, fontWeight: '600', marginBottom: 4 }}>
              ⚠️ Note
            </Text>
            <Text style={{ color: '#D1D5DB', fontSize: 12, lineHeight: 18 }}>
              Tests will create temporary user accounts and may send emails. 
              Check the console for detailed results and any error messages.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
