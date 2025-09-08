import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Pressable, 
  ActivityIndicator, 
  Alert,
  Modal 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useSubscriptionStore from '../../state/subscriptionStore';
import { buildEnv, canUseRevenueCat } from '../../utils/buildEnvironment';

interface PaywallProps {
  visible: boolean;
  onClose: () => void;
}

interface FeatureItemProps {
  icon: string;
  text: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, text }) => (
  <View className="flex-row items-center py-3">
    <Text className="text-2xl mr-3">{icon}</Text>
    <Text className="text-text-primary text-base flex-1">{text}</Text>
    <Ionicons name="checkmark" size={20} color="#10B981" />
  </View>
);

interface SubscriptionCardProps {
  package: any;
  isSelected: boolean;
  onSelect: () => void;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({ 
  package: pkg, 
  isSelected, 
  onSelect 
}) => {
  const isAnnual = pkg.packageType === 'ANNUAL';
  const savings = isAnnual ? '60% OFF' : null;

  return (
    <Pressable
      onPress={onSelect}
      className={`border-2 rounded-xl p-4 mb-3 ${
        isSelected 
          ? 'border-brand-red bg-brand-red/10' 
          : 'border-surface-700 bg-surface-800'
      }`}
    >
      {savings && (
        <View className="absolute -top-2 -right-2 bg-green-500 px-2 py-1 rounded-full">
          <Text className="text-white text-xs font-bold">{savings}</Text>
        </View>
      )}
      
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-text-primary font-semibold text-lg">
            {pkg.storeProduct.title}
          </Text>
          <Text className="text-text-secondary text-sm">
            {pkg.storeProduct.description}
          </Text>
        </View>
        
        <View className="items-end">
          <Text className="text-text-primary font-bold text-xl">
            {pkg.storeProduct.priceString}
          </Text>
          {isAnnual && (
            <Text className="text-text-tertiary text-xs">
              ${(parseFloat(pkg.storeProduct.price) / 12).toFixed(2)}/month
            </Text>
          )}
        </View>
      </View>
      
      <View className={`w-5 h-5 rounded-full border-2 mt-3 ${
        isSelected 
          ? 'border-brand-red bg-brand-red' 
          : 'border-surface-600'
      }`}>
        {isSelected && (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="checkmark" size={12} color="white" />
          </View>
        )}
      </View>
    </Pressable>
  );
};

export const PaywallAdaptive: React.FC<PaywallProps> = ({ visible, onClose }) => {
  const { 
    offerings, 
    isLoading, 
    purchasePackage, 
    restorePurchases,
    loadOfferings 
  } = useSubscriptionStore();
  
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [packages, setPackages] = useState<any[]>([]);

  useEffect(() => {
    if (visible) {
      loadOfferings();
    }
  }, [visible]);

  useEffect(() => {
    if (offerings.length > 0 && offerings[0].availablePackages) {
      const availablePackages = offerings[0].availablePackages;
      setPackages(availablePackages);
      
      // Pre-select annual package if available, otherwise first package
      const annual = availablePackages.find((pkg: any) => pkg.packageType === 'ANNUAL');
      setSelectedPackage(annual || availablePackages[0]);
    }
  }, [offerings]);

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    try {
      const customerInfo = await purchasePackage(selectedPackage);
      if (customerInfo) {
        const message = canUseRevenueCat()
          ? 'Welcome to Locker Room Plus! Enjoy your premium features.'
          : 'Demo purchase successful! In a real app, this would activate premium features.';

        Alert.alert('Success!', message, [{ text: 'OK', onPress: onClose }]);
      }
    } catch (error: any) {
      const message = canUseRevenueCat()
        ? error.message || 'Something went wrong. Please try again.'
        : 'This is a demo. Real purchases require a development build.';

      Alert.alert('Purchase Failed', message, [{ text: 'OK' }]);
    }
  };

  const handleRestore = async () => {
    try {
      await restorePurchases();
      const message = canUseRevenueCat()
        ? 'Your purchases have been restored.'
        : 'Demo restore successful!';

      Alert.alert('Restore Successful', message, [{ text: 'OK', onPress: onClose }]);
    } catch (error: any) {
      const message = canUseRevenueCat()
        ? 'No previous purchases found or restore failed.'
        : 'This is a demo. Real restore requires a development build.';

      Alert.alert('Restore Failed', message, [{ text: 'OK' }]);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-surface-900">
        {/* Header */}
        <View className="flex-row items-center justify-between p-6 border-b border-surface-700">
          <Text className="text-text-primary text-xl font-bold">Upgrade to Plus</Text>
          <Pressable onPress={onClose} className="p-2">
            <Ionicons name="close" size={24} color="#9CA3AF" />
          </Pressable>
        </View>

        {/* Expo Go Notice */}
        {buildEnv.isExpoGo && (
          <View className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg mx-6 mt-4 p-3">
            <View className="flex-row items-center">
              <Ionicons name="information-circle" size={16} color="#F59E0B" />
              <Text className="text-yellow-600 text-sm font-medium ml-2">Demo Mode</Text>
            </View>
            <Text className="text-yellow-700 text-xs mt-1">
              This is a demo in Expo Go. Real purchases require a development build.
            </Text>
          </View>
        )}

        <ScrollView className="flex-1 px-6">
          {/* Features */}
          <View className="py-6">
            <Text className="text-text-primary text-2xl font-bold mb-6 text-center">
              Unlock Premium Features
            </Text>

            <FeatureItem icon="🚫" text="Ad-Free Experience" />
            <FeatureItem icon="🔍" text="Advanced Search & Filters" />
            <FeatureItem icon="📊" text="Review Analytics & Insights" />
            <FeatureItem icon="🎨" text="Custom Profile Themes" />
            <FeatureItem icon="⚡" text="Priority Support" />
            <FeatureItem icon="🌍" text="Extended Location Search" />
          </View>

          {/* Subscription Packages */}
          <View className="pb-6">
            <Text className="text-text-primary text-lg font-semibold mb-4">
              Choose Your Plan
            </Text>

            {packages.map((pkg) => (
              <SubscriptionCard
                key={pkg.identifier}
                package={pkg}
                isSelected={selectedPackage?.identifier === pkg.identifier}
                onSelect={() => setSelectedPackage(pkg)}
              />
            ))}
          </View>
        </ScrollView>

        {/* Footer */}
        <View className="p-6 border-t border-surface-700">
          <Pressable
            onPress={handlePurchase}
            disabled={!selectedPackage || isLoading}
            className={`rounded-xl py-4 items-center mb-4 ${
              !selectedPackage || isLoading
                ? 'bg-surface-700'
                : 'bg-brand-red'
            }`}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-lg">
                {buildEnv.isExpoGo ? 'Try Demo' : 'Start Free Trial'}
              </Text>
            )}
          </Pressable>

          <Pressable onPress={handleRestore} className="py-2">
            <Text className="text-brand-red text-center font-medium">
              Restore Purchases
            </Text>
          </Pressable>

          <Text className="text-text-tertiary text-xs text-center mt-4 leading-4">
            {buildEnv.isExpoGo
              ? 'Demo mode - no real purchases will be made.'
              : 'Free trial for 7 days, then auto-renews. Cancel anytime in Settings.'
            }
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};
