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
    console.log("🧪 Testing permissions...");

    // Test camera permissions
    const cameraStatus = await ImagePicker.getCameraPermissionsAsync();
    console.log("📷 Camera permission:", cameraStatus);

    // Test media library permissions
    const libraryStatus = await ImagePicker.getMediaLibraryPermissionsAsync();
    console.log("📚 Library permission:", libraryStatus);

    if (!cameraStatus.granted) {
      const cameraRequest = await ImagePicker.requestCameraPermissionsAsync();
      console.log("📷 Camera permission request result:", cameraRequest);
    }

    if (!libraryStatus.granted) {
      const libraryRequest = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log("📚 Library permission request result:", libraryRequest);
    }

    return {
      success: true,
      message: `Permissions - Camera: ${cameraStatus.granted ? "✅" : "❌"}, Library: ${libraryStatus.granted ? "✅" : "❌"}`,
    };
  } catch (error) {
    console.warn("❌ Permission test failed:", error);
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
    console.log("🧪 Testing image picker...");

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

    console.log("📸 Selected image:", {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      fileSize: asset.fileSize,
      mimeType: asset.mimeType,
    });

    return {
      success: true,
      message: `Image selected successfully: ${asset.width || 'unknown'}x${asset.height || 'unknown'}, ${Math.round((asset.fileSize || 0) / 1024)}KB`,
    };
  } catch (error) {
    console.warn("❌ Image picker test failed:", error);
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
    console.log("🧪 Testing upload functionality...");

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

    console.log("📸 Testing upload with image:", asset.uri);

    // Test upload
    const uploadResult = await storageService.uploadFile(asset.uri, {
      bucket: "review-images",
      fileName: `test-upload-${Date.now()}.jpg`,
      contentType: asset.mimeType || "image/jpeg",
    });

    console.log("📤 Upload result:", uploadResult);

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
    console.warn("❌ Upload test failed:", error);
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
  console.log("🚀 Starting upload functionality tests...");

  const permissionResult = await testPermissions();
  console.log("1️⃣ Permission test:", permissionResult.message);

  if (!permissionResult.success) {
    Alert.alert("Test Failed", "Permission test failed. Please check permissions.");
    return;
  }

  const pickerResult = await testImagePicker();
  console.log("2️⃣ Image picker test:", pickerResult.message);

  if (!pickerResult.success) {
    Alert.alert("Test Failed", "Image picker test failed.");
    return;
  }

  const uploadResult = await testUpload();
  console.log("3️⃣ Upload test:", uploadResult.message);

  if (uploadResult.success) {
    Alert.alert("Tests Passed! ✅", "All upload functionality tests passed successfully.");
  } else {
    Alert.alert("Upload Test Failed", uploadResult.message);
  }

  console.log("🏁 Upload tests completed");
};
