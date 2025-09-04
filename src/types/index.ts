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

export interface Review {
  id: string;
  reviewerAnonymousId: string;
  reviewedPersonName: string;
  reviewedPersonLocation: {
    city: string;
    state: string;
  };
  greenFlags: GreenFlag[];
  redFlags: RedFlag[];
  reviewText: string;
  status: "pending" | "approved" | "rejected";
  likeCount: number;
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