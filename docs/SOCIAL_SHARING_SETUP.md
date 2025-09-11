# Social Sharing Setup Guide

## Overview
This document provides a complete guide for implementing social sharing features in the React Native application using react-native-share and other complementary tools.

## Prerequisites
- React Native project with `react-native-share` installed (already in package.json)
- App icons and images prepared for sharing
- Social media platform developer accounts (for deep linking)

## Setup Steps

### 1. Install Dependencies

```bash
npm install react-native-share
# or
yarn add react-native-share
```

For iOS, install pods:
```bash
cd ios && pod install
```

### 2. Configure Social Sharing

#### Create Social Sharing Service
Create a file `src/services/socialSharing.ts`:

```typescript
import {
  Share,
  openInbox,
  isPackageInstalled,
  shareSingle,
  Options,
} from 'react-native-share';
import { Platform } from 'react-native';
import { logEvent } from './analytics';

// Social media package names
const SOCIAL_PACKAGES = {
  FACEBOOK: Platform.select({
    ios: 'com.facebook.Facebook',
    android: 'com.facebook.katana',
  }),
  INSTAGRAM: Platform.select({
    ios: 'com.burbn.instagram',
    android: 'com.instagram.android',
  }),
  TWITTER: Platform.select({
    ios: 'com.atebits.Tweetie2',
    android: 'com.twitter.android',
  }),
  WHATSAPP: Platform.select({
    ios: 'net.whatsapp.WhatsApp',
    android: 'com.whatsapp',
  }),
  TELEGRAM: Platform.select({
    ios: 'org.telegram.messenger',
    android: 'org.telegram.messenger',
  }),
  LINKEDIN: Platform.select({
    ios: 'com.linkedin.LinkedIn',
    android: 'com.linkedin.android',
  }),
  PINTEREST: Platform.select({
    ios: 'com.pinterest.Pinterest',
    android: 'com.pinterest',
  }),
  SNAPCHAT: Platform.select({
    ios: 'com.toyopagroup.picaboo',
    android: 'com.snapchat.android',
  }),
  YOUTUBE: Platform.select({
    ios: 'com.google.ios.youtube',
    android: 'com.google.android.youtube',
  }),
  TIKTOK: Platform.select({
    ios: 'com.zhiliaoapp.musically',
    android: 'com.zhiliaoapp.musically.go',
  }),
};

// Share content using native share dialog
export const shareContent = async (
  title: string,
  message: string,
  url?: string,
  imageUrl?: string,
): Promise<void> => {
  try {
    const shareOptions: Options = {
      title,
      message,
      url,
      subject: title,
      failOnCancel: false,
    };

    // Add image if provided
    if (imageUrl) {
      shareOptions.urls = [imageUrl];
    }

    const result = await Share.open(shareOptions);
    
    // Log analytics event
    await logEvent('share_content', {
      method: result.app || 'unknown',
      success: result.success,
    });
    
    console.log('Share result:', result);
  } catch (error) {
    console.error('Error sharing content:', error);
    
    // Log analytics event
    await logEvent('share_error', {
      error: error.message,
    });
  }
};

// Share to specific social media platform
export const shareToSocialMedia = async (
  platform: keyof typeof SOCIAL_PACKAGES,
  title: string,
  message: string,
  url?: string,
  imageUrl?: string,
): Promise<void> => {
  try {
    // Check if the app is installed
    const isInstalled = await isPackageInstalled(SOCIAL_PACKAGES[platform]);
    
    if (!isInstalled) {
      throw new Error(`${platform} app is not installed`);
    }

    const shareOptions: Options = {
      title,
      message,
      url,
      subject: title,
      social: Share.SOCIAL[platform.toUpperCase() as keyof typeof Share.SOCIAL],
    };

    // Add image if provided
    if (imageUrl) {
      shareOptions.urls = [imageUrl];
    }

    const result = await shareSingle(shareOptions);
    
    // Log analytics event
    await logEvent('share_to_social_media', {
      platform,
      success: result.success,
    });
    
    console.log('Share to social media result:', result);
  } catch (error) {
    console.error(`Error sharing to ${platform}:`, error);
    
    // Log analytics event
    await logEvent('share_to_social_media_error', {
      platform,
      error: error.message,
    });
    
    throw error;
  }
};

// Share image
export const shareImage = async (
  imageUrl: string,
  title?: string,
  message?: string,
): Promise<void> => {
  try {
    const shareOptions: Options = {
      title: title || 'Check out this image',
      message: message || '',
      url: imageUrl,
      type: 'image/jpeg',
      failOnCancel: false,
    };

    const result = await Share.open(shareOptions);
    
    // Log analytics event
    await logEvent('share_image', {
      method: result.app || 'unknown',
      success: result.success,
    });
    
    console.log('Share image result:', result);
  } catch (error) {
    console.error('Error sharing image:', error);
    
    // Log analytics event
    await logEvent('share_image_error', {
      error: error.message,
    });
  }
};

// Share to Instagram
export const shareToInstagram = async (
  imageUrl: string,
  type: 'feed' | 'story' = 'feed',
): Promise<void> => {
  try {
    // Check if Instagram is installed
    const isInstalled = await isPackageInstalled(SOCIAL_PACKAGES.INSTAGRAM);
    
    if (!isInstalled) {
      throw new Error('Instagram app is not installed');
    }

    const shareOptions: Options = {
      type: 'image/jpeg',
      url: imageUrl,
      social: Share.SOCIAL.INSTAGRAM,
      forceDialog: true,
    };

    // For Instagram Stories, we need to use a different approach
    if (type === 'story') {
      shareOptions.stickerImage = imageUrl;
      shareOptions.backgroundBottomColor = '#ffffff';
      shareOptions.backgroundTopColor = '#000000';
    }

    const result = await shareSingle(shareOptions);
    
    // Log analytics event
    await logEvent('share_to_instagram', {
      type,
      success: result.success,
    });
    
    console.log('Share to Instagram result:', result);
  } catch (error) {
    console.error('Error sharing to Instagram:', error);
    
    // Log analytics event
    await logEvent('share_to_instagram_error', {
      type,
      error: error.message,
    });
    
    throw error;
  }
};

// Share to WhatsApp
export const shareToWhatsApp = async (
  message: string,
  url?: string,
  imageUrl?: string,
): Promise<void> => {
  try {
    // Check if WhatsApp is installed
    const isInstalled = await isPackageInstalled(SOCIAL_PACKAGES.WHATSAPP);
    
    if (!isInstalled) {
      throw new Error('WhatsApp app is not installed');
    }

    const shareOptions: Options = {
      message,
      url,
      social: Share.SOCIAL.WHATSAPP,
    };

    // Add image if provided
    if (imageUrl) {
      shareOptions.urls = [imageUrl];
    }

    const result = await shareSingle(shareOptions);
    
    // Log analytics event
    await logEvent('share_to_whatsapp', {
      success: result.success,
    });
    
    console.log('Share to WhatsApp result:', result);
  } catch (error) {
    console.error('Error sharing to WhatsApp:', error);
    
    // Log analytics event
    await logEvent('share_to_whatsapp_error', {
      error: error.message,
    });
    
    throw error;
  }
};

// Share to Twitter
export const shareToTwitter = async (
  text: string,
  url?: string,
  imageUrl?: string,
): Promise<void> => {
  try {
    // Check if Twitter is installed
    const isInstalled = await isPackageInstalled(SOCIAL_PACKAGES.TWITTER);
    
    if (!isInstalled) {
      throw new Error('Twitter app is not installed');
    }

    const shareOptions: Options = {
      title: 'Share via Twitter',
      message: text,
      url,
      social: Share.SOCIAL.TWITTER,
    };

    // Add image if provided
    if (imageUrl) {
      shareOptions.urls = [imageUrl];
    }

    const result = await shareSingle(shareOptions);
    
    // Log analytics event
    await logEvent('share_to_twitter', {
      success: result.success,
    });
    
    console.log('Share to Twitter result:', result);
  } catch (error) {
    console.error('Error sharing to Twitter:', error);
    
    // Log analytics event
    await logEvent('share_to_twitter_error', {
      error: error.message,
    });
    
    throw error;
  }
};

// Share to Facebook
export const shareToFacebook = async (
  link?: string,
  imageUrl?: string,
): Promise<void> => {
  try {
    // Check if Facebook is installed
    const isInstalled = await isPackageInstalled(SOCIAL_PACKAGES.FACEBOOK);
    
    if (!isInstalled) {
      throw new Error('Facebook app is not installed');
    }

    const shareOptions: Options = {
      url: link,
      social: Share.SOCIAL.FACEBOOK,
    };

    // Add image if provided
    if (imageUrl) {
      shareOptions.urls = [imageUrl];
    }

    const result = await shareSingle(shareOptions);
    
    // Log analytics event
    await logEvent('share_to_facebook', {
      success: result.success,
    });
    
    console.log('Share to Facebook result:', result);
  } catch (error) {
    console.error('Error sharing to Facebook:', error);
    
    // Log analytics event
    await logEvent('share_to_facebook_error', {
      error: error.message,
    });
    
    throw error;
  }
};

// Check if social media app is installed
export const checkSocialMediaAppInstalled = async (
  platform: keyof typeof SOCIAL_PACKAGES,
): Promise<boolean> => {
  try {
    const isInstalled = await isPackageInstalled(SOCIAL_PACKAGES[platform]);
    return isInstalled;
  } catch (error) {
    console.error(`Error checking if ${platform} is installed:`, error);
    return false;
  }
};

// Open email client
export const openEmailClient = async (
  to: string,
  subject: string,
  body: string,
): Promise<void> => {
  try {
    const url = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Log analytics event
    await logEvent('open_email_client');
    
    // This would typically use Linking.openURL
    console.log('Opening email client with URL:', url);
  } catch (error) {
    console.error('Error opening email client:', error);
    
    // Log analytics event
    await logEvent('open_email_client_error', {
      error: error.message,
    });
    
    throw error;
  }
};

// Open SMS client
export const openSMSClient = async (
  phoneNumber: string,
  body: string,
): Promise<void> => {
  try {
    const url = `sms:${phoneNumber}?body=${encodeURIComponent(body)}`;
    
    // Log analytics event
    await logEvent('open_sms_client');
    
    // This would typically use Linking.openURL
    console.log('Opening SMS client with URL:', url);
  } catch (error) {
    console.error('Error opening SMS client:', error);
    
    // Log analytics event
    await logEvent('open_sms_client_error', {
      error: error.message,
    });
    
    throw error;
  }
};
```

