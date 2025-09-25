import React from "react";
import { render, RenderOptions } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";
import { ThemeProvider } from "../providers/ThemeProvider";

// Mock providers for testing
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider>
      <NavigationContainer>{children}</NavigationContainer>
    </ThemeProvider>
  );
};

// Custom render function that includes all providers
const customRender = (ui: React.ReactElement, options?: Omit<RenderOptions, "wrapper">) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from "@testing-library/react-native";

// Override render method
export { customRender as render };

// Test data factories
export const createMockUser = (overrides = {}) => ({
  id: "test-user-id",
  email: "test@example.com",
  name: "Test User",
  avatarUrl: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockMessage = (overrides = {}) => ({
  id: "test-message-id",
  content: "Test message content",
  senderId: "test-user-id",
  chatRoomId: "test-room-id",
  timestamp: new Date().toISOString(),
  messageType: "text" as const,
  isRead: false,
  status: "sent" as const,
  ...overrides,
});

export const createMockChatRoom = (overrides = {}) => ({
  id: "test-room-id",
  name: "Test Chat Room",
  description: "Test description",
  memberCount: 5,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isPublic: true,
  ...overrides,
});

export const createMockNotification = (overrides = {}) => ({
  id: "test-notification-id",
  title: "Test Notification",
  body: "Test notification body",
  data: {},
  timestamp: new Date().toISOString(),
  ...overrides,
});

// Async utilities
export const waitForAsync = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

export const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

// Navigation testing utilities
export const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  push: jest.fn(),
  pop: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  dispatch: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => true),
  getState: jest.fn(() => ({
    index: 0,
    routes: [{ name: "TestScreen" }],
  })),
  addListener: jest.fn(),
  removeListener: jest.fn(),
};

export const mockRoute = {
  key: "test-route-key",
  name: "TestScreen" as const,
  params: {},
};
