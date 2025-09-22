# Comprehensive Testing Strategy for Locker Room Talk

## Current State Analysis

### Test Coverage Metrics

- **Overall Coverage**: 0.81% (160/19845 lines)
- **Test Files**: 4 test files found
  - `src/i18n/i18n.test.ts`
  - `src/tests/search.test.ts`
  - `src/tests/chatrooms.test.tsx`
  - `src/services/__tests__/websocketService.test.ts`

### Critical Issues Identified

1. **Extremely low test coverage** - less than 1% of code is tested
2. **Missing environment configuration** for tests (Supabase credentials)
3. **No E2E testing framework** properly configured (only basic Maestro setup)
4. **No CI/CD test integration** configured
5. **Missing critical path tests** for authentication, chat, payments, and media

## Testing Architecture

### 1. Unit Testing Strategy

#### Test Structure

```typescript
// src/utils/__tests__/validation.test.ts
import { validateEmail, validatePassword, validateUsername } from "../validation";

describe("Validation Utils", () => {
  describe("validateEmail", () => {
    it("should accept valid email addresses", () => {
      expect(validateEmail("user@example.com")).toBe(true);
      expect(validateEmail("test.user+tag@domain.co.uk")).toBe(true);
    });

    it("should reject invalid email addresses", () => {
      expect(validateEmail("invalid")).toBe(false);
      expect(validateEmail("@domain.com")).toBe(false);
      expect(validateEmail("user@")).toBe(false);
    });
  });

  describe("validatePassword", () => {
    it("should validate password strength", () => {
      expect(validatePassword("weak")).toEqual({
        isValid: false,
        errors: ["Password must be at least 8 characters"],
      });

      expect(validatePassword("StrongP@ss123")).toEqual({
        isValid: true,
        errors: [],
      });
    });
  });
});
```

#### Component Testing Example

```typescript
// src/components/__tests__/ChatMessage.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ChatMessage } from '../ChatMessage';
import { authStore } from '../../state/authStore';

jest.mock('../../state/authStore');

describe('ChatMessage Component', () => {
  const mockMessage = {
    id: '1',
    content: 'Test message',
    senderId: 'user1',
    senderName: 'John Doe',
    timestamp: new Date().toISOString(),
    isOwn: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render message content correctly', () => {
    const { getByText } = render(<ChatMessage message={mockMessage} />);
    expect(getByText('Test message')).toBeTruthy();
    expect(getByText('John Doe')).toBeTruthy();
  });

  it('should apply correct styling for own messages', () => {
    const ownMessage = { ...mockMessage, isOwn: true };
    const { getByTestId } = render(<ChatMessage message={ownMessage} />);
    const messageContainer = getByTestId('message-container');

    expect(messageContainer.props.style).toMatchObject({
      alignSelf: 'flex-end',
      backgroundColor: '#007AFF'
    });
  });

  it('should handle long press for message options', async () => {
    const onLongPress = jest.fn();
    const { getByTestId } = render(
      <ChatMessage message={mockMessage} onLongPress={onLongPress} />
    );

    const messageContainer = getByTestId('message-container');
    fireEvent.longPress(messageContainer);

    await waitFor(() => {
      expect(onLongPress).toHaveBeenCalledWith(mockMessage);
    });
  });
});
```

### 2. Integration Testing

#### Store Integration Tests

```typescript
// src/state/__tests__/chatStore.integration.test.ts
import { chatStore } from "../chatStore";
import { authStore } from "../authStore";
import { supabase } from "../../config/supabase";
import { waitFor } from "@testing-library/react-native";

jest.mock("../../config/supabase");

describe("Chat Store Integration", () => {
  beforeEach(() => {
    chatStore.reset();
    authStore.reset();
  });

  it("should send and receive messages in real-time", async () => {
    // Setup auth state
    authStore.setUser({
      id: "user1",
      email: "test@example.com",
      username: "testuser",
    });

    // Mock Supabase responses
    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [{ id: "msg1", content: "Hello" }],
          error: null,
        }),
      }),
    });

    // Send message
    await chatStore.sendMessage("room1", "Hello");

    await waitFor(() => {
      expect(chatStore.messages["room1"]).toHaveLength(1);
      expect(chatStore.messages["room1"][0].content).toBe("Hello");
    });
  });

  it("should handle connection failures gracefully", async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockRejectedValue(new Error("Network error")),
    });

    await expect(chatStore.sendMessage("room1", "Test")).rejects.toThrow("Network error");

    expect(chatStore.pendingMessages).toHaveLength(1);
  });
});
```

