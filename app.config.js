// Dynamic Expo configuration with environment variable support
// This replaces app.json to enable secure handling of google-services.json via EAS secrets

// Enhanced build environment detection for AdMob compatibility
const isExpoGo = process.env.EXPO_PUBLIC_PLATFORM === 'expo-go' || !process.env.EAS_BUILD;
const isDevelopmentBuild = process.env.EAS_BUILD && process.env.EAS_BUILD_PROFILE !== 'production';
const isProduction = process.env.EAS_BUILD_PROFILE === 'production';

console.log('Build Environment:', {
  isExpoGo,
  isDevelopmentBuild,
  isProduction,
  buildProfile: process.env.EAS_BUILD_PROFILE,
  platform: process.env.EXPO_PUBLIC_PLATFORM
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
      backgroundColor: "#000000"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      icon: "./assets/LockerRoomLogo.png",
      bundleIdentifier: "com.lockerroom.app",
      buildNumber: "1",
      googleMobileAdsAppId: "ca-app-pub-9512493666273460~7181904608",
      infoPlist: {
        NSUserTrackingUsageDescription: "This identifier will be used to deliver personalized ads to you and improve your app experience.",
        NSLocationWhenInUseUsageDescription: "This app uses location to show nearby reviews and content.",
        NSCameraUsageDescription: "This app uses the camera to take photos for reviews and share images in chat.",
        NSPhotoLibraryUsageDescription: "This app accesses your photo library to select images for reviews and chat messages.",
        NSMicrophoneUsageDescription: "This app uses the microphone to record voice messages in chat.",
        CFBundleURLTypes: [
          {
            CFBundleURLName: "com.lockerroom.app",
            CFBundleURLSchemes: ["locker-room-talk"]
          }
        ],
        ITSAppUsesNonExemptEncryption: false
      },
      requireFullScreen: false,
      userInterfaceStyle: "automatic",
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
            NSPrivacyAccessedAPITypeReasons: ["CA92.1"]
          },
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp",
            NSPrivacyAccessedAPITypeReasons: ["C617.1"]
          },
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategorySystemBootTime",
            NSPrivacyAccessedAPITypeReasons: ["35F9.1"]
          },
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryDiskSpace",
            NSPrivacyAccessedAPITypeReasons: ["E174.1"]
          }
        ]
      }
    },
    android: {
      edgeToEdgeEnabled: true,
      icon: "./assets/LockerRoomLogo.png",
      adaptiveIcon: {
        foregroundImage: "./assets/LockerRoomLogo.png",
        backgroundColor: "#000000"
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
        "POST_NOTIFICATIONS"
      ],
      // Dynamic google-services.json handling via EAS secrets
      // Falls back to local file for development builds
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || "./google-services.json"
    },
    plugins: [
      "expo-asset",
      [
        "expo-audio",
        {
          microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone."
        }
      ],
      // Conditional Sentry plugin loading based on build environment
      ...(isExpoGo ? [] : [
        [
          "@sentry/react-native/expo",
          {
            organization: process.env.SENTRY_ORG || "lockerroom",
            project: process.env.SENTRY_PROJECT || "lockerroom-app",
            authToken: process.env.SENTRY_AUTH_TOKEN,
            url: "https://sentry.io/",
            note: "Use 'eas secret:create' to set SENTRY_AUTH_TOKEN for automated uploads"
          }
        ]
      ]),
      [
        "expo-build-properties",
        {
          android: {
            hermesEnabled: true,
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            buildToolsVersion: "35.0.0",
            proguardMinifyEnabled: true
          },
          ios: {
            deploymentTarget: "15.1"
          }
        }
      ],
      "expo-document-picker",
      "expo-font",
      "expo-image-picker",
      "expo-mail-composer",
      "expo-media-library",
      "expo-notifications",
      "expo-secure-store",
      "expo-sqlite",
      "expo-video",
      "expo-web-browser",
      // Conditional AdMob plugin loading based on build environment
      ...(isExpoGo ? [] : [
        [
          "react-native-google-mobile-ads",
          {
            androidAppId: "ca-app-pub-9512493666273460~4548589138",
            iosAppId: "ca-app-pub-9512493666273460~7181904608",
            userTrackingUsageDescription: "This identifier will be used to deliver personalized ads to you and improve your app experience.",
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
              "3qcr597p9d.skadnetwork"
            ]
          }
        ]
      ])
    ],
    extra: {
      eas: {
        projectId: "09080198-d670-488c-b937-23c984364f28"
      },
      // Enhanced build environment information for runtime detection
      buildEnvironment: {
        isExpoGo,
        isDevelopmentBuild,
        isProduction,
        buildProfile: process.env.EAS_BUILD_PROFILE || 'development',
        platform: process.env.EXPO_PUBLIC_PLATFORM || 'unknown'
      },
      // Sentry configuration
      sentry: {
        dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
        environment: isProduction ? 'production' : isDevelopmentBuild ? 'staging' : 'development',
        enableInExpoDevelopment: false,
        enableAutoSessionTracking: true,
        enableNativeCrashHandling: true,
        enablePerformanceMonitoring: !isExpoGo,
        tracesSampleRate: isProduction ? 0.1 : 0.2,
        sampleRate: isProduction ? 0.1 : 1.0,
      }
    },
    owner: "trappat"
  }
};
