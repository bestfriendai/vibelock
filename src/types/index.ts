// Core types for LockerRoom MVP

export interface User {
  id: string;
  email: string;
  anonymousId: string;
  location: {
    city: string;
    state: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  genderPreference: "all" | "men" | "women" | "lgbtq+";
  createdAt: Date;
  isBlocked?: boolean;
}

export interface MediaItem {
  id: string;
  uri: string;
  type: "image" | "video";
  thumbnailUri?: string;
  width?: number;
  height?: number;
  duration?: number; // for videos, in seconds
}

export interface SocialMediaHandles {
  instagram?: string;
  tiktok?: string;
  snapchat?: string;
  twitter?: string;
}

export interface Review {
  id: string;
  reviewerAnonymousId: string;
  reviewedPersonName: string;
  reviewedPersonLocation: {
    city: string;
    state: string;
  };
  profilePhoto: string; // URL to profile photo
  greenFlags: GreenFlag[];
  redFlags: RedFlag[];
  reviewText: string;
  media?: MediaItem[]; // Optional media attachments
  socialMedia?: SocialMediaHandles; // Optional social media handles
  status: "pending" | "approved" | "rejected";
  likeCount: number;
  dislikeCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Profile {
  id: string;
  firstName: string;
  location: {
    city: string;
    state: string;
  };
  totalReviews: number;
  greenFlagCount: number;
  redFlagCount: number;
  averageRating?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type GreenFlag = 
  | "good_communicator"
  | "respectful" 
  | "fun"
  | "reliable"
  | "honest"
  | "kind"
  | "ambitious"
  | "good_listener";

export type RedFlag = 
  | "poor_communication"
  | "disrespectful"
  | "unreliable"
  | "fake"
  | "rude"
  | "controlling"
  | "dishonest"
  | "inconsistent";

export interface FilterOptions {
  category: "all" | "men" | "women" | "lgbtq+";
  radius: number; // in miles
  sortBy: "recent" | "most_reviewed" | "highest_rated";
}

export interface SearchFilters {
  firstName: string;
  location?: {
    city: string;
    state: string;
  };
  radius: number;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedItemId: string;
  reportedItemType: "review" | "profile";
  reason: "inappropriate_content" | "fake_profile" | "harassment" | "spam" | "other";
  description?: string;
  status: "pending" | "reviewed" | "resolved";
  createdAt: Date;
}

export interface AppSettings {
  notifications: {
    newReviews: boolean;
    responses: boolean;
    safety: boolean;
  };
  privacy: {
    showLocation: boolean;
    allowDirectMessages: boolean;
  };
  blockedUsers: string[];
  theme: "light" | "dark" | "system";
}

// Chat-related types
export type ChatRoomType = "local" | "global" | "topic";
export type MessageType = "text" | "image" | "system" | "join" | "leave";
export type UserRole = "member" | "moderator" | "admin";
export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export interface ChatRoom {
  id: string;
  name: string;
  description: string;
  type: ChatRoomType;
  memberCount: number;
  onlineCount: number;
  lastMessage?: ChatMessage;
  lastActivity: Date;
  isActive: boolean;
  location?: {
    city: string;
    state: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  chatRoomId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  messageType: MessageType;
  timestamp: Date;
  isRead: boolean;
  isOwn?: boolean;
  replyTo?: string;
}

export interface ChatMember {
  id: string;
  chatRoomId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  joinedAt: Date;
  role: UserRole;
  isOnline: boolean;
  lastSeen: Date;
}

export interface TypingUser {
  userId: string;
  userName: string;
  chatRoomId: string;
  timestamp: Date;
}

export interface ChatState {
  chatRooms: ChatRoom[];
  currentChatRoom: ChatRoom | null;
  messages: Record<string, ChatMessage[]>;
  members: Record<string, ChatMember[]>;
  typingUsers: TypingUser[];
  onlineUsers: string[];
  connectionStatus: ConnectionStatus;
  isLoading: boolean;
  error: string | null;
}