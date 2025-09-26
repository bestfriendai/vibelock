/* global jest */

// Mock environment variables for testing
process.env.EXPO_PUBLIC_SUPABASE_URL = "https://mock-supabase-url.supabase.co";
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "mock-supabase-anon-key";
process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = "mock-firebase-project-id";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Mock Supabase configuration to avoid validation errors during tests
jest.mock("./src/config/supabase", () => {
  const originalModule = jest.requireActual("./src/config/supabase");

  // Mock the validation to always pass in tests
  return {
    ...originalModule,
    validateSupabaseConfig: () => ({
      isValid: true,
      errors: [],
      warnings: [],
    }),
  };
});

// Mock Supabase client
jest.mock("./src/config/supabase", () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: "test-user-id" } },
        error: null,
      }),
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          order: jest.fn(),
        })),
        insert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })),
    })),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockResolvedValue({}),
      send: jest.fn().mockResolvedValue({}),
      track: jest.fn().mockResolvedValue({}),
      untrack: jest.fn().mockResolvedValue({}),
      presenceState: jest.fn().mockReturnValue({}),
    })),
    removeChannel: jest.fn().mockResolvedValue({}),
  },
  validateSupabaseConfig: () => ({
    isValid: true,
    errors: [],
    warnings: [],
  }),
}));

// Minimal Jest setup to avoid property configuration errors

// Gesture Handler setup - only import, don't modify properties
try {
  require("react-native-gesture-handler/jestSetup");
} catch (_error) {
  // Ignore if gesture handler setup fails
}

// Mock Reanimated v4 without modifying properties
jest.mock("react-native-reanimated", () => {
  try {
    const Reanimated = require("react-native-reanimated/mock");
    return Reanimated;
  } catch (_error) {
    // Return a basic mock if the official mock fails
    return {
      default: {},
      useSharedValue: jest.fn(() => ({ value: 0 })),
      useDerivedValue: jest.fn(() => ({ value: 0 })),
      useAnimatedStyle: jest.fn(() => ({})),
      withTiming: jest.fn((value) => value),
      withSpring: jest.fn((value) => value),
      runOnJS: jest.fn((fn) => fn),
    };
  }
});

// Mock React Native completely to avoid DevMenu and other native module issues
jest.mock("react-native", () => {
  // Create a completely isolated mock with no dependencies on actual React Native
  const mockComponent = (name) => {
    const Component = jest.fn(({ children, ...props }) => {
      if (typeof children === "function") {
        return children(props);
      }
      return children || null;
    });
    Component.displayName = name;
    return Component;
  };

  return {
    // Core components
    View: mockComponent("View"),
    Text: mockComponent("Text"),
    ScrollView: mockComponent("ScrollView"),
    FlatList: mockComponent("FlatList"),

    // Core APIs
    Alert: {
      alert: jest.fn(),
    },
    Platform: {
      OS: "ios",
      Version: 15,
    },

    // Style and dimensions
    StyleSheet: {
      create: jest.fn((styles) => styles),
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 667, scale: 2, fontScale: 1 })),
    },

    // Interaction
    TouchableOpacity: mockComponent("TouchableOpacity"),
    TouchableHighlight: mockComponent("TouchableHighlight"),

    // Safe area
    SafeAreaView: mockComponent("SafeAreaView"),

    // Status bar
    StatusBar: {
      setBarStyle: jest.fn(),
      setBackgroundColor: jest.fn(),
    },

    // Activity indicator
    ActivityIndicator: mockComponent("ActivityIndicator"),

    // Text input
    TextInput: mockComponent("TextInput"),

    // Image
    Image: mockComponent("Image"),

    // Modal
    Modal: mockComponent("Modal"),

    // Keyboard
    Keyboard: {
      dismiss: jest.fn(),
    },

    // App state
    AppState: {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      currentState: "active",
    },

    // Linking
    Linking: {
      openURL: jest.fn(),
      canOpenURL: jest.fn(),
    },

    // Appearance (needed by react-native-css-interop)
    Appearance: {
      getColorScheme: jest.fn(() => "light"),
      addChangeListener: jest.fn(),
      removeChangeListener: jest.fn(),
    },
  };
});

// Mock react-native-url-polyfill to avoid BlobModule issues
jest.mock("react-native-url-polyfill", () => ({
  URL: jest.fn(),
  URLSearchParams: jest.fn(),
}));

// Mock the auto import that triggers the BlobModule error
jest.mock("react-native-url-polyfill/auto", () => {
  // Mock the URL and URLSearchParams globally
  global.URL = jest.fn();
  global.URLSearchParams = jest.fn();
});

// Mock Firebase modules (only mock what's actually installed)
jest.mock("@react-native-firebase/app", () => ({}));

// Mock Expo modules
jest.mock("expo-constants", () => ({
  default: {
    manifest: {},
  },
}));

// Minimal console warning filter without prototype modification
const originalWarn = console.warn;
console.warn = (msg, ...args) => {
  const text = String(msg);
  if (text.includes("useNativeDriver") || text.includes("useNativeDriver was not specified")) {
    return;
  }
  return originalWarn.call(console, msg, ...args);
};

// Test utilities
global.testUtils = {
  createMockUser: (overrides = {}) => ({
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
    ...overrides,
  }),
  createMockMessage: (overrides = {}) => ({
    id: "test-message-id",
    content: "Test message",
    senderId: "test-user-id",
    chatRoomId: "test-room-id",
    timestamp: new Date().toISOString(),
    messageType: "text",
    ...overrides,
  }),
  createMockChatRoom: (overrides = {}) => ({
    id: "test-room-id",
    name: "Test Room",
    description: "Test description",
    memberCount: 5,
    ...overrides,
  }),
};
