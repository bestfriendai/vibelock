import React from "react";
import { View, Text, ScrollView, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

interface PrivacyPolicyProps {
  onClose?: () => void;
  showNavigation?: boolean;
  onNavigateToTerms?: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onClose, showNavigation = false, onNavigateToTerms }) => {
  const openEmail = () => {
    Linking.openURL("mailto:contact@lockerroomapp.com");
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      {/* Header */}
      <View className="flex-row items-center justify-between p-6 border-b border-surface-700">
        <Text className="text-text-primary text-xl font-bold">Privacy Policy</Text>
        <View className="flex-row items-center">
          {showNavigation && onNavigateToTerms && (
            <Pressable onPress={onNavigateToTerms} className="mr-4">
              <Text className="text-brand-red font-medium">Terms</Text>
            </Pressable>
          )}
          {onClose && (
            <Pressable onPress={onClose} className="p-2">
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        {/* Effective Date */}
        <View className="mb-6">
          <Text className="text-text-secondary text-sm">Effective Date: September 7, 2025</Text>
          <Text className="text-text-secondary text-sm">Last Updated: September 7, 2025</Text>
        </View>

        {/* Introduction */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">Introduction</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            Welcome to Locker Room Talk ("we," "our," or "us"). This Privacy Policy explains how we collect, use,
            disclose, and safeguard your information when you use our anonymous review platform mobile application and
            related services (collectively, the "Service").
          </Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            <Text className="font-semibold">ANONYMOUS PLATFORM NOTICE:</Text> Our Service is designed to allow anonymous
            posting of reviews. While we enable anonymous interactions, we may collect certain technical information for
            security, legal compliance, and platform integrity purposes.
          </Text>
          <Text className="text-text-secondary text-sm leading-6">
            By using our Service, you consent to the data practices described in this Privacy Policy. If you do not
            agree with the practices described in this Privacy Policy, please do not use our Service.
          </Text>
        </View>

        {/* Information We Collect */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">1. Information We Collect</Text>

          <Text className="text-text-primary text-base font-medium mb-2">1.1 Personal Information</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            We may collect personal information that you voluntarily provide to us, including:
          </Text>
          <View className="ml-4 mb-3">
            <Text className="text-text-secondary text-sm leading-6">
              • Account information (anonymous username, email address for account recovery only)
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Anonymous profile details (preferences, settings)
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Anonymous user-generated content (reviews, ratings, comments, chat messages)
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Communication data (support requests, feedback, report submissions)
            </Text>
          </View>

          <Text className="text-text-primary text-base font-medium mb-2">1.2 Location Information</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            With your explicit consent, we collect and process location data to provide location-based features,
            including:
          </Text>
          <View className="ml-4 mb-3">
            <Text className="text-text-secondary text-sm leading-6">
              • Precise location data (GPS coordinates) when using location-based search
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Approximate location data for content personalization
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Location history for improved service recommendations
            </Text>
          </View>

          <Text className="text-text-primary text-base font-medium mb-2">1.3 Automatically Collected Information</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            We automatically collect certain information when you use our Service:
          </Text>
          <View className="ml-4 mb-3">
            <Text className="text-text-secondary text-sm leading-6">
              • Device information (device type, operating system, unique device identifiers)
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Usage data (app interactions, features used, time spent)
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Log data (IP address, access times, error logs)
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Analytics data (app performance, crash reports)
            </Text>
          </View>
        </View>

        {/* Third-Party Services */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">2. Third-Party Services</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            Our Service integrates with third-party services that may collect information about you:
          </Text>

          <Text className="text-text-primary text-base font-medium mb-2">2.1 Supabase (Backend Services)</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            We use Supabase for data storage and backend services. Your data is processed according to Supabase's
            privacy policy and security standards.
          </Text>

          <Text className="text-text-primary text-base font-medium mb-2">2.2 RevenueCat (Subscription Management)</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            For subscription services, we use RevenueCat, which may collect purchase information, subscription status,
            and related transaction data.
          </Text>

          <Text className="text-text-primary text-base font-medium mb-2">2.3 Google AdMob (Advertising)</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            We use Google AdMob to display advertisements. AdMob may collect advertising identifiers, device
            information, and usage data for personalized advertising. You can opt out of personalized ads through your
            device settings.
          </Text>
        </View>

        {/* How We Use Information */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">3. How We Use Your Information</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            We use the collected information for the following purposes:
          </Text>
          <View className="ml-4 mb-3">
            <Text className="text-text-secondary text-sm leading-6">
              • Provide, maintain, and improve our anonymous review Service
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Process transactions and manage subscriptions
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Maintain platform anonymity while preventing abuse
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Enable location-based features and search functionality
            </Text>
            <Text className="text-text-secondary text-sm leading-6">• Facilitate anonymous user communications</Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Process content reports and moderation requests
            </Text>
            <Text className="text-text-secondary text-sm leading-6">• Send service notifications and updates</Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Analyze usage patterns and improve app performance
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Detect, prevent, and address abuse, fraud, and security threats
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Comply with legal obligations including law enforcement requests
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Enforce our Terms of Service and content policies
            </Text>
          </View>
        </View>

        {/* Information Sharing */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">4. Information Sharing and Disclosure</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            We do not sell, trade, or otherwise transfer your personal information to third parties except as described
            below:
          </Text>

          <Text className="text-text-primary text-base font-medium mb-2">4.1 Service Providers</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            We may share information with trusted third-party service providers who assist us in operating our Service,
            subject to confidentiality agreements.
          </Text>

          <Text className="text-text-primary text-base font-medium mb-2">
            4.2 Legal Requirements and Law Enforcement
          </Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            We may disclose information if required by law, court order, subpoena, or government request. This includes
            responding to law enforcement requests, protecting our rights, property, or safety, investigating fraud or
            security issues, or protecting against harm to individuals. While our platform is anonymous, we may be
            legally required to provide available technical information in response to valid legal processes.
          </Text>

          <Text className="text-text-primary text-base font-medium mb-2">4.3 Business Transfers</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            In the event of a merger, acquisition, or sale of assets, user information may be transferred as part of the
            transaction.
          </Text>

          <Text className="text-text-primary text-base font-medium mb-2">4.4 Public Anonymous Information</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            Information you post anonymously (such as reviews, ratings, and comments) will be visible to other users and
            the general public. While your identity is not directly revealed, please be aware that the content of your
            posts may contain information that could potentially identify you. Exercise caution when posting.
          </Text>
        </View>

        {/* Data Security */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">5. Data Security and Anonymity</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            We implement appropriate technical and organizational security measures to protect your personal information
            and maintain platform anonymity. This includes separating identifying information from posted content,
            encrypting sensitive data, and limiting internal access. However, no method of transmission over the
            internet or electronic storage is 100% secure, and we cannot guarantee absolute anonymity in all
            circumstances, particularly in response to legal requirements.
          </Text>
        </View>

        {/* International Data Transfers */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">6. International Data Transfers</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            Your information may be transferred to and processed in countries other than your country of residence.
            These countries may have different data protection laws. We ensure appropriate safeguards are in place for
            such transfers.
          </Text>
        </View>

        {/* Your Rights */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">7. Your Rights and Choices</Text>

          <Text className="text-text-primary text-base font-medium mb-2">7.1 Access and Control</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            You have the right to access, update, or delete your personal information through your account settings or
            by contacting us.
          </Text>

          <Text className="text-text-primary text-base font-medium mb-2">7.2 GDPR Rights (EU Residents)</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            If you are in the European Union, you have additional rights under GDPR:
          </Text>
          <View className="ml-4 mb-3">
            <Text className="text-text-secondary text-sm leading-6">• Right to access your personal data</Text>
            <Text className="text-text-secondary text-sm leading-6">• Right to rectification of inaccurate data</Text>
            <Text className="text-text-secondary text-sm leading-6">• Right to erasure ("right to be forgotten")</Text>
            <Text className="text-text-secondary text-sm leading-6">• Right to restrict processing</Text>
            <Text className="text-text-secondary text-sm leading-6">• Right to data portability</Text>
            <Text className="text-text-secondary text-sm leading-6">• Right to object to processing</Text>
            <Text className="text-text-secondary text-sm leading-6">• Right to withdraw consent</Text>
          </View>

          <Text className="text-text-primary text-base font-medium mb-2">7.3 CCPA Rights (California Residents)</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            If you are a California resident, you have rights under CCPA:
          </Text>
          <View className="ml-4 mb-3">
            <Text className="text-text-secondary text-sm leading-6">
              • Right to know what personal information is collected
            </Text>
            <Text className="text-text-secondary text-sm leading-6">• Right to delete personal information</Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Right to opt-out of the sale of personal information
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Right to non-discrimination for exercising privacy rights
            </Text>
          </View>

          <Text className="text-text-primary text-base font-medium mb-2">7.4 Location Data</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            You can control location data collection through your device settings or app permissions. Disabling location
            services may limit certain app features.
          </Text>

          <Text className="text-text-primary text-base font-medium mb-2">7.5 Marketing Communications</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            You can opt out of promotional communications by following unsubscribe instructions in emails or adjusting
            notification settings in the app.
          </Text>
        </View>

        {/* Children's Privacy */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">8. Children's Privacy</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            Our Service is not intended for children under 13 years of age. We do not knowingly collect personal
            information from children under 13. If we become aware that we have collected personal information from a
            child under 13, we will take steps to delete such information.
          </Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            For users between 13 and 18 years of age, parental consent may be required in certain jurisdictions. Parents
            or guardians may contact us to review, modify, or delete their child's information.
          </Text>
        </View>

        {/* Cookies and Tracking */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">9. Cookies and Tracking Technologies</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            We use cookies, local storage, and similar tracking technologies to enhance your experience, analyze usage,
            and provide personalized content. You can manage these preferences through your device settings.
          </Text>
        </View>

        {/* Data Retention */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">10. Data Retention</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            We retain your personal information for as long as necessary to provide our Service, comply with legal
            obligations, resolve disputes, and enforce our agreements. Anonymous reviews and content may remain on the
            platform even after account deletion, but will no longer be associated with any identifying information. We
            may retain certain technical information as required by law or for legitimate business purposes including
            fraud prevention and platform security.
          </Text>
        </View>

        {/* Changes to Privacy Policy */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">11. Changes to This Privacy Policy</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            We may update this Privacy Policy from time to time. We will notify you of any material changes by posting
            the new Privacy Policy in the app and updating the "Last Updated" date. Your continued use of the Service
            after such changes constitutes acceptance of the updated Privacy Policy.
          </Text>
        </View>

        {/* Special Notice for Anonymous Platform */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">12. Special Notice: Anonymous Platform</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            <Text className="font-semibold">IMPORTANT:</Text> While we design our platform to enable anonymous posting:
          </Text>
          <View className="ml-4 mb-3">
            <Text className="text-text-secondary text-sm leading-6">
              • We cannot guarantee complete anonymity in all circumstances
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Legal processes may require disclosure of available information
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Technical data (IP addresses, device IDs) may be logged for security
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Pattern analysis may potentially link anonymous accounts
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Content you post may inadvertently reveal identifying information
            </Text>
          </View>
        </View>

        {/* Contact Information */}
        <View className="mb-8">
          <Text className="text-text-primary text-lg font-semibold mb-3">13. Contact Us</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            If you have any questions about this Privacy Policy or our data practices, please contact us:
          </Text>
          <View className="bg-surface-800 rounded-lg p-4">
            <Text className="text-text-primary font-medium mb-2">Privacy Officer</Text>
            <Text className="text-text-secondary text-sm mb-1">Locker Room Talk</Text>
            <Pressable onPress={openEmail}>
              <Text className="text-brand-red text-sm">contact@lockerroomapp.com</Text>
            </Pressable>
            <Text className="text-text-secondary text-sm mt-2">We will respond to your inquiry within 30 days.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