#### API Integration Tests

```typescript
// src/services/__tests__/apiService.integration.test.ts
import { apiService } from "../apiService";
import nock from "nock";

describe("API Service Integration", () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  it("should handle successful API calls", async () => {
    nock("https://api.example.com").post("/chat/message").reply(200, { id: "123", success: true });

    const result = await apiService.sendMessage({
      content: "Test",
      roomId: "room1",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBe("123");
  });

  it("should retry failed requests", async () => {
    let attempts = 0;
    nock("https://api.example.com")
      .post("/chat/message")
      .times(2)
      .reply(() => {
        attempts++;
        return attempts === 1 ? [500, "Server Error"] : [200, { success: true }];
      });

    const result = await apiService.sendMessage({
      content: "Test",
      roomId: "room1",
    });

    expect(attempts).toBe(2);
    expect(result.success).toBe(true);
  });
});
```

### 3. E2E Testing Setup

#### Detox Configuration

```javascript
// .detoxrc.js
module.exports = {
  testRunner: {
    args: {
      $0: "jest",
      config: "e2e/jest.config.js",
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    "ios.debug": {
      type: "ios.app",
      binaryPath: "ios/build/Build/Products/Debug-iphonesimulator/LockerRoomTalk.app",
      build:
        "xcodebuild -workspace ios/LockerRoomTalk.xcworkspace -scheme LockerRoomTalk -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build",
    },
    "android.debug": {
      type: "android.apk",
      binaryPath: "android/app/build/outputs/apk/debug/app-debug.apk",
      build: "cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug",
    },
  },
  devices: {
    simulator: {
      type: "ios.simulator",
      device: {
        type: "iPhone 14",
      },
    },
    emulator: {
      type: "android.emulator",
      device: {
        avdName: "Pixel_4_API_30",
      },
    },
  },
  configurations: {
    "ios.debug": {
      device: "simulator",
      app: "ios.debug",
    },
    "android.debug": {
      device: "emulator",
      app: "android.debug",
    },
  },
};
```

#### E2E Test Example

```typescript
// e2e/auth.e2e.test.ts
import { device, element, by, expect } from "detox";

describe("Authentication Flow", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it("should show login screen on app launch", async () => {
    await expect(element(by.id("login-screen"))).toBeVisible();
    await expect(element(by.id("email-input"))).toBeVisible();
    await expect(element(by.id("password-input"))).toBeVisible();
  });

  it("should login with valid credentials", async () => {
    await element(by.id("email-input")).typeText("test@example.com");
    await element(by.id("password-input")).typeText("Test123!");
    await element(by.id("login-button")).tap();

    await waitFor(element(by.id("home-screen")))
      .toBeVisible()
      .withTimeout(5000);
  });

  it("should show error for invalid credentials", async () => {
    await element(by.id("email-input")).typeText("invalid@example.com");
    await element(by.id("password-input")).typeText("wrong");
    await element(by.id("login-button")).tap();

    await expect(element(by.text("Invalid credentials"))).toBeVisible();
  });
});
```

#### Maestro Test Examples

```yaml
# .maestro/chat-flow.yaml
appId: com.lockerroomtalk.dev
---
- launchApp
- assertVisible: "Sign In"
- tapOn:
    id: "email-input"
- inputText: "test@example.com"
- tapOn:
    id: "password-input"
- inputText: "Test123!"
- tapOn: "Sign In"
- assertVisible: "Chatrooms"

# Navigate to chat
- tapOn: "General Chat"
- assertVisible:
    id: "chat-screen"

# Send message
- tapOn:
    id: "message-input"
- inputText: "Hello from Maestro test!"
- tapOn:
    id: "send-button"
- assertVisible: "Hello from Maestro test!"

# Test message reactions
- longPressOn: "Hello from Maestro test!"
- assertVisible: "React"
- tapOn: "❤️"
- assertVisible: "❤️"
```

