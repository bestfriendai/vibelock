import { Platform, Alert, Linking } from "react-native";
import * as Notifications from "expo-notifications";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";

export interface PermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
}

export interface PermissionValidationResult {
  allGranted: boolean;
  missingPermissions: string[];
  results: Record<string, PermissionStatus>;
  criticalMissing: string[];
}

class PermissionValidationService {
  /**
   * Validate all critical app permissions
   */
  async validateAllPermissions(): Promise<PermissionValidationResult> {
    const results: Record<string, PermissionStatus> = {};
    const missingPermissions: string[] = [];
    const criticalMissing: string[] = [];

    // Camera permissions
    try {
      const cameraStatus = await ImagePicker.getCameraPermissionsAsync();
      results.camera = {
        granted: cameraStatus.granted,
        canAskAgain: cameraStatus.canAskAgain,
        status: cameraStatus.status,
      };
      if (!cameraStatus.granted) {
        missingPermissions.push("Camera");
        criticalMissing.push("Camera");
      }
    } catch (error) {
      results.camera = { granted: false, canAskAgain: false, status: "error" };
      missingPermissions.push("Camera");
      criticalMissing.push("Camera");
    }

    // Media Library permissions
    try {
      const mediaStatus = await ImagePicker.getMediaLibraryPermissionsAsync();
      results.mediaLibrary = {
        granted: mediaStatus.granted,
        canAskAgain: mediaStatus.canAskAgain,
        status: mediaStatus.status,
      };
      if (!mediaStatus.granted) {
        missingPermissions.push("Media Library");
        criticalMissing.push("Media Library");
      }
    } catch (error) {
      results.mediaLibrary = { granted: false, canAskAgain: false, status: "error" };
      missingPermissions.push("Media Library");
      criticalMissing.push("Media Library");
    }

    // Location permissions
    try {
      const locationStatus = await Location.getForegroundPermissionsAsync();
      results.location = {
        granted: locationStatus.granted,
        canAskAgain: locationStatus.canAskAgain,
        status: locationStatus.status,
      };
      if (!locationStatus.granted) {
        missingPermissions.push("Location");
        // Location is not critical for core app functionality
      }
    } catch (error) {
      results.location = { granted: false, canAskAgain: false, status: "error" };
      missingPermissions.push("Location");
    }

    // Notification permissions
    try {
      const notificationStatus = await Notifications.getPermissionsAsync();
      results.notifications = {
        granted: notificationStatus.granted,
        canAskAgain: notificationStatus.canAskAgain,
        status: notificationStatus.status,
      };
      if (!notificationStatus.granted) {
        missingPermissions.push("Notifications");
        // Notifications are not critical for core app functionality
      }
    } catch (error) {
      results.notifications = { granted: false, canAskAgain: false, status: "error" };
      missingPermissions.push("Notifications");
    }

    return {
      allGranted: missingPermissions.length === 0,
      missingPermissions,
      results,
      criticalMissing,
    };
  }

