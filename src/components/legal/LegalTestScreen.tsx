import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LegalModal } from './LegalModal';
import { LegalAcceptance } from './LegalAcceptance';

// Test component to verify legal documents work properly in the app
export const LegalTestScreen: React.FC = () => {
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'privacy' | 'terms'>('privacy');
  const [showAcceptance, setShowAcceptance] = useState(false);

  const handleAcceptance = () => {
    console.log('Legal documents accepted!');
    setShowAcceptance(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      <ScrollView className="flex-1 p-6">
        <Text className="text-text-primary text-2xl font-bold mb-6">
          Legal Documents Test
        </Text>

        <Text className="text-text-secondary text-sm mb-6">
          Test all legal document components to ensure they open properly within the app.
        </Text>

        {/* Test Individual Documents */}
        <View className="bg-surface-800 rounded-lg mb-6">
          <View className="p-4 border-b border-surface-700">
            <Text className="text-text-primary font-semibold">Individual Documents</Text>
          </View>
          
          <Pressable
            onPress={() => {
              setLegalModalTab('privacy');
              setShowLegalModal(true);
            }}
            className="p-4 border-b border-surface-700"
          >
            <View className="flex-row items-center">
              <Ionicons name="shield-checkmark-outline" size={20} color="#9CA3AF" />
              <Text className="text-text-primary font-medium ml-3">Test Privacy Policy</Text>
              <View className="flex-1" />
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </View>
          </Pressable>
          
          <Pressable
            onPress={() => {
              setLegalModalTab('terms');
              setShowLegalModal(true);
            }}
            className="p-4"
          >
            <View className="flex-row items-center">
              <Ionicons name="document-text-outline" size={20} color="#9CA3AF" />
              <Text className="text-text-primary font-medium ml-3">Test Terms of Service</Text>
              <View className="flex-1" />
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </View>
          </Pressable>
        </View>

        {/* Test Acceptance Component */}
        <View className="bg-surface-800 rounded-lg mb-6">
          <View className="p-4 border-b border-surface-700">
            <Text className="text-text-primary font-semibold">Acceptance Component</Text>
          </View>
          
          <Pressable
            onPress={() => setShowAcceptance(true)}
            className="p-4"
          >
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle-outline" size={20} color="#9CA3AF" />
              <Text className="text-text-primary font-medium ml-3">Test Legal Acceptance</Text>
              <View className="flex-1" />
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </View>
          </Pressable>
        </View>

        {/* Test Results */}
        <View className="bg-surface-800 rounded-lg mb-6">
          <View className="p-4 border-b border-surface-700">
            <Text className="text-text-primary font-semibold">Test Checklist</Text>
          </View>
          
          <View className="p-4">
            <Text className="text-text-secondary text-sm mb-3">
              Verify the following functionality:
            </Text>
            
            <View className="space-y-2">
              <Text className="text-text-secondary text-sm">• ✅ Privacy Policy opens in modal</Text>
              <Text className="text-text-secondary text-sm">• ✅ Terms of Service opens in modal</Text>
              <Text className="text-text-secondary text-sm">• ✅ Navigation between documents works</Text>
              <Text className="text-text-secondary text-sm">• ✅ Email links open mail app</Text>
              <Text className="text-text-secondary text-sm">• ✅ Acceptance component validates properly</Text>
              <Text className="text-text-secondary text-sm">• ✅ Modal closes correctly</Text>
              <Text className="text-text-secondary text-sm">• ✅ Scrolling works on all screen sizes</Text>
              <Text className="text-text-secondary text-sm">• ✅ Contact email is contact@lockerroomapp.com</Text>
            </View>
          </View>
        </View>

        {/* Contact Information Verification */}
        <View className="bg-surface-800 rounded-lg">
          <View className="p-4 border-b border-surface-700">
            <Text className="text-text-primary font-semibold">Contact Information</Text>
          </View>
          
          <View className="p-4">
            <Text className="text-text-secondary text-sm mb-2">
              <Text className="font-semibold">Updated Contact Email:</Text>
            </Text>
            <Text className="text-brand-red text-sm">contact@lockerroomapp.com</Text>
            
            <Text className="text-text-secondary text-xs mt-3">
              This email address is now used in both Privacy Policy and Terms of Service documents.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Legal Modal */}
      <LegalModal
        visible={showLegalModal}
        onClose={() => setShowLegalModal(false)}
        initialTab={legalModalTab}
      />

      {/* Acceptance Modal */}
      {showAcceptance && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center p-6">
          <View className="bg-surface-900 rounded-lg w-full max-w-md">
            <View className="p-4 border-b border-surface-700">
              <Text className="text-text-primary font-semibold">Legal Acceptance Test</Text>
            </View>
            
            <View className="p-4">
              <LegalAcceptance
                onAccept={handleAcceptance}
                required={true}
                showTitle={false}
              />
            </View>
            
            <Pressable
              onPress={() => setShowAcceptance(false)}
              className="p-4 border-t border-surface-700"
            >
              <Text className="text-brand-red text-center font-medium">Close Test</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};
