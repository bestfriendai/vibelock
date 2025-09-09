import React, { useState } from "react";
import { Modal } from "react-native";
import { PrivacyPolicy } from "./PrivacyPolicy";
import { TermsOfService } from "./TermsOfService";

interface LegalModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: "privacy" | "terms";
}

export const LegalModal: React.FC<LegalModalProps> = ({ visible, onClose, initialTab = "privacy" }) => {
  const [activeTab, setActiveTab] = useState<"privacy" | "terms">(initialTab);

  const handleNavigateToTerms = () => {
    setActiveTab("terms");
  };

  const handleNavigateToPrivacy = () => {
    setActiveTab("privacy");
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      {activeTab === "privacy" ? (
        <PrivacyPolicy onClose={onClose} showNavigation={true} onNavigateToTerms={handleNavigateToTerms} />
      ) : (
        <TermsOfService onClose={onClose} showNavigation={true} onNavigateToPrivacy={handleNavigateToPrivacy} />
      )}
    </Modal>
  );
};
