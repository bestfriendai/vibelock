// Firebase configuration for LockerRoom MVP
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth, connectAuthEmulator, getReactNativePersistence } from "firebase/auth";
import { initializeFirestore, getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Optional debug logging in development only (EXPO_PUBLIC_* are safe to log, but keep it dev-only)
if (__DEV__) {
  console.log("[Firebase Config] Project ID:", process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID);
}

// Validate configuration
const requiredKeys = [
  "EXPO_PUBLIC_FIREBASE_API_KEY",
  "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "EXPO_PUBLIC_FIREBASE_APP_ID",
] as const;

const missingKeys = requiredKeys.filter((key) => !process.env[key]);
if (missingKeys.length > 0) {
  console.error("Missing Firebase configuration keys:", missingKeys);
  throw new Error(`Missing Firebase configuration: ${missingKeys.join(", ")}`);
}

// Initialize Firebase app (singleton)
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Auth with React Native persistence
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  // Fallback if already initialized or in environments where initializeAuth isn't applicable
  auth = getAuth(app);
}

// Initialize Firestore with RN-friendly settings
const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  experimentalAutoDetectLongPolling: true,
  // useFetchStreams can cause issues in some RN environments; disable if needed
  useFetchStreams: false as unknown as undefined,
});

// Initialize Firebase Storage
const storage = getStorage(app);

// Optional: connect to local emulators when enabled
const useEmulators = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === "true";
if (__DEV__ && useEmulators) {
  try {
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
  } catch (e) {
    console.log("[Firebase] Auth emulator connect failed:", e);
  }
  try {
    connectFirestoreEmulator(db, "localhost", 8080);
  } catch (e) {
    console.log("[Firebase] Firestore emulator connect failed:", e);
  }
  try {
    connectStorageEmulator(storage, "localhost", 9199);
  } catch (e) {
    console.log("[Firebase] Storage emulator connect failed:", e);
  }
}

export { auth, db, storage };
export default app;
