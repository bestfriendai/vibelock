import React, { useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LegalModal } from './LegalModal';

interface LegalAcceptanceProps {
  onAccept: () => void;
  required?: boolean;
  showTitle?: boolean;
}

export const LegalAcceptance: React.FC<LegalAcceptanceProps> = ({ 
  onAccept, 
  required = true,
  showTitle = true 
}) => {
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'privacy' | 'terms'>('privacy');

  const handlePrivacyToggle = () => {
    setPrivacyAccepted(!privacyAccepted);
  };

  const handleTermsToggle = () => {
    setTermsAccepted(!termsAccepted);
  };

  const handlePrivacyPress = () => {
    setLegalModalTab('privacy');
    setShowLegalModal(true);
  };

  const handleTermsPress = () => {
    setLegalModalTab('terms');
    setShowLegalModal(true);
  };

  const handleAccept = () => {
    if (required && (!privacyAccepted || !termsAccepted)) {
      Alert.alert(
        'Agreement Required',
        'Please accept both the Privacy Policy and Terms of Service to continue.',
        [{ text: 'OK' }]
      );
      return;
    }
    onAccept();
  };

  const canProceed = !required || (privacyAccepted && termsAccepted);

  return (
    <View className="bg-surface-800 rounded-lg p-6">
      {showTitle && (
        <Text className="text-text-primary text-lg font-semibold mb-4">
          Legal Agreement
        </Text>
      )}

      {/* Privacy Policy Acceptance */}
      <View className="mb-4">
        <Pressable
          onPress={handlePrivacyToggle}
          className="flex-row items-start"
        >
          <View className="mr-3 mt-1">
            <Ionicons
              name={privacyAccepted ? "checkbox" : "square-outline"}
              size={20}
              color={privacyAccepted ? "#10B981" : "#9CA3AF"}
            />
          </View>
          <View className="flex-1">
            <Text className="text-text-secondary text-sm leading-6">
              I have read and agree to the{' '}
              <Pressable onPress={handlePrivacyPress}>
                <Text className="text-brand-red underline">Privacy Policy</Text>
              </Pressable>
              , including the collection and use of my personal information as described.
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Terms of Service Acceptance */}
      <View className="mb-6">
        <Pressable
          onPress={handleTermsToggle}
          className="flex-row items-start"
        >
          <View className="mr-3 mt-1">
            <Ionicons
              name={termsAccepted ? "checkbox" : "square-outline"}
              size={20}
              color={termsAccepted ? "#10B981" : "#9CA3AF"}
            />
          </View>
          <View className="flex-1">
            <Text className="text-text-secondary text-sm leading-6">
              I have read and agree to the{' '}
              <Pressable onPress={handleTermsPress}>
                <Text className="text-brand-red underline">Terms of Service</Text>
              </Pressable>
              , including all liability disclaimers and user conduct rules.
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Age Verification */}
      <View className="mb-6 bg-surface-700 rounded-lg p-4">
        <Text className="text-text-secondary text-xs leading-5">
          <Text className="font-semibold">Age Requirement:</Text> By proceeding, you confirm that you are at least 13 years old. If you are under 18, you confirm that your parent or guardian has reviewed and approved these terms.
        </Text>
      </View>

      {/* Accept Button */}
      <Pressable
        onPress={handleAccept}
        disabled={!canProceed}
        className={`rounded-lg py-4 items-center ${
          canProceed ? 'bg-brand-red' : 'bg-surface-700'
        }`}
      >
        <Text className={`font-semibold text-lg ${
          canProceed ? 'text-white' : 'text-text-muted'
        }`}>
          {required ? 'Accept and Continue' : 'Continue'}
        </Text>
      </Pressable>

      {/* Additional Info */}
      <Text className="text-text-muted text-xs text-center mt-4 leading-5">
        By using Locker Room Talk, you acknowledge that user-generated content is not endorsed by us and that we are not liable for content posted by other users.
      </Text>

      {/* Legal Modal */}
      <LegalModal
        visible={showLegalModal}
        onClose={() => setShowLegalModal(false)}
        initialTab={legalModalTab}
      />
    </View>
  );
};
