import React from "react";
import { View, Text, ScrollView, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

interface TermsOfServiceProps {
  onClose?: () => void;
  showNavigation?: boolean;
  onNavigateToPrivacy?: () => void;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({
  onClose,
  showNavigation = false,
  onNavigateToPrivacy,
}) => {
  const openEmail = () => {
    Linking.openURL("mailto:contact@lockerroomapp.com");
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-900">
      {/* Header */}
      <View className="flex-row items-center justify-between p-6 border-b border-surface-700">
        <Text className="text-text-primary text-xl font-bold">Terms of Service</Text>
        <View className="flex-row items-center">
          {showNavigation && onNavigateToPrivacy && (
            <Pressable onPress={onNavigateToPrivacy} className="mr-4">
              <Text className="text-brand-red font-medium">Privacy</Text>
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
            Welcome to Locker Room Talk ("we," "our," "us," or "Company"). These Terms of Service ("Terms") govern your
            use of our mobile application, an anonymous review platform that enables users to post and read anonymous
            reviews and opinions about individuals, places, and experiences (collectively, the "Service").
          </Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            <Text className="font-semibold">IMPORTANT: THIS IS AN ANONYMOUS REVIEW PLATFORM.</Text> All content posted
            on this platform is user-generated and anonymous. We do not verify the identity of users or the accuracy of
            posted content.
          </Text>
          <Text className="text-text-secondary text-sm leading-6">
            By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of
            these Terms, you may not access the Service.
          </Text>
        </View>

        {/* Acceptance of Terms */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">1. Acceptance of Terms</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            By creating an account, downloading, installing, or using the Service, you acknowledge that you have read,
            understood, and agree to be bound by these Terms and our Privacy Policy, which is incorporated herein by
            reference.
          </Text>
          <Text className="text-text-secondary text-sm leading-6">
            You represent that you are at least 13 years old and have the legal capacity to enter into these Terms. If
            you are under 18, you represent that your parent or guardian has reviewed and agreed to these Terms.
          </Text>
        </View>

        {/* Description of Service */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">2. Description of Service</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            Locker Room Talk is an anonymous review platform that allows users to post and read anonymous reviews about
            individuals, locations, and experiences. The Service includes features such as:
          </Text>
          <View className="ml-4 mb-3">
            <Text className="text-text-secondary text-sm leading-6">
              • Anonymous posting and reviewing capabilities
            </Text>
            <Text className="text-text-secondary text-sm leading-6">• Location-based search and discovery</Text>
            <Text className="text-text-secondary text-sm leading-6">• Anonymous user reviews and ratings</Text>
            <Text className="text-text-secondary text-sm leading-6">• Anonymous chat and messaging features</Text>
            <Text className="text-text-secondary text-sm leading-6">• Content reporting and moderation system</Text>
            <Text className="text-text-secondary text-sm leading-6">• Premium subscription services</Text>
          </View>
          <Text className="text-text-secondary text-sm leading-6 mt-3">
            <Text className="font-semibold">WE DO NOT VERIFY THE ACCURACY OR TRUTHFULNESS</Text> of any user-generated
            content. Users are solely responsible for their posts and the consequences thereof.
          </Text>
        </View>

        {/* User Accounts */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">3. User Accounts</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            To access certain features of the Service, you must create an account. You agree to:
          </Text>
          <View className="ml-4 mb-3">
            <Text className="text-text-secondary text-sm leading-6">
              • Provide accurate, current, and complete information
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Maintain and update your account information
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Keep your login credentials secure and confidential
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Accept responsibility for all activities under your account
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Notify us immediately of any unauthorized use
            </Text>
          </View>
        </View>

        {/* User-Generated Content - Critical Liability Protection */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">
            4. User-Generated Content and Platform Liability
          </Text>

          <Text className="text-text-primary text-base font-medium mb-2">
            4.1 Content Responsibility - Anonymous Reviews
          </Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            <Text className="font-semibold">
              YOU ACKNOWLEDGE AND AGREE THAT THE COMPANY IS NOT RESPONSIBLE FOR ANY ANONYMOUS CONTENT POSTED BY USERS.
            </Text>{" "}
            All anonymous reviews, ratings, comments, messages, and other content ("User Content") are created and
            posted solely by anonymous users. The Company does not and cannot verify the identity of anonymous posters,
            does not endorse, support, represent, or guarantee the completeness, truthfulness, accuracy, or reliability
            of any User Content. Anonymous reviews may be false, defamatory, or misleading.
          </Text>

          <Text className="text-text-primary text-base font-medium mb-2">
            4.2 Section 230 Protection and No Editorial Control
          </Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            The Company operates as an interactive computer service provider under Section 230 of the Communications
            Decency Act. We act as a passive conduit for anonymous User Content and do not exercise editorial control
            over such content. We do not pre-screen, monitor, or approve User Content before it is posted. The Company
            is not the publisher or speaker of any User Content and maintains immunity from liability for third-party
            content under federal law. Any opinions, advice, statements, or other information expressed in User Content
            are those of the anonymous users and not of the Company.
          </Text>

          <Text className="text-text-primary text-base font-medium mb-2">4.3 Content Disclaimer</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            <Text className="font-semibold">THE COMPANY EXPRESSLY DISCLAIMS ALL LIABILITY FOR USER CONTENT.</Text> You
            understand that by using the Service, you may be exposed to content that is offensive, indecent, inaccurate,
            misleading, or otherwise objectionable. You agree that the Company shall not be liable for any damages
            arising from such exposure.
          </Text>

          <Text className="text-text-primary text-base font-medium mb-2">4.4 User Content License</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            By posting User Content, you grant the Company a worldwide, non-exclusive, royalty-free, sublicensable, and
            transferable license to use, reproduce, distribute, prepare derivative works of, display, and perform the
            User Content in connection with the Service.
          </Text>
        </View>

        {/* Prohibited Activities */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">5. Prohibited Activities</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            You agree not to engage in any of the following prohibited activities:
          </Text>
          <View className="ml-4 mb-3">
            <Text className="text-text-secondary text-sm leading-6">
              • Posting false, misleading, or defamatory content
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Harassing, threatening, or intimidating other users
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Posting content that violates intellectual property rights
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Sharing personal information of others without consent
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Attempting to gain unauthorized access to the Service
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Using automated systems to access or interact with the Service
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Posting spam, advertisements, or promotional content
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Engaging in illegal activities or encouraging others to do so
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Impersonating others or creating fake accounts
            </Text>
          </View>
        </View>

        {/* Content Moderation */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">6. Content Moderation and Enforcement</Text>

          <Text className="text-text-primary text-base font-medium mb-2">6.1 Moderation Rights</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            While we have no obligation to monitor User Content, we reserve the right (but not the obligation) to
            review, modify, or remove any User Content at our sole discretion, without notice, for any reason or no
            reason.
          </Text>

          <Text className="text-text-primary text-base font-medium mb-2">6.2 Reporting System</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            Users may report content that violates these Terms. We will attempt to review reports in a timely manner and
            investigate in good faith, but make no guarantee regarding specific response time or action taken. Due to
            the anonymous nature of our platform, we may have limited ability to verify claims or identify violators.
            Report processing times may vary based on volume and severity.
          </Text>

          <Text className="text-text-primary text-base font-medium mb-2">6.3 Account Suspension and Termination</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            We may suspend or terminate your account at any time, with or without cause, with or without notice. Upon
            termination, your right to use the Service ceases immediately.
          </Text>
        </View>

        {/* DMCA Compliance */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">7. DMCA Compliance and Copyright Policy</Text>

          <Text className="text-text-primary text-base font-medium mb-2">7.1 DMCA Safe Harbor</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            We comply with the Digital Millennium Copyright Act (DMCA) and maintain safe harbor protections. If you
            believe content infringes your copyright, submit a DMCA notice to our designated agent at
            contact@lockerroomapp.com with:
          </Text>
          <View className="ml-4 mb-3">
            <Text className="text-text-secondary text-sm leading-6">• Identification of the copyrighted work</Text>
            <Text className="text-text-secondary text-sm leading-6">• Identification of the infringing material</Text>
            <Text className="text-text-secondary text-sm leading-6">• Your contact information</Text>
            <Text className="text-text-secondary text-sm leading-6">• A statement of good faith belief</Text>
            <Text className="text-text-secondary text-sm leading-6">
              • A statement of accuracy under penalty of perjury
            </Text>
            <Text className="text-text-secondary text-sm leading-6">• Your physical or electronic signature</Text>
          </View>

          <Text className="text-text-primary text-base font-medium mb-2">7.2 Repeat Infringer Policy</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            We maintain a policy for terminating repeat copyright infringers. Users who repeatedly violate copyright
            laws will have their accounts permanently terminated.
          </Text>

          <Text className="text-text-primary text-base font-medium mb-2">7.3 Counter-Notice Procedure</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            If your content was removed due to a DMCA notice and you believe it was wrongfully removed, you may submit a
            counter-notice including the required legal statements to contact@lockerroomapp.com.
          </Text>
        </View>

        {/* Intellectual Property */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">8. Intellectual Property Rights</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            The Service and its original content, features, and functionality are owned by the Company and are protected
            by international copyright, trademark, patent, trade secret, and other intellectual property laws.
          </Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            You may not reproduce, distribute, modify, create derivative works of, publicly display, publicly perform,
            republish, download, store, or transmit any of the material on our Service without our prior written
            consent.
          </Text>
        </View>

        {/* Anonymous Reviews Disclaimer */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">
            9. Anonymous Reviews and Content Disclaimer
          </Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            <Text className="font-semibold">CRITICAL DISCLAIMER REGARDING ANONYMOUS REVIEWS:</Text>
          </Text>
          <View className="ml-4 mb-3">
            <Text className="text-text-secondary text-sm leading-6">
              • All reviews on this platform are posted anonymously
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • We cannot and do not verify the identity of reviewers
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • We cannot verify the accuracy or truthfulness of any review
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Reviews may be false, misleading, or defamatory
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Reviews may be posted by competitors, disgruntled individuals, or bad actors
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • You should not rely solely on anonymous reviews for decision-making
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • The Company is not liable for any damages resulting from anonymous reviews
            </Text>
          </View>
        </View>

        {/* Location-Based Services Disclaimer */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">10. Location-Based Services Disclaimer</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            <Text className="font-semibold">LOCATION DATA ACCURACY DISCLAIMER:</Text> Location-based features rely on
            third-party data sources and GPS technology. We do not guarantee the accuracy, completeness, or reliability
            of location information. You acknowledge that:
          </Text>
          <View className="ml-4 mb-3">
            <Text className="text-text-secondary text-sm leading-6">• Location data may be inaccurate or outdated</Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Business information may change without notice
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • We are not responsible for navigation errors or misdirection
            </Text>
            <Text className="text-text-secondary text-sm leading-6">
              • You should verify location information independently
            </Text>
          </View>
        </View>

        {/* Subscription and Payment Terms */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">11. Subscription and Payment Terms</Text>

          <Text className="text-text-primary text-base font-medium mb-2">9.1 Premium Subscriptions</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            We offer premium subscription services with enhanced features. Subscription fees are charged in advance and
            are non-refundable except as required by law.
          </Text>

          <Text className="text-text-primary text-base font-medium mb-2">9.2 Auto-Renewal</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period.
            You can manage subscriptions through your device's app store settings.
          </Text>

          <Text className="text-text-primary text-base font-medium mb-2">9.3 Third-Party Payment Processing</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            Payments are processed by third-party services (Apple App Store, Google Play Store, RevenueCat). We are not
            responsible for payment processing errors or disputes.
          </Text>
        </View>

        {/* Third-Party Services and Advertising */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">12. Third-Party Services and Advertising</Text>

          <Text className="text-text-primary text-base font-medium mb-2">10.1 Third-Party Content</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            The Service may contain links to third-party websites, services, or advertisements. We do not endorse or
            assume responsibility for third-party content, products, or services.
          </Text>

          <Text className="text-text-primary text-base font-medium mb-2">10.2 Advertising Disclaimer</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            <Text className="font-semibold">WE ARE NOT RESPONSIBLE FOR ADVERTISING CONTENT.</Text> Advertisements
            displayed in the Service are provided by third parties. We do not endorse advertised products or services
            and are not liable for any damages arising from your interaction with advertisements.
          </Text>
        </View>

        {/* Disclaimers and Limitation of Liability */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">
            13. Disclaimers and Limitation of Liability
          </Text>

          <Text className="text-text-primary text-base font-medium mb-2">11.1 Service Availability</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            <Text className="font-semibold">THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE."</Text> We do not
            guarantee that the Service will be uninterrupted, secure, or error-free. We may modify, suspend, or
            discontinue the Service at any time without notice.
          </Text>

          <Text className="text-text-primary text-base font-medium mb-2">11.2 Disclaimer of Warranties</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            <Text className="font-semibold">WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED,</Text> including but not
            limited to warranties of merchantability, fitness for a particular purpose, and non-infringement. We make no
            warranties about the accuracy, reliability, completeness, or timeliness of the Service or User Content.
          </Text>

          <Text className="text-text-primary text-base font-medium mb-2">11.3 Limitation of Liability</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            <Text className="font-semibold">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE COMPANY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
            </Text>{" "}
            including but not limited to loss of profits, data, use, goodwill, or other intangible losses, resulting
            from your use of the Service.
          </Text>

          <Text className="text-text-primary text-base font-medium mb-2">11.4 Maximum Liability Cap</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            In no event shall the Company's total liability to you exceed the amount you paid to us in the twelve (12)
            months preceding the claim, or $100, whichever is greater.
          </Text>
        </View>

        {/* Indemnification */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">14. Indemnification</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            <Text className="font-semibold">You agree to indemnify, defend, and hold harmless the Company</Text> and its
            officers, directors, employees, agents, and affiliates from and against any claims, liabilities, damages,
            losses, costs, expenses, or fees (including reasonable attorneys' fees) arising from:
          </Text>
          <View className="ml-4 mb-3">
            <Text className="text-text-secondary text-sm leading-6">• Your use of the Service</Text>
            <Text className="text-text-secondary text-sm leading-6">• Your violation of these Terms</Text>
            <Text className="text-text-secondary text-sm leading-6">• Your User Content</Text>
            <Text className="text-text-secondary text-sm leading-6">
              • Your violation of any rights of another party
            </Text>
          </View>
        </View>

        {/* Force Majeure */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">15. Force Majeure</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            We shall not be liable for any failure or delay in performance under these Terms due to circumstances beyond
            our reasonable control, including but not limited to acts of God, natural disasters, war, terrorism, labor
            disputes, or government actions.
          </Text>
        </View>

        {/* Dispute Resolution */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">16. Dispute Resolution and Governing Law</Text>

          <Text className="text-text-primary text-base font-medium mb-2">14.1 Governing Law</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, without
            regard to its conflict of law provisions.
          </Text>

          <Text className="text-text-primary text-base font-medium mb-2">14.2 Arbitration Agreement</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            Any dispute arising out of or relating to these Terms or the Service shall be resolved through binding
            arbitration in accordance with the Commercial Arbitration Rules of the American Arbitration Association. The
            arbitration shall take place in Delaware.
          </Text>

          <Text className="text-text-primary text-base font-medium mb-2">14.3 Class Action Waiver</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            <Text className="font-semibold">YOU WAIVE ANY RIGHT TO PARTICIPATE IN A CLASS ACTION LAWSUIT</Text> or
            class-wide arbitration against the Company.
          </Text>
        </View>

        {/* Severability */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">17. Severability</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions shall
            remain in full force and effect.
          </Text>
        </View>

        {/* Changes to Terms */}
        <View className="mb-6">
          <Text className="text-text-primary text-lg font-semibold mb-3">18. Changes to Terms</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            We reserve the right to modify these Terms at any time. We will notify users of material changes by posting
            the updated Terms in the app and updating the "Last Updated" date. Your continued use of the Service after
            such changes constitutes acceptance of the updated Terms.
          </Text>
        </View>

        {/* Contact Information */}
        <View className="mb-8">
          <Text className="text-text-primary text-lg font-semibold mb-3">19. Contact Information</Text>
          <Text className="text-text-secondary text-sm leading-6 mb-3">
            If you have any questions about these Terms, please contact us:
          </Text>
          <View className="bg-surface-800 rounded-lg p-4">
            <Text className="text-text-primary font-medium mb-2">Legal Department</Text>
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