### 4. Mock Strategies

#### Supabase Mock Setup

```typescript
// src/__mocks__/supabase.ts
export const mockSupabase = {
  auth: {
    signIn: jest.fn(),
    signOut: jest.fn(),
    getUser: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  },
  from: jest.fn((table: string) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  })),
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockResolvedValue({ status: "SUBSCRIBED" }),
    unsubscribe: jest.fn(),
  })),
};

jest.mock("../../config/supabase", () => ({
  supabase: mockSupabase,
}));
```

#### Network Mock Strategy

```typescript
// src/__mocks__/network.ts
import { Platform } from "react-native";

export const mockFetch = (responses: Record<string, any>) => {
  global.fetch = jest.fn((url: string, options?: any) => {
    const response = responses[url] || { status: 404, body: "Not Found" };

    return Promise.resolve({
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: () => Promise.resolve(response.body),
      text: () => Promise.resolve(JSON.stringify(response.body)),
    });
  });
};

// Usage in tests
beforeEach(() => {
  mockFetch({
    "https://api.example.com/users": {
      status: 200,
      body: { users: [] },
    },
  });
});
```

### 5. CI/CD Integration

#### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run type checking
        run: npm run typecheck

      - name: Run unit tests
        run: npm test -- --coverage --coverageReporters=json
        env:
          EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json

  e2e-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: |
          npm ci
          brew tap wix/brew
          brew install applesimutils
          npm install -g detox-cli

      - name: Build iOS app
        run: |
          detox build -c ios.debug

      - name: Run E2E tests
        run: |
          detox test -c ios.debug --cleanup

  e2e-android:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: "temurin"
          java-version: "11"

      - name: Install dependencies
        run: |
          npm ci
          npm install -g detox-cli

      - name: Build Android app
        run: |
          detox build -c android.debug

      - name: Run E2E tests
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 30
          script: detox test -c android.debug --cleanup
```

### 6. Testing Tools Setup

#### Flipper Integration

```typescript
// App.tsx
import { Platform } from "react-native";

if (__DEV__ && Platform.OS === "ios") {
  require("react-native-flipper").default();
}

// flipper.config.js
module.exports = {
  plugins: [
    "flipper-plugin-react-navigation",
    "flipper-plugin-redux-debugger",
    "flipper-plugin-network",
    "flipper-plugin-async-storage",
    "flipper-plugin-react-query-devtools",
  ],
};
```

#### Reactotron Setup

```typescript
// src/config/reactotron.ts
import Reactotron from "reactotron-react-native";
import { reactotronRedux } from "reactotron-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";

const reactotron = Reactotron.setAsyncStorageHandler(AsyncStorage)
  .configure({
    name: "Locker Room Talk",
    host: "localhost",
  })
  .useReactNative({
    networking: {
      ignoreUrls: /symbolicate|127.0.0.1/,
    },
    editor: false,
    overlay: false,
  })
  .use(reactotronRedux())
  .connect();

// Clear on reload
reactotron.clear();

export default reactotron;
```

### 7. Test Environment Configuration

#### Test Setup File

```javascript
// jest.setup.js
import "@testing-library/jest-native/extend-expect";
import { configure } from "@testing-library/react-native";

// Configure testing library
configure({
  asyncUtilTimeout: 5000,
});

// Mock environment variables
process.env.EXPO_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.EXPO_PUBLIC_API_URL = "https://test-api.example.com";

// Mock react-native modules
jest.mock("react-native/Libraries/Animated/NativeAnimatedHelper");
jest.mock("react-native/Libraries/EventEmitter/NativeEventEmitter");

// Mock expo modules
jest.mock("expo-constants", () => ({
  Constants: {
    manifest: {},
    expoConfig: {},
  },
}));

jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Global test utilities
global.testUtils = {
  flushPromises: () => new Promise((resolve) => setImmediate(resolve)),
  mockConsole: () => {
    const originalConsole = { ...console };
    beforeAll(() => {
      console.error = jest.fn();
      console.warn = jest.fn();
    });
    afterAll(() => {
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
    });
  },
};
```

### 8. Testing Best Practices

#### Test Organization

```
src/
├── components/
│   ├── __tests__/
│   │   ├── Button.test.tsx
│   │   └── Card.test.tsx
│   ├── Button.tsx
│   └── Card.tsx
├── screens/
│   ├── __tests__/
│   │   ├── HomeScreen.test.tsx
│   │   └── ProfileScreen.test.tsx
│   ├── HomeScreen.tsx
│   └── ProfileScreen.tsx
├── services/
│   ├── __tests__/
│   │   ├── auth.test.ts
│   │   └── api.test.ts
│   ├── auth.ts
│   └── api.ts
└── utils/
    ├── __tests__/
    │   ├── validation.test.ts
    │   └── formatting.test.ts
    ├── validation.ts
    └── formatting.ts
```

#### Testing Checklist

- [ ] Unit tests for all utility functions
- [ ] Component tests for all UI components
- [ ] Integration tests for store interactions
- [ ] E2E tests for critical user flows
- [ ] Performance tests for heavy operations
- [ ] Accessibility tests for all screens
- [ ] Snapshot tests for styled components
- [ ] Error boundary testing
- [ ] Network failure handling tests
- [ ] Authentication flow tests
- [ ] Payment flow tests
- [ ] Push notification tests
- [ ] Deep linking tests
- [ ] Offline mode tests

### 9. Coverage Goals

#### Immediate (Sprint 1)

- Achieve 30% code coverage
- Test all authentication flows
- Test critical chat functionality
- Setup CI/CD pipeline

#### Short-term (Month 1)

- Achieve 60% code coverage
- Complete E2E test suite
- Test all payment flows
- Performance testing baseline

#### Long-term (Quarter 1)

- Achieve 80% code coverage
- Automated visual regression testing
- Load testing infrastructure
- Security testing automation

### 10. Testing Commands

```json
// package.json scripts
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:update": "jest -u",
    "test:e2e:ios": "detox test -c ios.debug",
    "test:e2e:android": "detox test -c android.debug",
    "test:e2e:build:ios": "detox build -c ios.debug",
    "test:e2e:build:android": "detox build -c android.debug",
    "test:maestro": "maestro test .maestro/",
    "test:performance": "jest --testPathPattern=performance",
    "test:accessibility": "jest --testPathPattern=accessibility",
    "test:security": "npm audit && npm run test:security:scan",
    "test:all": "npm run lint && npm run typecheck && npm run test:coverage && npm run test:e2e"
  }
}
```

## Implementation Priority

### Phase 1: Foundation (Week 1-2)

1. Fix test environment configuration
2. Setup proper mocking strategies
3. Add unit tests for utilities and services
4. Achieve 30% coverage

### Phase 2: Integration (Week 3-4)

1. Add store integration tests
2. Test API interactions
3. Test real-time features
4. Achieve 50% coverage

### Phase 3: E2E Setup (Week 5-6)

1. Configure Detox properly
2. Write critical path E2E tests
3. Setup Maestro for additional flows
4. Integrate with CI/CD

### Phase 4: Advanced Testing (Week 7-8)

1. Performance testing
2. Accessibility testing
3. Visual regression testing
4. Security testing

## Monitoring & Reporting

### Coverage Reports

- Use Istanbul for coverage reporting
- Integrate with Codecov for tracking
- Set coverage thresholds in CI
- Generate HTML reports for review

### Test Analytics

- Track test execution time
- Monitor flaky tests
- Analyze failure patterns
- Generate test health dashboards

### Quality Metrics

- Code coverage percentage
- Test execution time
- Test stability score
- Bug escape rate
- Time to fix test failures

## Conclusion

This comprehensive testing strategy addresses the critical gaps in the current implementation and provides a clear roadmap to achieve robust test coverage. The phased approach ensures quick wins while building toward comprehensive quality assurance.

Key success factors:

1. Fix environment configuration immediately
2. Start with high-value unit tests
3. Build integration tests incrementally
4. Setup E2E tests for critical paths
5. Integrate testing into CI/CD pipeline
6. Monitor and improve continuously

The strategy balances immediate needs with long-term quality goals, ensuring the application becomes more reliable and maintainable over time.
