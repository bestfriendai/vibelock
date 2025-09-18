import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { canUseAdMob } from "../utils/buildEnvironment";

// GDPR Consent Management Service
class GDPRConsentService {
  private static readonly CONSENT_KEY = "gdpr_consent_status";
  private static readonly CONSENT_VERSION = "1.0";
  private consentStatus: "unknown" | "required" | "not_required" | "obtained" | "denied" = "unknown";

  /**
   * Initialize GDPR consent checking
   */
  async initialize(): Promise<void> {
    try {
      // Load stored consent status
      const stored = await AsyncStorage.getItem(GDPRConsentService.CONSENT_KEY);
      if (stored) {
        const { status, version } = JSON.parse(stored);
        if (version === GDPRConsentService.CONSENT_VERSION) {
          this.consentStatus = status;
        }
      }

      // Check if user is in EU/EEA and needs consent
      await this.checkConsentRequirement();
    } catch (error) {
      console.warn("Failed to initialize GDPR consent service:", error);
      this.consentStatus = "unknown";
    }
  }

  /**
   * Check if GDPR consent is required based on user location
   */
  private async checkConsentRequirement(): Promise<void> {
    try {
      // Simple IP-based EU detection (in production, use a proper service)
      const response = await fetch("https://ipapi.co/json/");
      const data = await response.json();

      const euCountries = [
        "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
        "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
        "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO"
      ];

      if (euCountries.includes(data.country_code)) {
        if (this.consentStatus === "unknown") {
          this.consentStatus = "required";
        }
      } else {
        this.consentStatus = "not_required";
      }
    } catch (error) {
      console.warn("Failed to check GDPR requirement:", error);
      // Default to requiring consent for safety
      this.consentStatus = "required";
    }
  }

  /**
   * Show consent dialog and handle response
   */
  async requestConsent(): Promise<boolean> {
    if (!canUseAdMob() || this.consentStatus === "not_required") {
      return true;
    }

    try {
      // In a real implementation, you would use Google's User Messaging Platform
      // For now, we'll use a simple implementation

      // Check if Google UMP is available
      const { AdsConsent } = await import("react-native-google-mobile-ads");

      // Request consent information update
      const consentInfo = await AdsConsent.requestInfoUpdate({
        debugGeography: __DEV__ ? AdsConsent.DebugGeography.EEA : undefined,
        testDeviceIdentifiers: __DEV__ ? ["TEST_DEVICE_ID"] : undefined,
      });

      // Check if consent is required
      if (consentInfo.status === AdsConsent.ConsentStatus.REQUIRED) {
        // Load and show consent form
        const { isLoaded } = await AdsConsent.loadAndShowConsentFormIfRequired();

        if (isLoaded) {
          // Get updated consent status
          const updatedInfo = await AdsConsent.getConsentInfo();
          const hasConsent = updatedInfo.status === AdsConsent.ConsentStatus.OBTAINED;

          this.consentStatus = hasConsent ? "obtained" : "denied";
          await this.storeConsentStatus();

          return hasConsent;
        }
      } else if (consentInfo.status === AdsConsent.ConsentStatus.NOT_REQUIRED) {
        this.consentStatus = "not_required";
        await this.storeConsentStatus();
        return true;
      }

      return this.consentStatus === "obtained";
    } catch (error) {
      console.warn("GDPR consent request failed:", error);
      // Fallback: don't show ads if consent fails
      return false;
    }
  }

  /**
   * Store consent status
   */
  private async storeConsentStatus(): Promise<void> {
    try {
      const data = {
        status: this.consentStatus,
        version: GDPRConsentService.CONSENT_VERSION,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(GDPRConsentService.CONSENT_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn("Failed to store consent status:", error);
    }
  }

  /**
   * Check if ads can be shown (consent obtained or not required)
   */
  canShowAds(): boolean {
    return this.consentStatus === "obtained" || this.consentStatus === "not_required";
  }

  /**
   * Check if personalized ads can be shown
   */
  canShowPersonalizedAds(): boolean {
    return this.canShowAds() && this.consentStatus === "obtained";
  }

  /**
   * Reset consent status (for testing or privacy settings)
   */
  async resetConsent(): Promise<void> {
    try {
      await AsyncStorage.removeItem(GDPRConsentService.CONSENT_KEY);
      this.consentStatus = "unknown";
      await this.checkConsentRequirement();
    } catch (error) {
      console.warn("Failed to reset consent:", error);
    }
  }

  /**
   * Get current consent status
   */
  getConsentStatus(): string {
    return this.consentStatus;
  }
}

export const gdprConsentService = new GDPRConsentService();
export default gdprConsentService;