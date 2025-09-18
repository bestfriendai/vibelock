import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometricType?: string;
}

class BiometricService {
  private isAvailable: boolean | null = null;
  private supportedTypes: LocalAuthentication.AuthenticationType[] = [];

  /**
   * Initialize biometric service and check availability
   */
  async initialize(): Promise<void> {
    try {
      // Check if biometric authentication is available on the device
      this.isAvailable = await LocalAuthentication.hasHardwareAsync();

      if (this.isAvailable) {
        // Check if biometrics are enrolled
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!isEnrolled) {
          this.isAvailable = false;
          console.log("Biometric hardware available but no biometrics enrolled");
          return;
        }

        // Get supported authentication types
        this.supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
        console.log("Biometric authentication available:", this.supportedTypes);
      } else {
        console.log("Biometric authentication not available on this device");
      }
    } catch (error) {
      console.warn("Failed to initialize biometric service:", error);
      this.isAvailable = false;
    }
  }

  /**
   * Check if biometric authentication is available
   */
  isSupported(): boolean {
    return this.isAvailable === true;
  }

  /**
   * Get supported biometric types
   */
  getSupportedTypes(): LocalAuthentication.AuthenticationType[] {
    return this.supportedTypes;
  }

  /**
   * Get human-readable biometric type name
   */
  getBiometricTypeName(): string {
    if (!this.isSupported()) return "None";

    if (this.supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return Platform.OS === "ios" ? "Face ID" : "Face Recognition";
    }

    if (this.supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return Platform.OS === "ios" ? "Touch ID" : "Fingerprint";
    }

    if (this.supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return "Iris Recognition";
    }

    return "Biometric";
  }

  /**
   * Authenticate user with biometrics
   */
  async authenticate(
    promptMessage: string = "Authenticate to continue",
    subtitle?: string,
  ): Promise<BiometricAuthResult> {
    if (!this.isSupported()) {
      return {
        success: false,
        error: "Biometric authentication not available",
      };
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: "Cancel",
        fallbackLabel: "Use Passcode",
        disableDeviceFallback: false, // Allow device passcode as fallback
      });

      if (result.success) {
        return {
          success: true,
          biometricType: this.getBiometricTypeName(),
        };
      } else {
        let errorMessage = "Authentication failed";

        if (result.error === "unknown") {
          errorMessage = "An unknown error occurred";
        } else if (result.error === "user_cancel") {
          errorMessage = "Authentication was cancelled";
        } else if (result.error === "user_fallback") {
          errorMessage = "User chose to use device passcode";
        } else if (result.error === "system_cancel") {
          errorMessage = "Authentication was cancelled by the system";
        } else if (result.error === "authentication_failed") {
          errorMessage = "Authentication failed after multiple attempts";
        } else if (result.error === "not_available") {
          errorMessage = "Biometric authentication is not available";
        } else if (result.error === "not_enrolled") {
          errorMessage = "No biometrics enrolled on this device";
        }

        return {
          success: false,
          error: errorMessage,
        };
      }
    } catch (error) {
      console.warn("Biometric authentication error:", error);
      return {
        success: false,
        error: "Authentication system error",
      };
    }
  }

  /**
   * Quick authentication for sensitive actions
   */
  async quickAuth(action: string): Promise<boolean> {
    const result = await this.authenticate(
      `Use ${this.getBiometricTypeName()} to ${action}`,
      "This action requires authentication",
    );
    return result.success;
  }

  /**
   * Check if device has biometric capability (even if not enrolled)
   */
  async hasHardware(): Promise<boolean> {
    try {
      return await LocalAuthentication.hasHardwareAsync();
    } catch {
      return false;
    }
  }

  /**
   * Check if user has enrolled biometrics
   */
  async isEnrolled(): Promise<boolean> {
    try {
      return await LocalAuthentication.isEnrolledAsync();
    } catch {
      return false;
    }
  }
}

export const biometricService = new BiometricService();
export default biometricService;
