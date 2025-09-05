# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Locker Room Talk** is a React Native dating review platform built with Expo, Supabase, and AI integrations. Users can create anonymous reviews, browse profiles, and participate in location-based chat rooms.

## 🚀 Development Commands

### Daily Development

```bash
# Start development server
expo start

# Platform-specific development
expo start --ios        # iOS simulator
expo start --android    # Android emulator
expo start --web        # Web browser

# Install dependencies
bun install

# Generate app assets (only when explicitly requested)
npx tsx generate-asset-script.ts
```

### Code Quality

```bash
# Lint code (inferred from .eslintrc.js)
npx eslint . --ext .js,.jsx,.ts,.tsx

# Type checking
npx tsc --noEmit
```

### Firebase Development

```bash
# Start Firebase emulators (configured in firebase.json)
firebase emulators:start

# Emulator ports:
# - Firestore: localhost:8080
# - Storage: localhost:9199
# - UI: localhost:4000
```

### Testing & Building

```bash
# No test commands configured in package.json
# Builds are handled through Expo development build or EAS

# For production builds, use Expo EAS:
# eas build --platform ios
# eas build --platform android
```

## 🏗 Architecture Overview

### Project Structure

```
src/
├── api/           # AI services (OpenAI, Anthropic, Grok)
├── components/    # Reusable UI components
├── config/        # Firebase and app configuration
├── navigation/    # React Navigation setup
├── screens/       # Screen components
├── services/      # Firebase wrappers and utilities
├── state/         # Zustand stores for global state
├── types/         # TypeScript type definitions
└── utils/         # Helper functions and utilities
```

### Navigation Stack

The app uses React Navigation v7 with nested navigators:

```
AppNavigator (Stack)
├── Auth Flow (when not authenticated)
│   ├── OnboardingScreen
│   ├── SignInScreen
│   └── SignUpScreen
└── Main App (when authenticated)
    ├── TabNavigator
    │   ├── BrowseStack → BrowseScreen, ReviewDetailScreen
    │   ├── SearchStack → SearchScreen, ReviewDetailScreen
    │   ├── ChatroomsStack → ChatroomsScreen
    │   └── SettingsStack → ProfileScreen, FirebaseExample
    ├── CreateReviewScreen (Modal)
    ├── PersonProfileScreen (Modal)
    └── ChatRoomScreen
```

### State Management

Uses **Zustand** with persistence for global state:

- `authStore.ts` - User authentication and profile data
- `reviewsStore.ts` - Review data and filtering
- `chatStore.ts` - Chat rooms and messages
- `safetyStore.ts` - Content moderation and reporting

### Data Flow

1. **Authentication**: Firebase Auth → Zustand authStore → Firestore user profile
2. **Reviews**: Create review → Firebase Functions moderation → Firestore storage
3. **Chat**: WebSocket service → Real-time message updates → Zustand chatStore
4. **AI Integration**: Chat service wrapper → Multiple AI providers (OpenAI, Anthropic, Grok)

## 🎨 Styling & UI

### NativeWind (TailwindCSS)

The app uses NativeWind v4 for styling with a custom dark theme:

```typescript
// Key theme colors (from tailwind.config.js)
surface: { 900: "#0B0B0F", 800: "#141418", 700: "#1D1D22" }
text: { primary: "#F3F4F6", secondary: "#9CA3AF" }
brand: { red: "#FFFFFF" } // Note: Configured as white for dark theme
```

### Component Patterns

```tsx
// Standard component with NativeWind classes
function ReviewCard({ review }: { review: Review }) {
  return (
    <View className="bg-surface-800 rounded-xl p-4 border border-border">
      <Text className="text-text-primary text-lg font-bold">{review.reviewedPersonName}</Text>
    </View>
  );
}
```

## 🤖 AI Integration

### Available AI Services

The app includes pre-configured AI clients accessible via `src/api/chat-service.ts`:

```typescript
// OpenAI (supports image analysis)
const response = await getOpenAITextResponse(messages, {
  model: "gpt-4o",
  maxTokens: 2048,
});

// Anthropic
const response = await getAnthropicTextResponse(messages, {
  model: "claude-3-5-sonnet-20240620",
});

// Grok (X.AI)
const response = await getGrokTextResponse(messages, {
  model: "grok-3-beta",
});
```

### Audio Transcription

```typescript
import { transcribeAudio } from "@/api/transcribe-audio";

// Transcribe audio using OpenAI's gpt-4o-transcribe
const text = await transcribeAudio(localAudioUri);
```

### Image Generation

```typescript
import { generateImage } from "@/api/image-generation";

// Generate images using Vibecode's custom endpoint (OpenAI gpt-image-1)
const imageUrl = await generateImage("Modern app icon", {
  size: "1024x1024",
  quality: "high",
  format: "png",
});
```

### Camera Implementation

When implementing camera features, use the modern CameraView API:

