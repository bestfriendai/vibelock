import { Share, Alert } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Review, Profile } from "../types";

// Base URL for deep links - configurable via environment variable
const BASE_URL = process.env.EXPO_PUBLIC_APP_URL || "https://lockerroom.app";

export const shareService = {
  // Generate deep link for a review
  generateReviewLink: (reviewId: string): string => {
    return `${BASE_URL}/review/${reviewId}`;
  },

  // Generate deep link for a profile
  generateProfileLink: (firstName: string, city: string, state: string): string => {
    const encodedFirstName = encodeURIComponent(firstName);
    const encodedCity = encodeURIComponent(city);
    const encodedState = encodeURIComponent(state);
    return `${BASE_URL}/profile/${encodedFirstName}/${encodedCity}/${encodedState}`;
  },

  // Share a review
  shareReview: async (review: Review): Promise<void> => {
    try {
      const link = shareService.generateReviewLink(review.id);
      const message = `Check out this review of ${review.reviewedPersonName} from ${review.reviewedPersonLocation.city}, ${review.reviewedPersonLocation.state} on Locker Room Talk\n\n${link}`;

      const result = await Share.share({
        message,
        url: link, // iOS will use this
        title: `Review of ${review.reviewedPersonName}`,
      });

      if (result.action === Share.sharedAction) {
        console.log("Review shared successfully");
      }
    } catch (error) {
      console.warn("Error sharing review:", error);
      Alert.alert("Error", "Failed to share review. Please try again.");
    }
  },

  // Share a profile
  shareProfile: async (profile: Profile): Promise<void> => {
    try {
      const link = shareService.generateProfileLink(profile.firstName, profile.location.city, profile.location.state);
      const message = `Check out ${profile.firstName}'s profile from ${profile.location.city}, ${profile.location.state} on Locker Room Talk\n\n${profile.totalReviews} reviews • ${profile.greenFlagCount} green flags\n\n${link}`;

      const result = await Share.share({
        message,
        url: link, // iOS will use this
        title: `${profile.firstName}'s Profile`,
      });

      if (result.action === Share.sharedAction) {
        console.log("Profile shared successfully");
      }
    } catch (error) {
      console.warn("Error sharing profile:", error);
      Alert.alert("Error", "Failed to share profile. Please try again.");
    }
  },

  // Copy link to clipboard
  copyReviewLink: async (reviewId: string): Promise<void> => {
    try {
      const link = shareService.generateReviewLink(reviewId);
      await Clipboard.setStringAsync(link);
      Alert.alert("Link Copied", "Review link has been copied to your clipboard.");
    } catch (error) {
      console.warn("Error copying link:", error);
      Alert.alert("Error", "Failed to copy link. Please try again.");
    }
  },

  // Copy profile link to clipboard
  copyProfileLink: async (firstName: string, city: string, state: string): Promise<void> => {
    try {
      const link = shareService.generateProfileLink(firstName, city, state);
      await Clipboard.setStringAsync(link);
      Alert.alert("Link Copied", "Profile link has been copied to your clipboard.");
    } catch (error) {
      console.warn("Error copying link:", error);
      Alert.alert("Error", "Failed to copy link. Please try again.");
    }
  },

  // Show share options for review
  showReviewShareOptions: (review: Review): void => {
    Alert.alert("Share Review", `Share ${review.reviewedPersonName}'s review`, [
      {
        text: "Share",
        onPress: () => shareService.shareReview(review),
      },
      {
        text: "Copy Link",
        onPress: () => shareService.copyReviewLink(review.id),
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  },

  // Show share options for profile
  showProfileShareOptions: (profile: Profile): void => {
    Alert.alert("Share Profile", `Share ${profile.firstName}'s profile`, [
      {
        text: "Share",
        onPress: () => shareService.shareProfile(profile),
      },
      {
        text: "Copy Link",
        onPress: () => shareService.copyProfileLink(profile.firstName, profile.location.city, profile.location.state),
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  },
};

export default shareService;
