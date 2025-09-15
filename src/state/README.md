# State Management Architecture

## Current State (Production)

The application currently uses a unified `chatStore` for all chat-related state management:
- `src/state/chatStore.ts` - Main chat store handling messages, rooms, members, and real-time updates

## Experimental Stores (Not Yet Integrated)

The following stores were created as part of a planned modularization effort but are **NOT YET INTEGRATED** into the UI:
- `src/state/messagesStore.ts` - Focused message management
- `src/state/chatRoomsStore.ts` - Focused room management

### Migration Status
These experimental stores are currently unused. A future migration would involve:
1. Refactoring `ChatRoomScreen` and related components to use the new stores
2. Migrating real-time service callbacks to update the new stores
3. Removing overlapping functionality from `chatStore`
4. Comprehensive testing of the new architecture

### Decision
For now, we maintain the existing `chatStore` as the single source of truth to avoid confusion and maintain stability. The experimental stores are kept for reference but should not be used in production code until a formal migration is planned and executed.

## Store Responsibilities

### chatStore (Active)
- Chat room management
- Message sending/receiving
- Real-time subscriptions
- Member management
- Typing indicators
- Online status
- Message reactions

### authStore
- User authentication state
- Session management
- Login/logout flows

### themeStore
- Theme preferences
- Dark/light mode toggle
- High contrast mode

### subscriptionStore
- RevenueCat integration
- Subscription status
- Premium features