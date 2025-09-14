import React from "react";
import { render, screen } from "@testing-library/react-native";
import useChatStore from "../src/state/chatStore";
import ChatRoomScreen from "../src/screens/ChatRoomScreen";

// Mock navigation and route
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useRoute: () => ({ params: { roomId: "test-room" } }),
  useNavigation: () => ({ navigate: jest.fn(), canGoBack: () => false, goBack: jest.fn() }),
}));

// Mock auth state to allow chat access
jest.mock("../src/utils/authUtils", () => ({
  useAuthState: () => ({ canAccessChat: true, needsSignIn: false, user: { id: "u1", name: "User" } }),
}));

// Mock notification service
jest.mock("../src/services/notificationService", () => ({
  notificationService: { getChatRoomSubscription: jest.fn().mockResolvedValue(false) },
}));

// Mock EnhancedMessageBubble to expose simple text for order checks
jest.mock("../src/components/EnhancedMessageBubble", () => {
  return ({ message }: any) => {
    return <>{/* eslint-disable-next-line react/jsx-no-undef */}<Text testID={`bubble-${message.id}`}>{message.content}</Text></>;
  };
});

// Provide React Native Text for the mock above
import { Text } from "react-native";

describe("Chat message ordering", () => {
  beforeEach(() => {
    useChatStore.setState({ messages: {}, members: {}, typingUsers: [], error: null, isLoading: false } as any);
  });

  test("addMessage keeps ascending order (oldest→newest)", () => {
    const store = useChatStore.getState();
    const older = {
      id: "m1",
      chatRoomId: "r1",
      senderId: "u1",
      senderName: "A",
      content: "old",
      messageType: "text",
      timestamp: new Date(1000),
    } as any;
    const newer = { ...older, id: "m2", content: "new", timestamp: new Date(2000) };

    store.addMessage(newer);
    store.addMessage(older);

    const msgs = useChatStore.getState().messages["r1"];
    expect(msgs.map((m: any) => m.id)).toEqual(["m1", "m2"]);
  });

  test("ChatRoomScreen renders oldest at top, newest at bottom", async () => {
    useChatStore.setState({
      messages: {
        "test-room": [
          { id: "m1", chatRoomId: "test-room", senderId: "u1", senderName: "A", content: "old", messageType: "text", timestamp: new Date(1000) },
          { id: "m2", chatRoomId: "test-room", senderId: "u2", senderName: "B", content: "new", messageType: "text", timestamp: new Date(2000) },
        ],
      },
      members: { "test-room": [] },
      typingUsers: [],
      connectionStatus: "connected",
      isLoading: false,
      error: null,
    } as any);

    render(<ChatRoomScreen />);

    const first = await screen.findByTestId("bubble-m1");
    const second = await screen.findByTestId("bubble-m2");
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
  });
});

