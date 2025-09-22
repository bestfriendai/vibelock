/**
 * Upload functionality test utility
 * Use this to test image/video upload functionality in development
 */

import * as ImagePicker from "expo-image-picker";
import { storageService } from "../services/storageService";
import { Alert } from "react-native";

export interface UploadTestResult {
  success: boolean;
  message: string;
  error?: any;
  uploadUrl?: string;
}

/**
 * Test image picker permissions
 */
export const testPermissions = async (): Promise<UploadTestResult> => {
  try {
    // Test camera permissions
    const cameraStatus = await ImagePicker.getCameraPermissionsAsync();
    // Test media library permissions
    const libraryStatus = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!cameraStatus.granted) {
      const cameraRequest = await ImagePicker.requestCameraPermissionsAsync();
    }

    if (!libraryStatus.granted) {
      const libraryRequest = await ImagePicker.requestMediaLibraryPermissionsAsync();
    }

    return {
      success: true,
      message: `Permissions - Camera: ${cameraStatus.granted ? "✅" : "❌"}, Library: ${libraryStatus.granted ? "✅" : "❌"}`,
    };
  } catch (error) {
    return {
      success: false,
      message: "Permission test failed",
      error,
    };
  }
};

/**
 * Test image picker functionality
 */
export const testImagePicker = async (): Promise<UploadTestResult> => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled) {
      return {
        success: false,
        message: "Image picker was canceled",
      };
    }

    if (!result.assets || result.assets.length === 0) {
      return {
        success: false,
        message: "No image selected",
      };
    }

    const asset = result.assets[0];

    if (!asset || !asset.uri) {
      return {
        success: false,
        message: "Invalid asset selected",
      };
    }

    return {
      success: true,
      message: `Image selected successfully: ${asset.width || "unknown"}x${asset.height || "unknown"}, ${Math.round((asset.fileSize || 0) / 1024)}KB`,
    };
  } catch (error) {
    return {
      success: false,
      message: "Image picker test failed",
      error,
    };
  }
};

/**
 * Test upload functionality with a selected image
 */
export const testUpload = async (): Promise<UploadTestResult> => {
  try {
    // First select an image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return {
        success: false,
        message: "No image selected for upload test",
      };
    }

    const asset = result.assets[0];

    if (!asset || !asset.uri) {
      return {
        success: false,
        message: "Invalid asset selected for upload test",
      };
    }

    // Test upload
    const uploadResult = await storageService.uploadFile(asset.uri, {
      bucket: "review-images",
      fileName: `test-upload-${Date.now()}.jpg`,
      contentType: asset.mimeType || "image/jpeg",
    });

    if (uploadResult.success && uploadResult.url) {
      return {
        success: true,
        message: `Upload successful! URL: ${uploadResult.url}`,
        uploadUrl: uploadResult.url,
      };
    } else {
      return {
        success: false,
        message: `Upload failed: ${uploadResult.error || "Unknown error"}`,
        error: uploadResult.error,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: "Upload test failed",
      error,
    };
  }
};

/**
 * Run all upload tests
 */
export const runUploadTests = async (): Promise<void> => {
  const permissionResult = await testPermissions();
  if (!permissionResult.success) {
    Alert.alert("Test Failed", "Permission test failed. Please check permissions.");
    return;
  }

  const pickerResult = await testImagePicker();
  if (!pickerResult.success) {
    Alert.alert("Test Failed", "Image picker test failed.");
    return;
  }

  const uploadResult = await testUpload();
  if (uploadResult.success) {
    Alert.alert("Tests Passed! ✅", "All upload functionality tests passed successfully.");
  } else {
    Alert.alert("Upload Test Failed", uploadResult.message);
  }
};
