// Dynamic Expo configuration with environment variable support
// Note: Use EAS Secrets for sensitive environment variables:
// eas secret:create --name EXPO_PUBLIC_SENTRY_DSN --value "your-dsn-here"
// eas secret:create --name SENTRY_AUTH_TOKEN --value "your-token" (for source maps upload)

// This replaces app.json to enable secure handling of google-services.json via EAS secrets

// Enhanced build environment detection for AdMob compatibility
const isExpoGo = process.env.EXPO_PUBLIC_PLATFORM === "expo-go" || !process.env.EAS_BUILD;
const isDevelopmentBuild = process.env.EAS_BUILD && process.env.EAS_BUILD_PROFILE !== "production";
const isProduction = process.env.EAS_BUILD_PROFILE === "production";

console.log("Build Environment:", {
  isExpoGo,
  isDevelopmentBuild,
  isProduction,
  buildProfile: process.env.EAS_BUILD_PROFILE,
  platform: process.env.EXPO_PUBLIC_PLATFORM,
});

export default {
  expo: {
    name: "LockerRoom",
    slug: "locker-room-talk",
    scheme: "locker-room-talk",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    icon: "./assets/LockerRoomLogo.png",
    splash: {
      image: "./assets/splash-screen.png",
      resizeMode: "contain",
      backgroundColor: "#000000",
    },
    assetBundlePatterns: ["**/*"],

    updates: {
      fallbackToCacheTimeout: 0,
    },
    ios: {
      supportsTablet: true,
      icon: "./assets/LockerRoomLogo.png",
      bundleIdentifier: "com.lockerroom.app",
      buildNumber: "1",
      googleMobileAdsAppId: "ca-app-pub-9512493666273460~7181904608",
      infoPlist: {
        NSUserTrackingUsageDescription:
          "This identifier will be used to deliver personalized ads to you and improve your app experience.",
        NSLocationWhenInUseUsageDescription: "This app uses location to show nearby reviews and content.",
        // Uncomment if background location is needed in the future
        // NSLocationAlwaysAndWhenInUseUsageDescription: "This app uses location to provide location-based features even when not actively using the app.",
        NSCameraUsageDescription: "This app uses the camera to take photos for reviews and share images in chat.",
        NSPhotoLibraryUsageDescription:
          "This app accesses your photo library to select images for reviews and chat messages.",
        NSPhotoLibraryAddUsageDescription:
          "This app can save photos to your photo library when sharing or downloading content.",
        NSMicrophoneUsageDescription: "This app uses the microphone to record voice messages in chat.",
        NSVideoRecordingUsageDescription: "This app uses the camera to record videos for reviews and chat messages.",
        CFBundleURLTypes: [
          {
            CFBundleURLName: "com.lockerroom.app",
            CFBundleURLSchemes: ["locker-room-talk"],
          },
        ],
        ITSAppUsesNonExemptEncryption: false,
        // Background modes removed - no background processing implemented in codebase
      },
      requireFullScreen: false,
      userInterfaceStyle: "automatic",
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
            NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
          },
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp",
            NSPrivacyAccessedAPITypeReasons: ["C617.1"],
          },
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategorySystemBootTime",
            NSPrivacyAccessedAPITypeReasons: ["35F9.1"],
          },
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryDiskSpace",
            NSPrivacyAccessedAPITypeReasons: ["E174.1"],
          },
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryActiveKeyboards",
            NSPrivacyAccessedAPITypeReasons: ["54BD.1"],
          },
        ],
        NSPrivacyCollectedDataTypes: [
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeLocation",
            NSPrivacyCollectedDataTypeLinked: false,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
          },
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypePhotos",
            NSPrivacyCollectedDataTypeLinked: false,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
          },
        ],
      },
    },
    android: {
      edgeToEdgeEnabled: true,
      icon: "./assets/LockerRoomLogo.png",
      adaptiveIcon: {
        foregroundImage: "./assets/LockerRoomLogo.png",
        backgroundColor: "#000000",
      },
      package: "com.lockerroom.app",
      versionCode: 1,
      googleMobileAdsAppId: "ca-app-pub-9512493666273460~4548589138",
      permissions: [
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE",
        "WAKE_LOCK",
        "ACCESS_NETWORK_STATE",
        "INTERNET",
        "com.android.vending.BILLING",
        "CAMERA",
        "RECORD_AUDIO",
        "POST_NOTIFICATIONS",
        // Granular media permissions for Android 13+
        "READ_MEDIA_IMAGES",
        "READ_MEDIA_VIDEO",
        "READ_MEDIA_AUDIO",
        "READ_MEDIA_VISUAL_USER_SELECTED",
        // Legacy storage permissions for older Android versions
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
      ],
      // Dynamic google-services.json handling via EAS secrets
      // Falls back to local file for development builds
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
    },
    plugins: [
      "expo-asset",
      [
        "expo-audio",
        {
          microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone.",
        },
      ],
      // Conditional Sentry plugin loading based on build environment
      ...(isExpoGo
        ? []
        : [
            [
              "@sentry/react-native/expo",
              {
                organization: process.env.SENTRY_ORG || "lockerroom",
                project: process.env.SENTRY_PROJECT || "lockerroom-app",
                authToken: process.env.SENTRY_AUTH_TOKEN,
                url: "https://sentry.io/",
                note: "Use 'eas secret:create' to set SENTRY_AUTH_TOKEN for automated uploads",
              },
            ],
          ]),
      [
        "expo-build-properties",
        {
          android: {
            hermesEnabled: true,
            compileSdkVersion: 36,
            targetSdkVersion: 36,
            buildToolsVersion: "36.0.0",
            proguardMinifyEnabled: true,
          },
          ios: {
            deploymentTarget: "15.1",
          },
        },
      ],
      "expo-document-picker",
      "expo-font",
      "expo-image-picker",
      [
        "expo-local-authentication",
        {
          faceIDPermission: "Allow $(PRODUCT_NAME) to use Face ID for secure authentication.",
        },
      ],
      "expo-mail-composer",
      "expo-media-library",
      "expo-notifications",
      "expo-secure-store",
      "expo-sqlite",
      "expo-video",
      "expo-web-browser",
      // Conditional RevenueCat plugin loading based on build environment
      ...(isExpoGo
        ? []
        : [
            [
              "react-native-purchases",
              {
                // RevenueCat configuration for subscription management
                apiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY,
                // Enable debug logging in development
                enableDebugLogging: isDevelopmentBuild,
                // Enhanced configuration for better integration
                enableAmazonLogging: false,
                enableProxyMode: false,
                // Subscription management settings
                enablePendingPurchases: true,
                enableObserverMode: false,
              },
            ],
          ]),
      // Conditional AdMob plugin loading based on build environment
      ...(isExpoGo
        ? []
        : [
            [
              "react-native-google-mobile-ads",
              {
                androidAppId: "ca-app-pub-9512493666273460~4548589138",
                iosAppId: "ca-app-pub-9512493666273460~7181904608",
                userTrackingUsageDescription:
                  "This identifier will be used to deliver personalized ads to you and improve your app experience.",
                // Enhanced configuration for Expo SDK 54 compatibility
                delayAppMeasurementInit: true,
                optimizeInitialization: true,
                optimizeAdLoading: true,
                // SDK 54 compatibility flags
                enableDebugLogging: isDevelopmentBuild,
                requestNonPersonalizedAdsOnly: false,
                maxAdContentRating: "PG",
                tagForChildDirectedTreatment: false,
                tagForUnderAgeOfConsent: false,
                skAdNetworkItems: [
                  "cstr6suwn9.skadnetwork",
                  "4fzdc2evr5.skadnetwork",
                  "2fnua5tdw4.skadnetwork",
                  "ydx93a7ass.skadnetwork",
                  "5a6flpkh64.skadnetwork",
                  "p78axxw29g.skadnetwork",
                  "v72qych5uu.skadnetwork",
                  "ludvb6z3bs.skadnetwork",
                  "cp8zw746q7.skadnetwork",
                  "3sh42y64q3.skadnetwork",
                  "c6k4g5qg8m.skadnetwork",
                  "s39g8k73mm.skadnetwork",
                  "3qy4746246.skadnetwork",
                  "f38h382jlk.skadnetwork",
                  "hs6bdukanm.skadnetwork",
                  "v4nxqhlyqp.skadnetwork",
                  "wzmmz9fp6w.skadnetwork",
                  "yclnxrl5pm.skadnetwork",
                  "t38b2kh725.skadnetwork",
                  "7ug5zh24hu.skadnetwork",
                  "9rd848q2bz.skadnetwork",
                  "n6fk4nfna4.skadnetwork",
                  "kbd757ywx3.skadnetwork",
                  "9t245vhmpl.skadnetwork",
                  "a2p9lx4jpn.skadnetwork",
                  "22mmun2rn5.skadnetwork",
                  "4468km3ulz.skadnetwork",
                  "2u9pt9hc89.skadnetwork",
                  "8s468mfl3y.skadnetwork",
                  "klf5c3l5u5.skadnetwork",
                  "ppxm28t8ap.skadnetwork",
                  "424m5254lk.skadnetwork",
                  "uw77j35x4d.skadnetwork",
                  "578prtvx9j.skadnetwork",
                  "4dzt52r2t5.skadnetwork",
                  "e5fvkxwrpn.skadnetwork",
                  "8c4e2ghe7u.skadnetwork",
                  "zq492l623r.skadnetwork",
                  "3rd42ekr43.skadnetwork",
                  "3qcr597p9d.skadnetwork",
                ],
              },
            ],
          ]),
    ],
    extra: {
      eas: {
        projectId: "09080198-d670-488c-b937-23c984364f28",
      },
      // Enhanced build environment information for runtime detection
      buildEnvironment: {
        isExpoGo,
        isDevelopmentBuild,
        isProduction,
        buildProfile: process.env.EAS_BUILD_PROFILE || "development",
        platform: process.env.EXPO_PUBLIC_PLATFORM || "unknown",
      },
      // Sentry configuration
      sentry: {
        dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
        environment: isProduction ? "production" : isDevelopmentBuild ? "staging" : "development",
        enableInExpoDevelopment: false,
        enableAutoSessionTracking: true,
        enableNativeCrashHandling: true,
        enablePerformanceMonitoring: !isExpoGo,
        tracesSampleRate: isProduction ? 0.1 : 0.2,
        sampleRate: isProduction ? 0.1 : 1.0,
      },
    },
    owner: "trappat",
  },
};