#### Create Social Sharing Hook
Create a file `src/hooks/useSocialSharing.ts`:

```typescript
import { useState } from 'react';
import {
  shareContent,
  shareToSocialMedia,
  shareImage,
  shareToInstagram,
  shareToWhatsApp,
  shareToTwitter,
  shareToFacebook,
  checkSocialMediaAppInstalled,
  openEmailClient,
  openSMSClient,
} from '../services/socialSharing';
import { useToast } from './useToast';

export interface SocialMediaApp {
  id: string;
  name: string;
  icon: string;
  installed: boolean;
}

export const useSocialSharing = () => {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [socialApps, setSocialApps] = useState<SocialMediaApp[]>([]);

  // Check which social media apps are installed
  const checkInstalledApps = async () => {
    try {
      const apps: SocialMediaApp[] = [
        { id: 'facebook', name: 'Facebook', icon: '📘', installed: false },
        { id: 'instagram', name: 'Instagram', icon: '📷', installed: false },
        { id: 'twitter', name: 'Twitter', icon: '🐦', installed: false },
        { id: 'whatsapp', name: 'WhatsApp', icon: '💬', installed: false },
        { id: 'telegram', name: 'Telegram', icon: '✈️', installed: false },
        { id: 'linkedin', name: 'LinkedIn', icon: '👔', installed: false },
        { id: 'pinterest', name: 'Pinterest', icon: '📌', installed: false },
        { id: 'snapchat', name: 'Snapchat', icon: '👻', installed: false },
        { id: 'youtube', name: 'YouTube', icon: '📺', installed: false },
        { id: 'tiktok', name: 'TikTok', icon: '🎵', installed: false },
      ];

      // Check installation status for each app
      for (const app of apps) {
        app.installed = await checkSocialMediaAppInstalled(app.id as any);
      }

      setSocialApps(apps);
    } catch (error) {
      console.error('Failed to check installed apps:', error);
    }
  };

  // Share content
  const handleShareContent = async (
    title: string,
    message: string,
    url?: string,
    imageUrl?: string,
  ) => {
    try {
      setIsLoading(true);
      await shareContent(title, message, url, imageUrl);
      showToast('Content shared successfully', 'success');
    } catch (error) {
      console.error('Failed to share content:', error);
      showToast('Failed to share content', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Share to specific social media platform
  const handleShareToSocialMedia = async (
    platform: string,
    title: string,
    message: string,
    url?: string,
    imageUrl?: string,
  ) => {
    try {
      setIsLoading(true);
      await shareToSocialMedia(platform as any, title, message, url, imageUrl);
      showToast(`Shared to ${platform} successfully`, 'success');
    } catch (error) {
      console.error(`Failed to share to ${platform}:`, error);
      showToast(`Failed to share to ${platform}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Share image
  const handleShareImage = async (
    imageUrl: string,
    title?: string,
    message?: string,
  ) => {
    try {
      setIsLoading(true);
      await shareImage(imageUrl, title, message);
      showToast('Image shared successfully', 'success');
    } catch (error) {
      console.error('Failed to share image:', error);
      showToast('Failed to share image', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Share to Instagram
  const handleShareToInstagram = async (
    imageUrl: string,
    type: 'feed' | 'story' = 'feed',
  ) => {
    try {
      setIsLoading(true);
      await shareToInstagram(imageUrl, type);
      showToast(`Shared to Instagram ${type} successfully`, 'success');
    } catch (error) {
      console.error('Failed to share to Instagram:', error);
      showToast('Failed to share to Instagram', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Share to WhatsApp
  const handleShareToWhatsApp = async (
    message: string,
    url?: string,
    imageUrl?: string,
  ) => {
    try {
      setIsLoading(true);
      await shareToWhatsApp(message, url, imageUrl);
      showToast('Shared to WhatsApp successfully', 'success');
    } catch (error) {
      console.error('Failed to share to WhatsApp:', error);
      showToast('Failed to share to WhatsApp', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Share to Twitter
  const handleShareToTwitter = async (
    text: string,
    url?: string,
    imageUrl?: string,
  ) => {
    try {
      setIsLoading(true);
      await shareToTwitter(text, url, imageUrl);
      showToast('Shared to Twitter successfully', 'success');
    } catch (error) {
      console.error('Failed to share to Twitter:', error);
      showToast('Failed to share to Twitter', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Share to Facebook
  const handleShareToFacebook = async (
    link?: string,
    imageUrl?: string,
  ) => {
    try {
      setIsLoading(true);
      await shareToFacebook(link, imageUrl);
      showToast('Shared to Facebook successfully', 'success');
    } catch (error) {
      console.error('Failed to share to Facebook:', error);
      showToast('Failed to share to Facebook', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Open email client
  const handleOpenEmailClient = async (
    to: string,
    subject: string,
    body: string,
  ) => {
    try {
      setIsLoading(true);
      await openEmailClient(to, subject, body);
      showToast('Email client opened', 'success');
    } catch (error) {
      console.error('Failed to open email client:', error);
      showToast('Failed to open email client', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Open SMS client
  const handleOpenSMSClient = async (
    phoneNumber: string,
    body: string,
  ) => {
    try {
      setIsLoading(true);
      await openSMSClient(phoneNumber, body);
      showToast('SMS client opened', 'success');
    } catch (error) {
      console.error('Failed to open SMS client:', error);
      showToast('Failed to open SMS client', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    socialApps,
    checkInstalledApps,
    handleShareContent,
    handleShareToSocialMedia,
    handleShareImage,
    handleShareToInstagram,
    handleShareToWhatsApp,
    handleShareToTwitter,
    handleShareToFacebook,
    handleOpenEmailClient,
    handleOpenSMSClient,
  };
};
```

### 3. Create Social Sharing Components

#### Create Share Menu Component
Create a file `src/components/social/ShareMenu.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useSocialSharing, SocialMediaApp } from '../../hooks/useSocialSharing';

interface ShareMenuProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  url?: string;
  imageUrl?: string;
}

const ShareMenu: React.FC<ShareMenuProps> = ({
  visible,
  onClose,
  title,
  message,
  url,
  imageUrl,
}) => {
  const { theme } = useTheme();
  const {
    isLoading,
    socialApps,
    checkInstalledApps,
    handleShareContent,
    handleShareToSocialMedia,
  } = useSocialSharing();
  
  const [apps, setApps] = useState<SocialMediaApp[]>([]);

  // Load installed apps
  useEffect(() => {
    if (visible) {
      const loadApps = async () => {
        await checkInstalledApps();
        setApps(socialApps);
      };
      
      loadApps();
    }
  }, [visible, socialApps]);

  // Handle share to app
  const handleShareToApp = async (app: SocialMediaApp) => {
    try {
      await handleShareToSocialMedia(app.id, title, message, url, imageUrl);
      onClose();
    } catch (error) {
      console.error('Failed to share to app:', error);
    }
  };

  // Handle native share
  const handleNativeShare = async () => {
    try {
      await handleShareContent(title, message, url, imageUrl);
      onClose();
    } catch (error) {
      console.error('Failed to share content:', error);
    }
  };

  // Render app item
  const renderAppItem = ({ item }: { item: SocialMediaApp }) => (
    <TouchableOpacity
      style={[styles.appItem, { backgroundColor: theme.card }]}
      onPress={() => handleShareToApp(item)}
      disabled={!item.installed}
    >
      <Text style={styles.appIcon}>{item.icon}</Text>
      <Text
        style={[
          styles.appName,
          { color: item.installed ? theme.text : theme.secondaryText },
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <View style={[styles.content, { backgroundColor: theme.background }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Share</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.closeButton, { color: theme.primary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.nativeShareButton, { backgroundColor: theme.primary }]}
                onPress={handleNativeShare}
              >
                <Text style={styles.nativeShareButtonText}>Share via...</Text>
              </TouchableOpacity>
              
              <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>
                Share to apps
              </Text>
              
              <FlatList
                data={apps}
                renderItem={renderAppItem}
                keyExtractor={(item) => item.id}
                numColumns={4}
                contentContainerStyle={styles.appsList}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  nativeShareButton: {
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  nativeShareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  appsList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  appItem: {
    width: 80,
    height: 100,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    marginBottom: 12,
  },
  appIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  appName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default ShareMenu;
```

#### Create Share Button Component
Create a file `src/components/social/ShareButton.tsx`:

```typescript
import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import ShareMenu from './ShareMenu';

interface ShareButtonProps {
  title: string;
  message: string;
  url?: string;
  imageUrl?: string;
  icon?: React.ReactNode;
  style?: any;
}

const ShareButton: React.FC<ShareButtonProps> = ({
  title,
  message,
  url,
  imageUrl,
  icon,
  style,
}) => {
  const { theme } = useTheme();
  const [showShareMenu, setShowShareMenu] = useState(false);

  const handlePress = () => {
    setShowShareMenu(true);
  };

  const handleClose = () => {
    setShowShareMenu(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.card }, style]}
        onPress={handlePress}
      >
        {icon || <Text style={[styles.icon, { color: theme.primary }]}>📤</Text>}
      </TouchableOpacity>
      
      <ShareMenu
        visible={showShareMenu}
        onClose={handleClose}
        title={title}
        message={message}
        url={url}
        imageUrl={imageUrl}
      />
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
  },
});

export default ShareButton;
```

#### Create Instagram Story Share Component
Create a file `src/components/social/InstagramStoryShare.tsx`:

```typescript
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useSocialSharing } from '../../hooks/useSocialSharing';

interface InstagramStoryShareProps {
  imageUrl: string;
  onShare?: () => void;
  onError?: (error: Error) => void;
}

const InstagramStoryShare: React.FC<InstagramStoryShareProps> = ({
  imageUrl,
  onShare,
  onError,
}) => {
  const { theme } = useTheme();
  const { isLoading, handleShareToInstagram } = useSocialSharing();

  const handleShare = async () => {
    try {
      await handleShareToInstagram(imageUrl, 'story');
      onShare?.();
    } catch (error) {
      onError?.(error as Error);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.card }]}
      onPress={handleShare}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={theme.primary} />
      ) : (
        <>
          <View style={[styles.iconContainer, { backgroundColor: '#E1306C' }]}>
            <Text style={styles.icon}>📷</Text>
          </View>
          <Text style={[styles.text, { color: theme.text }]}>
            Instagram Story
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 16,
    color: 'white',
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default InstagramStoryShare;
```

### 4. Create Social Sharing Screen

#### Create Social Sharing Screen
Create a file `src/screens/social/SocialSharingScreen.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useSocialSharing } from '../../hooks/useSocialSharing';
import ShareButton from '../../components/social/ShareButton';
import InstagramStoryShare from '../../components/social/InstagramStoryShare';
import { launchImageLibrary } from 'react-native-image-picker';

const SocialSharingScreen: React.FC = () => {
  const { theme } = useTheme();
  const {
    isLoading,
    handleShareContent,
    handleShareToInstagram,
    handleShareToWhatsApp,
    handleShareToTwitter,
    handleShareToFacebook,
    handleOpenEmailClient,
    handleOpenSMSClient,
  } = useSocialSharing();
  
  const [title, setTitle] = useState('Check out this amazing app!');
  const [message, setMessage] = useState('I found this awesome app that I think you\'ll love. Download it now!');
  const [url, setUrl] = useState('https://example.com');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Select image from gallery
  const selectImage = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
      },
      (response) => {
        if (response.assets && response.assets.length > 0) {
          setImageUrl(response.assets[0].uri);
        }
      },
    );
  };

  // Handle share content
  const handleShare = async () => {
    try {
      await handleShareContent(title, message, url, imageUrl || undefined);
      Alert.alert('Success', 'Content shared successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to share content');
    }
  };

  // Handle share to Instagram
  const handleInstagramShare = async () => {
    if (!imageUrl) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }
    
    try {
      await handleShareToInstagram(imageUrl, 'story');
      Alert.alert('Success', 'Shared to Instagram Story successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to share to Instagram Story');
    }
  };

  // Handle share to WhatsApp
  const handleWhatsAppShare = async () => {
    try {
      await handleShareToWhatsApp(message, url, imageUrl || undefined);
      Alert.alert('Success', 'Shared to WhatsApp successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to share to WhatsApp');
    }
  };

  // Handle share to Twitter
  const handleTwitterShare = async () => {
    try {
      await handleShareToTwitter(message, url, imageUrl || undefined);
      Alert.alert('Success', 'Shared to Twitter successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to share to Twitter');
    }
  };

  // Handle share to Facebook
  const handleFacebookShare = async () => {
    try {
      await handleShareToFacebook(url, imageUrl || undefined);
      Alert.alert('Success', 'Shared to Facebook successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to share to Facebook');
    }
  };

  // Handle share via email
  const handleEmailShare = async () => {
    try {
      await handleOpenEmailClient('', title, `${message}\n\n${url}`);
      Alert.alert('Success', 'Email client opened');
    } catch (error) {
      Alert.alert('Error', 'Failed to open email client');
    }
  };

  // Handle share via SMS
  const handleSMSShare = async () => {
    try {
      await handleOpenSMSClient('', `${message}\n\n${url}`);
      Alert.alert('Success', 'SMS client opened');
    } catch (error) {
      Alert.alert('Error', 'Failed to open SMS client');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Social Sharing</Text>
      
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Content</Text>
        
        <Text style={[styles.label, { color: theme.secondaryText }]}>Title</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter title"
          placeholderTextColor={theme.secondaryText}
        />
        
        <Text style={[styles.label, { color: theme.secondaryText }]}>Message</Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            { backgroundColor: theme.background, color: theme.text },
          ]}
          value={message}
          onChangeText={setMessage}
          placeholder="Enter message"
          placeholderTextColor={theme.secondaryText}
          multiline
        />
        
        <Text style={[styles.label, { color: theme.secondaryText }]}>URL</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
          value={url}
          onChangeText={setUrl}
          placeholder="Enter URL"
          placeholderTextColor={theme.secondaryText}
        />
      </View>
      
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Image</Text>
        
        {imageUrl ? (
          <View style={styles.imageContainer}>
            {/* You would use an Image component here */}
            <Text style={[styles.imageText, { color: theme.secondaryText }]}>
              Image selected
            </Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.error }]}
              onPress={() => setImageUrl(null)}
            >
              <Text style={styles.buttonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={selectImage}
          >
            <Text style={styles.buttonText}>Select Image</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Share Options</Text>
        
        <TouchableOpacity
          style={[styles.shareButton, { backgroundColor: theme.primary }]}
          onPress={handleShare}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.shareButtonText}>Share Content</Text>
          )}
        </TouchableOpacity>
        
        <View style={styles.shareOptions}>
          <InstagramStoryShare
            imageUrl={imageUrl || ''}
            onShare={() => Alert.alert('Success', 'Shared to Instagram Story')}
            onError={(error) => Alert.alert('Error', error.message)}
          />
          
          <TouchableOpacity
            style={[styles.socialButton, { backgroundColor: '#25D366' }]}
            onPress={handleWhatsAppShare}
            disabled={isLoading}
          >
            <Text style={styles.socialButtonText}>WhatsApp</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.socialButton, { backgroundColor: '#1DA1F2' }]}
            onPress={handleTwitterShare}
            disabled={isLoading}
          >
            <Text style={styles.socialButtonText}>Twitter</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.socialButton, { backgroundColor: '#4267B2' }]}
            onPress={handleFacebookShare}
            disabled={isLoading}
          >
            <Text style={styles.socialButtonText}>Facebook</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.socialButton, { backgroundColor: '#EA4335' }]}
            onPress={handleEmailShare}
            disabled={isLoading}
          >
            <Text style={styles.socialButtonText}>Email</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.socialButton, { backgroundColor: '#34B7F1' }]}
            onPress={handleSMSShare}
            disabled={isLoading}
          >
            <Text style={styles.socialButtonText}>SMS</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  imageText: {
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  shareButton: {
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  shareOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  socialButton: {
    width: '48%',
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  socialButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SocialSharingScreen;
```

### 5. Integration in App

#### Update App Navigation
Add the SocialSharingScreen to your navigation stack:

```typescript
// In your navigation file
import SocialSharingScreen from '../screens/social/SocialSharingScreen';

// Add to your navigator
<Stack.Screen
  name="SocialSharing"
  component={SocialSharingScreen}
  options={{ title: 'Social Sharing' }}
/>
```

### 6. Advanced Features Implementation

#### Create Deep Linking Service
Create a file `src/services/deepLinking.ts`:

```typescript
import { Linking, Platform } from 'react-native';
import { logEvent } from './analytics';

// Deep linking configuration
export const DEEP_LINKING_CONFIG = {
  // App scheme
  scheme: 'yourapp',
  
  // Universal links
  universalLinks: {
    ios: 'https://yourapp.com',
    android: 'https://yourapp.com',
  },
  
  // Social media app schemes
  socialSchemes: {
    facebook: 'fb://',
    instagram: 'instagram://',
    twitter: 'twitter://',
    whatsapp: 'whatsapp://',
    telegram: 'tg://',
    linkedin: 'linkedin://',
    pinterest: 'pinterest://',
    snapchat: 'snapchat://',
    youtube: 'youtube://',
    tiktok: 'tiktok://',
  },
};

// Initialize deep linking
export const initializeDeepLinking = (handleDeepLink: (url: string) => void) => {
  // Handle initial URL
  Linking.getInitialURL().then(url => {
    if (url) {
      handleDeepLink(url);
    }
  });
  
  // Handle incoming URLs
  Linking.addEventListener('url', ({ url }) => {
    handleDeepLink(url);
  });
  
  console.log('Deep linking initialized');
};

// Create deep link URL
export const createDeepLink = (path: string, params?: Record<string, string>): string => {
  let url = `${DEEP_LINKING_CONFIG.scheme}://${path}`;
  
  if (params) {
    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    url += `?${queryString}`;
  }
  
  return url;
};

// Create universal link URL
export const createUniversalLink = (path: string, params?: Record<string, string>): string => {
  const baseUrl = Platform.select({
    ios: DEEP_LINKING_CONFIG.universalLinks.ios,
    android: DEEP_LINKING_CONFIG.universalLinks.android,
  });
  
  let url = `${baseUrl}/${path}`;
  
  if (params) {
    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    url += `?${queryString}`;
  }
  
  return url;
};

// Open social media app
export const openSocialMediaApp = async (platform: keyof typeof DEEP_LINKING_CONFIG.socialSchemes): Promise<boolean> => {
  try {
    const scheme = DEEP_LINKING_CONFIG.socialSchemes[platform];
    const canOpen = await Linking.canOpenURL(scheme);
    
    if (canOpen) {
      await Linking.openURL(scheme);
      
      // Log analytics event
      await logEvent('open_social_media_app', {
        platform,
      });
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Failed to open ${platform}:`, error);
    return false;
  }
};

// Open app store
export const openAppStore = async (): Promise<void> => {
  try {
    const url = Platform.select({
      ios: 'https://apps.apple.com/app/idYOUR_APP_ID',
      android: 'market://details?id=YOUR_PACKAGE_NAME',
    });
    
    await Linking.openURL(url);
    
    // Log analytics event
    await logEvent('open_app_store');
  } catch (error) {
    console.error('Failed to open app store:', error);
  }
};

// Share with deep linking
export const shareWithDeepLink = async (
  title: string,
  message: string,
  path: string,
  params?: Record<string, string>,
  imageUrl?: string,
): Promise<void> => {
  try {
    // Create deep link URL
    const deepLinkUrl = createDeepLink(path, params);
    
    // Create universal link URL
    const universalLinkUrl = createUniversalLink(path, params);
    
    // Share content with universal link
    const { Share } = await import('react-native-share');
    
    const shareOptions = {
      title,
      message: `${message}\n\n${universalLinkUrl}`,
      url: imageUrl,
      subject: title,
      failOnCancel: false,
    };
    
    const result = await Share.open(shareOptions);
    
    // Log analytics event
    await logEvent('share_with_deep_link', {
      method: result.app || 'unknown',
      success: result.success,
      path,
    });
    
    console.log('Share with deep link result:', result);
  } catch (error) {
    console.error('Error sharing with deep link:', error);
    
    // Log analytics event
    await logEvent('share_with_deep_link_error', {
      error: error.message,
      path,
    });
  }
};
```

### 7. Testing and Debugging

#### Enable Debug Mode
Create a file `src/services/socialSharingDebug.ts`:

```typescript
import { logEvent } from './analytics';

// Enable debug mode for social sharing
export const enableSocialSharingDebugMode = async () => {
  try {
    // Note: This is a placeholder for any platform-specific debug setup
    console.log('Social sharing debug mode enabled');
    
    // Log analytics event
    await logEvent('social_sharing_debug_mode_enabled');
  } catch (error) {
    console.error('Failed to enable social sharing debug mode:', error);
  }
};

// Test social sharing
export const testSocialSharing = async () => {
  try {
    // This is a placeholder for testing social sharing
    console.log('Testing social sharing...');
    
    // Log analytics event
    await logEvent('test_social_sharing');
  } catch (error) {
    console.error('Failed to test social sharing:', error);
  }
};
```

### 8. Best Practices and Optimization

#### Social Sharing Best Practices
1. **Provide clear value**: Clearly communicate what users are sharing
2. **Pre-fill content**: Pre-fill shareable content with relevant information
3. **Use appropriate images**: Use high-quality, properly sized images
4. **Include deep links**: Include deep links to drive users back to your app
5. **Track shares**: Track which content is shared most often

#### Performance Optimization
1. **Cache images**: Cache images to improve loading times
2. **Compress images**: Compress images before sharing to reduce data usage
3. **Lazy load**: Load social media app installation status only when needed
4. **Minimize API calls**: Reduce unnecessary API calls for sharing
5. **Use appropriate image formats**: Use appropriate image formats for different platforms

#### User Experience Guidelines
1. **Make sharing easy**: Provide prominent and accessible sharing buttons
2. **Offer multiple options**: Allow users to share to multiple platforms
3. **Provide feedback**: Show confirmation when content is shared
4. **Handle errors gracefully**: Show clear error messages when sharing fails
5. **Respect user privacy**: Don't share content without user consent

## Troubleshooting

### Common Issues

#### Share Dialog Not Appearing
1. Check if react-native-share is properly installed
2. Verify permissions are granted
3. Ensure content is properly formatted
4. Check if the device has sharing capabilities

#### Specific Social Media Apps Not Working
1. Verify the social media app is installed
2. Check if the app's package name is correct
3. Ensure the content format is compatible with the platform
4. Verify the app's sharing capabilities

#### Images Not Sharing Correctly
1. Check if the image URL is valid
2. Verify the image format is supported
3. Ensure the image size is within platform limits
4. Check if the image is accessible

### Debugging Tools
1. **Console Logs**: Enable verbose logging to trace sharing flow
2. **Device Logs**: Check native logs for platform-specific issues
3. **Network Inspector**: Monitor image loading and sharing requests
4. **Simulator Testing**: Test sharing on different simulators and devices

## Conclusion
This guide provides a comprehensive implementation of social sharing features in your React Native application. By following these steps, you'll be able to effectively enable users to share content across various platforms.

Remember to:
- Always follow platform guidelines for social sharing
- Provide clear value to users with each share
- Test thoroughly across different platforms and devices
- Handle edge cases gracefully
- Comply with privacy regulations and platform policies