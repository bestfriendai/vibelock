import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
import { Alert, Linking } from "react-native";
import { Review } from "../types";

export interface ShareOptions {
  title?: string;
  message?: string;
  url?: string;
  dialogTitle?: string;
}

class SocialSharingService {
  /**
   * Share a review with customizable options
   */
  async shareReview(review: Review, options: ShareOptions = {}): Promise<boolean> {
    try {
      const shareContent = this.generateShareContent(review, options);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(shareContent.url || "", {
          dialogTitle: shareContent.dialogTitle,
        });
        return true;
      } else {
        // Fallback to clipboard
        await this.copyToClipboard(shareContent.message);
        Alert.alert(
          "Copied to Clipboard",
          "Share content has been copied to your clipboard. You can paste it in any app.",
          [{ text: "OK" }],
        );
        return true;
      }
    } catch (error) {
      console.error("Share failed:", error);
      Alert.alert("Share Failed", "Unable to share at this time. Please try again later.", [{ text: "OK" }]);
      return false;
    }
  }

  /**
   * Share to specific social media platforms
   */
  async shareToTwitter(review: Review): Promise<boolean> {
    try {
      const content = this.generateShareContent(review);
      const tweetText = encodeURIComponent(content.message);
      const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;

      const canOpen = await Linking.canOpenURL(twitterUrl);
      if (canOpen) {
        await Linking.openURL(twitterUrl);
        return true;
      } else {
        await this.copyToClipboard(content.message);
        Alert.alert("Twitter Not Available", "Twitter app not found. Content copied to clipboard.", [{ text: "OK" }]);
        return false;
      }
    } catch (error) {
      console.error("Twitter share failed:", error);
      return false;
    }
  }

  async shareToInstagram(review: Review): Promise<boolean> {
    try {
      // Instagram doesn't support direct text sharing, so we'll copy to clipboard
      const content = this.generateShareContent(review);
      await this.copyToClipboard(content.message);

      const instagramUrl = "instagram://app";
      const canOpen = await Linking.canOpenURL(instagramUrl);

      if (canOpen) {
        Alert.alert(
          "Ready for Instagram",
          "Content copied to clipboard. Instagram will open - you can paste this in your story or post.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Instagram",
              onPress: () => Linking.openURL(instagramUrl),
            },
          ],
        );
        return true;
      } else {
        Alert.alert("Instagram Not Available", "Instagram app not found. Content copied to clipboard.", [
          { text: "OK" },
        ]);
        return false;
      }
    } catch (error) {
      console.error("Instagram share failed:", error);
      return false;
    }
  }

  async shareToWhatsApp(review: Review): Promise<boolean> {
    try {
      const content = this.generateShareContent(review);
      const message = encodeURIComponent(content.message);
      const whatsappUrl = `whatsapp://send?text=${message}`;

      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        return true;
      } else {
        await this.copyToClipboard(content.message);
        Alert.alert("WhatsApp Not Available", "WhatsApp not found. Content copied to clipboard.", [{ text: "OK" }]);
        return false;
      }
    } catch (error) {
      console.error("WhatsApp share failed:", error);
      return false;
    }
  }

  /**
   * Copy content to clipboard
   */
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await Clipboard.setStringAsync(text);
      return true;
    } catch (error) {
      console.error("Clipboard copy failed:", error);
      return false;
    }
  }

  /**
   * Generate shareable content from review
   */
  private generateShareContent(
    review: Review,
    options: ShareOptions = {},
  ): {
    title: string;
    message: string;
    url: string;
    dialogTitle: string;
  } {
    const defaultTitle = "Anonymous Dating Review";
    const defaultMessage = this.createShareMessage(review);
    const defaultUrl = "https://lockerroomtalk.app"; // Replace with actual app URL
    const defaultDialogTitle = "Share Review";

    return {
      title: options.title || defaultTitle,
      message: options.message || defaultMessage,
      url: options.url || defaultUrl,
      dialogTitle: options.dialogTitle || defaultDialogTitle,
    };
  }

  /**
   * Create a shareable message from review data
   */
  private createShareMessage(review: Review): string {
    const location = `${review.reviewedPersonLocation.city}, ${review.reviewedPersonLocation.state}`;
    const sentiment = review.sentiment === "positive" ? "🟢" : review.sentiment === "negative" ? "🔴" : "⚪";

    // Truncate review text for sharing
    const maxLength = 200;
    const reviewText =
      review.reviewText.length > maxLength ? review.reviewText.substring(0, maxLength) + "..." : review.reviewText;

    return `${sentiment} Anonymous dating review about ${review.reviewedPersonName} in ${location}:

"${reviewText}"

Read more anonymous dating reviews on Locker Room Talk 📱
#DatingReviews #Anonymous #Dating`;
  }

  /**
   * Show share options modal
   */
  showShareOptions(review: Review): void {
    Alert.alert("Share Review", "Choose how you want to share this review", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Copy Link",
        onPress: () => this.copyToClipboard(this.generateShareContent(review).url),
      },
      {
        text: "Twitter",
        onPress: () => this.shareToTwitter(review),
      },
      {
        text: "WhatsApp",
        onPress: () => this.shareToWhatsApp(review),
      },
      {
        text: "More Options",
        onPress: () => this.shareReview(review),
      },
    ]);
  }

  /**
   * Generate app download link for sharing
   */
  getAppDownloadLink(): string {
    // Replace with actual app store links
    return "https://lockerroomtalk.app/download";
  }

  /**
   * Share app invitation
   */
  async shareAppInvitation(): Promise<boolean> {
    const message = `Check out Locker Room Talk - the anonymous dating review app! 

Share and discover honest dating experiences while staying completely anonymous. 

Download now: ${this.getAppDownloadLink()}

#DatingApp #Anonymous #Reviews`;

    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync("", {
          dialogTitle: "Invite Friends to Locker Room Talk",
        });
        return true;
      } else {
        await this.copyToClipboard(message);
        Alert.alert("Invitation Ready", "App invitation copied to clipboard!", [{ text: "OK" }]);
        return true;
      }
    } catch (error) {
      console.error("App invitation share failed:", error);
      return false;
    }
  }
}

export const socialSharingService = new SocialSharingService();