```tsx
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";

function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>("back");

  return (
    <CameraView
      style={{ flex: 1 }} // Use style, not className for CameraView
      facing={facing}
      enableTorch={flash}
    >
      <View className="absolute top-0 left-0 right-0 bottom-0 z-10">{/* Overlay UI */}</View>
    </CameraView>
  );
}
```

## 🚀 Supabase Configuration

### Services Used

- **Authentication** - User signup/signin with email/password and session management
- **PostgreSQL** - Reviews, user profiles, chat messages with Row Level Security
- **Storage** - Media uploads with bucket management (images, videos, audio)
- **Real-time** - WebSocket subscriptions for live chat and comments
- **Edge Functions** - Content moderation and processing (when needed)

### Environment Variables

All Supabase config is loaded from environment variables:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://dqjhwqhelqwhvtpxccwj.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Legacy Firebase config (kept for reference during migration)
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

### Database Tables

- `users` - User profiles and preferences
- `reviews_firebase` - Dating reviews with moderation status
- `chat_rooms_firebase` - Chat room metadata and settings
- `chat_messages_firebase` - Real-time chat messages
- `comments_firebase` - Review comments and replies

### Supabase Services Wrapper

Access Supabase through the services layer:

```typescript
import { supabaseAuth, supabaseUsers, supabaseChat } from "@/services/supabase";

// Authentication
await supabaseAuth.signIn(email, password);
await supabaseAuth.signUp(email, password);

// User management
await supabaseUsers.createUserProfile(userId, profileData);
const profile = await supabaseUsers.getUserProfile(userId);

// Real-time subscriptions
const unsubscribe = supabaseChat.onMessagesSnapshot(roomId, (messages) => {
  console.log('New messages:', messages);
});
```

### Migration Status

✅ **Complete Migration from Firebase to Supabase**
- All authentication flows migrated
- Database operations converted to PostgreSQL
- Real-time subscriptions implemented
- File storage migrated to Supabase Storage
- Row Level Security policies implemented
- See `SUPABASE_MIGRATION.md` for detailed migration guide

## ⚙️ Environment Setup

### Prerequisites

- Node.js 18+ or Bun 1.0+
- Expo CLI (`npm install -g @expo/cli`)
- iOS: Xcode 14+ and iOS Simulator
- Android: Android Studio and Android SDK
- Firebase CLI (optional, for emulators)

### Environment Variables

Required environment variables (see `.env` file):

```bash
# AI API Keys (Vibecode prefixed)
EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY=
EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY=
EXPO_PUBLIC_VIBECODE_GROK_API_KEY=

# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

### Development Setup

1. Clone repository and install dependencies:

   ```bash
   git clone <repo-url>
   cd loccc
   bun install
   ```

2. Configure environment:

   ```bash
   cp .env.example .env  # If available
   # Edit .env with your API keys and Firebase config
   ```

3. Start development:
   ```bash
   expo start
   ```

## 🚨 Important Development Notes

### Environment Variable Access

**Always use `process.env.EXPO_PUBLIC_*` directly - do not use `@env` imports or `Constants.expoConfig`:**

```typescript
// ✅ Correct
const apiKey = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY;

// ❌ Incorrect
import { OPENAI_API_KEY } from "@env";
const apiKey = Constants.expoConfig.extra.apiKey;
```

### AI Service Usage

- Use existing API wrappers in `src/api/` - they include error handling and retry logic
- For audio transcription, use `transcribeAudio()` with OpenAI's `gpt-4o-transcribe` model
- For image generation, use `generateImage()` with Vibecode's custom endpoint
- Always handle long-running operations (60+ seconds for image generation) gracefully

### Media Handling

- Do not mock image/audio analysis - actually send data to AI services
- Use proper FormData for file uploads
- Handle permissions properly with Expo's permission hooks

### Asset Generation

- Only use `generate-asset-script.ts` when explicitly requested
- Script generates max 3 assets concurrently to avoid timeouts
- Assets are saved to `assets/` folder and logged to `logs/imageGenerationsLog`

### Code Style

- Use TypeScript strict mode (enabled in `tsconfig.json`)
- Follow ESLint configuration in `.eslintrc.js`
- Use NativeWind classes instead of StyleSheet for consistency
- Implement proper error boundaries with `ErrorBoundary` component

### Testing Notes

- No test commands are configured in `package.json`
- Manual testing should cover authentication flow, review creation, and chat functionality
- Test on both iOS and Android platforms before releases

## 🔧 Troubleshooting

### Common Issues

1. **Environment variables not loading**: Ensure variables are prefixed with `EXPO_PUBLIC_`
2. **Firebase connection issues**: Check if emulators are running or Firebase config is correct
3. **AI API failures**: Verify API keys and check rate limits
4. **Camera not working**: Ensure proper permissions and use `CameraView` not deprecated `Camera`
5. **Build failures**: Clear Expo cache with `expo start --clear` or `expo r -c`

### Debug Commands

```bash
# Clear Expo cache
expo start --clear

# Reset development build
expo install --fix

# View logs
expo logs

# Check environment
expo config
```
