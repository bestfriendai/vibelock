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
  // The user's gender/category preference for filtering content
  genderPreference: "all" | "men" | "women" | "lgbtq+";
  // The user's own gender/category for tagging their profile (optional)
  gender?: "man" | "woman" | "nonbinary" | "lgbtq+" | string;
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

export type Sentiment = "green" | "red";
export type ReviewCategory = "all" | "men" | "women" | "lgbtq+";

export interface Review {
  id: string;
  // The authenticated user who authored the review
  authorId: string;
  reviewerAnonymousId: string;
  reviewedPersonName: string;
  reviewedPersonLocation: {
    city: string;
    state: string;
  };
  // Category tag for the reviewed person (used for filtering)
  category?: ReviewCategory;
  profilePhoto: string; // URL to profile photo
  greenFlags: GreenFlag[];
  redFlags: RedFlag[];
  sentiment?: Sentiment;
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
  category: ReviewCategory;
  radius?: number; // in miles, undefined means show all
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
  reportedItemType: "review" | "profile" | "comment" | "message";
  reason: "inappropriate_content" | "fake_profile" | "harassment" | "spam" | "other";
  description?: string;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
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
  // Optional category for gender-specific rooms
  category?: ReviewCategory;
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
  reactions?: {
    emoji: string;
    count: number;
    users: string[];
  }[];
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
  // category filter for chat rooms
  roomCategoryFilter?: "all" | "men" | "women" | "lgbtq+";
  isLoading: boolean;
  error: string | null;
}

// Comment-related types
export interface Comment {
  id: string;
  reviewId: string;
  authorId: string;
  authorName: string; // Anonymous display name
  content: string;
  likeCount: number;
  dislikeCount: number;
  isLiked?: boolean;
  isDisliked?: boolean;
  parentCommentId?: string; // For replies
  replies?: Comment[];
  mediaId?: string; // For image-specific comments
  createdAt: Date;
  updatedAt: Date;
  isDeleted?: boolean;
  isReported?: boolean;
}

export interface CommentThread {
  parentComment: Comment;
  replies: Comment[];
  totalReplies: number;
  hasMoreReplies: boolean;
}

export interface CommentState {
  comments: Record<string, Comment[]>; // reviewId -> comments
  commentThreads: Record<string, CommentThread>; // commentId -> thread
  mediaComments: Record<string, Comment[]>; // mediaId -> comments
  isLoading: boolean;
  isPosting: boolean;
  error: string | null;
}

export interface MediaCommentData {
  mediaId: string;
  mediaUri: string;
  commentCount: number;
  comments: Comment[];
}

// Search result types
export interface SearchResult {
  id: string;
  type: "review" | "comment" | "message";
  title: string;
  content: string;
  snippet: string;
  createdAt: Date;
  metadata: {
    reviewId?: string;
    commentId?: string;
    messageId?: string;
    roomId?: string;
    roomName?: string;
    authorName?: string;
    location?: string;
  };
}

export interface SearchResults {
  reviews: SearchResult[];
  comments: SearchResult[];
  messages: SearchResult[];
  total: number;
}