  /**
   * Request all missing permissions with user-friendly explanations
   */
  async requestMissingPermissions(validationResult: PermissionValidationResult): Promise<PermissionValidationResult> {
    if (validationResult.allGranted) {
      return validationResult;
    }

    const { results } = validationResult;

    // Request camera permission if missing
    if (!results.camera?.granted && results.camera?.canAskAgain) {
      try {
        await this.explainPermission("Camera", "to take photos for reviews and share images in chat");
        const newStatus = await ImagePicker.requestCameraPermissionsAsync();
        results.camera = {
          granted: newStatus.granted,
          canAskAgain: newStatus.canAskAgain,
          status: newStatus.status,
        };
      } catch (error) {}
    }

    // Request media library permission if missing
    if (!results.mediaLibrary?.granted && results.mediaLibrary?.canAskAgain) {
      try {
        await this.explainPermission("Media Library", "to select photos and videos from your library");
        const newStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
        results.mediaLibrary = {
          granted: newStatus.granted,
          canAskAgain: newStatus.canAskAgain,
          status: newStatus.status,
        };
      } catch (error) {}
    }

    // Request location permission if missing
    if (!results.location?.granted && results.location?.canAskAgain) {
      try {
        await this.explainPermission("Location", "to show nearby reviews and location-based content");
        const newStatus = await Location.requestForegroundPermissionsAsync();
        results.location = {
          granted: newStatus.granted,
          canAskAgain: newStatus.canAskAgain,
          status: newStatus.status,
        };
      } catch (error) {}
    }

    // Request notification permission if missing
    if (!results.notifications?.granted && results.notifications?.canAskAgain) {
      try {
        await this.explainPermission("Notifications", "to keep you updated with new messages and activity");
        const newStatus = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        results.notifications = {
          granted: newStatus.granted,
          canAskAgain: newStatus.canAskAgain,
          status: newStatus.status,
        };
      } catch (error) {}
    }

    // Recalculate validation result
    return await this.validateAllPermissions();
  }

  /**
   * Explain why a permission is needed before requesting it
   */
  private async explainPermission(permissionName: string, reason: string): Promise<void> {
    return new Promise((resolve) => {
      Alert.alert(
        `${permissionName} Permission`,
        `Locker Room Talk needs access to your ${permissionName.toLowerCase()} ${reason}. You can change this later in Settings.`,
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => resolve(),
          },
          {
            text: "Continue",
            onPress: () => resolve(),
          },
        ],
      );
    });
  }

  /**
   * Show settings redirect dialog for permanently denied permissions
   */
  showSettingsDialog(missingPermissions: string[]): void {
    if (missingPermissions.length === 0) return;

    const permissionList = missingPermissions.join(", ");
    const message = `To use all features of Locker Room Talk, please enable the following permissions in Settings:\n\n• ${missingPermissions.join("\n• ")}\n\nYou can change these in your device settings.`;

    Alert.alert("Permissions Required", message, [
      {
        text: "Not Now",
        style: "cancel",
      },
      {
        text: "Open Settings",
        onPress: () => {
          if (Linking.openSettings) {
            Linking.openSettings();
          } else {
          }
        },
      },
    ]);
  }

  /**
   * Check if app has critical permissions for core functionality
   */
  async hasCriticalPermissions(): Promise<boolean> {
    const validation = await this.validateAllPermissions();
    return validation.criticalMissing.length === 0;
  }

  /**
   * Get permission status summary for UI display
   */
  async getPermissionSummary(): Promise<{
    status: "all_granted" | "partial" | "critical_missing";
    message: string;
    details: PermissionValidationResult;
  }> {
    const validation = await this.validateAllPermissions();

    if (validation.allGranted) {
      return {
        status: "all_granted",
        message: "All permissions granted",
        details: validation,
      };
    }

    if (validation.criticalMissing.length > 0) {
      return {
        status: "critical_missing",
        message: `Critical permissions missing: ${validation.criticalMissing.join(", ")}`,
        details: validation,
      };
    }

    return {
      status: "partial",
      message: `Some optional permissions missing: ${validation.missingPermissions.join(", ")}`,
      details: validation,
    };
  }

  /**
   * Initialize permission monitoring (call during app startup)
   */
  async initializePermissionMonitoring(): Promise<void> {
    try {
      const summary = await this.getPermissionSummary();

      if (summary.status === "critical_missing") {
        // Attempt to request critical permissions
        const updatedResult = await this.requestMissingPermissions(summary.details);

        if (updatedResult.criticalMissing.length > 0) {
          // Still missing critical permissions, show settings dialog
          setTimeout(() => {
            this.showSettingsDialog(updatedResult.criticalMissing);
          }, 2000); // Delay to avoid overwhelming user at startup
        }
      } else if (summary.status === "partial") {
      } else {
      }
    } catch (error) {}
  }
}

export const permissionValidationService = new PermissionValidationService();
export default permissionValidationService;
