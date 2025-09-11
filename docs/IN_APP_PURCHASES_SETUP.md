# In-App Purchases Setup Guide

## Overview
This document provides a complete guide for implementing in-app purchases (IAP) in the React Native application using react-native-iap for both iOS and Android platforms.

## Prerequisites
- React Native project with react-native-iap installed
- Apple Developer account with App Store Connect configured
- Google Play Developer account with Google Play Console configured
- Products configured in both App Store Connect and Google Play Console

## Setup Steps

### 1. Install Dependencies

```bash
# Install react-native-iap
npm install react-native-iap
# or
yarn add react-native-iap

# For iOS, install pods
cd ios && pod install
```

### 2. Configure Platforms

#### iOS Configuration
1. Enable In-App Purchase capability in Xcode:
   - Open your iOS project in Xcode
   - Select your project in the Project Navigator
   - Select your app target
   - Go to "Signing & Capabilities"
   - Click "+ Capability"
   - Add "In-App Purchase"

2. Configure products in App Store Connect:
   - Go to App Store Connect
   - Select your app
   - Go to "In-App Purchases"
   - Create your products (consumable, non-consumable, auto-renewable subscription, or non-renewing subscription)

#### Android Configuration
1. Add billing permission to your `AndroidManifest.xml`:
```xml
<uses-permission android:name="com.android.vending.BILLING" />
```

2. Configure products in Google Play Console:
   - Go to Google Play Console
   - Select your app
   - Go to "Store" > "In-app products"
   - Create your products (managed products or subscriptions)

### 3. Create In-App Purchase Service

#### Create IAP Service
Create a file `src/services/inAppPurchases.ts`:

```typescript
import {
  initConnection,
  endConnection,
  getProducts,
  getSubscriptions,
  getAvailablePurchases,
  requestPurchase,
  requestSubscription,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  ProductPurchase,
  SubscriptionPurchase,
  Product,
  Subscription,
} from 'react-native-iap';
import { Platform, Alert } from 'react-native';
import { logEvent } from './analytics';

// Product IDs - configure these based on your App Store Connect and Google Play Console
export const PRODUCT_IDS = {
  // Consumable products
  COINS_SMALL: 'coins_small',
  COINS_MEDIUM: 'coins_medium',
  COINS_LARGE: 'coins_large',
  
  // Non-consumable products
  PREMIUM_FEATURE: 'premium_feature',
  REMOVE_ADS: 'remove_ads',
  
  // Subscriptions
  MONTHLY_SUBSCRIPTION: 'monthly_subscription',
  YEARLY_SUBSCRIPTION: 'yearly_subscription',
};

// Subscription group IDs (iOS only)
export const SUBSCRIPTION_GROUP_IDS = {
  PREMIUM: 'premium_subscription_group',
};

// Initialize IAP connection
export const initIAPConnection = async (): Promise<void> => {
  try {
    await initConnection();
    
    // Log analytics event
    await logEvent('iap_connection_initialized', {
      platform: Platform.OS,
    });
    
    console.log('IAP connection initialized');
  } catch (error) {
    console.error('Failed to initialize IAP connection:', error);
    
    // Log analytics event
    await logEvent('iap_connection_initialization_error', {
      error: error.message,
      platform: Platform.OS,
    });
    
    throw error;
  }
};

// End IAP connection
export const endIAPConnection = async (): Promise<void> => {
  try {
    await endConnection();
    
    // Log analytics event
    await logEvent('iap_connection_ended', {
      platform: Platform.OS,
    });
    
    console.log('IAP connection ended');
  } catch (error) {
    console.error('Failed to end IAP connection:', error);
    
    // Log analytics event
    await logEvent('iap_connection_ending_error', {
      error: error.message,
      platform: Platform.OS,
    });
    
    throw error;
  }
};

// Get products
export const getIAPProducts = async (skus: string[] = Object.values(PRODUCT_IDS)): Promise<Product[]> => {
  try {
    const products = await getProducts({ skus });
    
    // Log analytics event
    await logEvent('iap_products_retrieved', {
      count: products.length,
      platform: Platform.OS,
    });
    
    console.log('IAP products retrieved:', products);
    return products;
  } catch (error) {
    console.error('Failed to get IAP products:', error);
    
    // Log analytics event
    await logEvent('iap_products_retrieval_error', {
      error: error.message,
      platform: Platform.OS,
    });
    
    throw error;
  }
};

// Get subscriptions
export const getIAPSubscriptions = async (
  subscriptionSkus: string[] = [
    PRODUCT_IDS.MONTHLY_SUBSCRIPTION,
    PRODUCT_IDS.YEARLY_SUBSCRIPTION,
  ],
): Promise<Subscription[]> => {
  try {
    const subscriptions = await getSubscriptions({ skus: subscriptionSkus });
    
    // Log analytics event
    await logEvent('iap_subscriptions_retrieved', {
      count: subscriptions.length,
      platform: Platform.OS,
    });
    
    console.log('IAP subscriptions retrieved:', subscriptions);
    return subscriptions;
  } catch (error) {
    console.error('Failed to get IAP subscriptions:', error);
    
    // Log analytics event
    await logEvent('iap_subscriptions_retrieval_error', {
      error: error.message,
      platform: Platform.OS,
    });
    
    throw error;
  }
};

// Get available purchases
export const getAvailableIAPPurchases = async (): Promise<(ProductPurchase | SubscriptionPurchase)[]> => {
  try {
    const purchases = await getAvailablePurchases();
    
    // Log analytics event
    await logEvent('iap_available_purchases_retrieved', {
      count: purchases.length,
      platform: Platform.OS,
    });
    
    console.log('Available IAP purchases:', purchases);
    return purchases;
  } catch (error) {
    console.error('Failed to get available IAP purchases:', error);
    
    // Log analytics event
    await logEvent('iap_available_purchases_retrieval_error', {
      error: error.message,
      platform: Platform.OS,
    });
    
    throw error;
  }
};

// Request purchase
export const requestIAPPurchase = async (sku: string): Promise<void> => {
  try {
    await requestPurchase({ sku });
    
    // Log analytics event
    await logEvent('iap_purchase_requested', {
      sku,
      platform: Platform.OS,
    });
    
    console.log('IAP purchase requested:', sku);
  } catch (error) {
    console.error('Failed to request IAP purchase:', error);
    
    // Log analytics event
    await logEvent('iap_purchase_request_error', {
      sku,
      error: error.message,
      platform: Platform.OS,
    });
    
    throw error;
  }
};

// Request subscription
export const requestIAPSubscription = async (sku: string): Promise<void> => {
  try {
    await requestSubscription({ sku });
    
    // Log analytics event
    await logEvent('iap_subscription_requested', {
      sku,
      platform: Platform.OS,
    });
    
    console.log('IAP subscription requested:', sku);
  } catch (error) {
    console.error('Failed to request IAP subscription:', error);
    
    // Log analytics event
    await logEvent('iap_subscription_request_error', {
      sku,
      error: error.message,
      platform: Platform.OS,
    });
    
    throw error;
  }
};

// Finish transaction
export const finishIAPTransaction = async (
  purchase: ProductPurchase | SubscriptionPurchase,
  isConsumable?: boolean,
): Promise<void> => {
  try {
    await finishTransaction({ purchase, isConsumable });
    
    // Log analytics event
    await logEvent('iap_transaction_finished', {
      purchaseId: purchase.transactionId,
      isConsumable,
      platform: Platform.OS,
    });
    
    console.log('IAP transaction finished:', purchase.transactionId);
  } catch (error) {
    console.error('Failed to finish IAP transaction:', error);
    
    // Log analytics event
    await logEvent('iap_transaction_finishing_error', {
      purchaseId: purchase.transactionId,
      isConsumable,
      error: error.message,
      platform: Platform.OS,
    });
    
    throw error;
  }
};

// Setup purchase listeners
export const setupIAPPurchaseListeners = (
  onPurchaseUpdated?: (purchase: ProductPurchase | SubscriptionPurchase) => void,
  onPurchaseError?: (error: any) => void,
): (() => void) => {
  // Purchase updated listener
  const purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase) => {
    console.log('Purchase updated:', purchase);
    
    // Log analytics event
    await logEvent('iap_purchase_updated', {
      purchaseId: purchase.transactionId,
      platform: Platform.OS,
    });
    
    // Call custom handler if provided
    if (onPurchaseUpdated) {
      onPurchaseUpdated(purchase);
    }
    
    // Acknowledge purchase
    try {
      const isConsumable = Object.values(PRODUCT_IDS).includes(purchase.productId) &&
        ![
          PRODUCT_IDS.PREMIUM_FEATURE,
          PRODUCT_IDS.REMOVE_ADS,
          PRODUCT_IDS.MONTHLY_SUBSCRIPTION,
          PRODUCT_IDS.YEARLY_SUBSCRIPTION,
        ].includes(purchase.productId);
      
      await finishIAPTransaction(purchase, isConsumable);
    } catch (error) {
      console.error('Failed to acknowledge purchase:', error);
    }
  });
  
  // Purchase error listener
  const purchaseErrorSubscription = purchaseErrorListener((error) => {
    console.log('Purchase error:', error);
    
    // Log analytics event
    logEvent('iap_purchase_error', {
      error: error.message,
      platform: Platform.OS,
    });
    
    // Call custom handler if provided
    if (onPurchaseError) {
      onPurchaseError(error);
    }
  });
  
  // Return cleanup function
  return () => {
    purchaseUpdateSubscription.remove();
    purchaseErrorSubscription.remove();
  };
};

// Check if user has purchased a product
export const hasPurchasedProduct = async (sku: string): Promise<boolean> => {
  try {
    const purchases = await getAvailableIAPPurchases();
    return purchases.some(purchase => purchase.productId === sku);
  } catch (error) {
    console.error('Failed to check if user has purchased product:', error);
    return false;
  }
};

// Check if user has an active subscription
export const hasActiveSubscription = async (sku: string): Promise<boolean> => {
  try {
    const purchases = await getAvailableIAPPurchases();
    const subscriptionPurchase = purchases.find(
      purchase => purchase.productId === sku,
    ) as SubscriptionPurchase | undefined;
    
    if (!subscriptionPurchase) {
      return false;
    }
    
    // Check if subscription is active
    // For Android, check if subscription is active
    // For iOS, check if subscription expiration date is in the future
    if (Platform.OS === 'android') {
      return subscriptionPurchase.isAcknowledged;
    } else {
      // For iOS, we need to check the expiration date
      // This is a simplified check - in a real app, you would verify with your server
      return true;
    }
  } catch (error) {
    console.error('Failed to check if user has active subscription:', error);
    return false;
  }
};

// Restore purchases
export const restorePurchases = async (): Promise<(ProductPurchase | SubscriptionPurchase)[]> => {
  try {
    const purchases = await getAvailableIAPPurchases();
    
    // Log analytics event
    await logEvent('iap_purchases_restored', {
      count: purchases.length,
      platform: Platform.OS,
    });
    
    console.log('IAP purchases restored:', purchases);
    return purchases;
  } catch (error) {
    console.error('Failed to restore IAP purchases:', error);
    
    // Log analytics event
    await logEvent('iap_purchases_restoration_error', {
      error: error.message,
      platform: Platform.OS,
    });
    
    throw error;
  }
};
```

#### Create IAP Hook
Create a file `src/hooks/useInAppPurchases.ts`:

```typescript
import { useState, useEffect } from 'react';
import {
  Product,
  Subscription,
  ProductPurchase,
  SubscriptionPurchase,
} from 'react-native-iap';
import {
  initIAPConnection,
  endIAPConnection,
  getIAPProducts,
  getIAPSubscriptions,
  getAvailableIAPPurchases,
  requestIAPPurchase,
  requestIAPSubscription,
  setupIAPPurchaseListeners,
  hasPurchasedProduct,
  hasActiveSubscription,
  restorePurchases,
  PRODUCT_IDS,
} from '../services/inAppPurchases';
import { useAuthContext } from '../contexts/AuthContext';
import { useToast } from './useToast';

export interface PurchaseItem {
  productId: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  type: 'consumable' | 'non-consumable' | 'subscription';
  localizedPrice?: string;
}

export const useInAppPurchases = () => {
  const { user } = useAuthContext();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [purchases, setPurchases] = useState<(ProductPurchase | SubscriptionPurchase)[]>([]);
  const [purchasedProducts, setPurchasedProducts] = useState<Record<string, boolean>>({});
  const [activeSubscriptions, setActiveSubscriptions] = useState<Record<string, boolean>>({});

  // Initialize IAP
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        await initIAPConnection();
        
        // Get products and subscriptions
        const [productsData, subscriptionsData, purchasesData] = await Promise.all([
          getIAPProducts(),
          getIAPSubscriptions(),
          getAvailableIAPPurchases(),
        ]);
        
        setProducts(productsData);
        setSubscriptions(subscriptionsData);
        setPurchases(purchasesData);
        
        // Check purchased products and active subscriptions
        const purchasedProductsMap: Record<string, boolean> = {};
        const activeSubscriptionsMap: Record<string, boolean> = {};
        
        for (const productId of Object.values(PRODUCT_IDS)) {
          if (productId === PRODUCT_IDS.MONTHLY_SUBSCRIPTION || productId === PRODUCT_IDS.YEARLY_SUBSCRIPTION) {
            activeSubscriptionsMap[productId] = await hasActiveSubscription(productId);
          } else {
            purchasedProductsMap[productId] = await hasPurchasedProduct(productId);
          }
        }
        
        setPurchasedProducts(purchasedProductsMap);
        setActiveSubscriptions(activeSubscriptionsMap);
        
        // Setup purchase listeners
        const cleanup = setupIAPPurchaseListeners(
          handlePurchaseUpdated,
          handlePurchaseError,
        );
        
        return cleanup;
      } catch (error) {
        console.error('Failed to initialize IAP:', error);
        showToast('Failed to initialize in-app purchases', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    
    initialize();
    
    // Cleanup on unmount
    return () => {
      endIAPConnection();
    };
  }, [user]);

  // Handle purchase updated
  const handlePurchaseUpdated = async (purchase: ProductPurchase | SubscriptionPurchase) => {
    try {
      // Update purchases list
      setPurchases(prev => {
        const existingIndex = prev.findIndex(p => p.transactionId === purchase.transactionId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = purchase;
          return updated;
        }
        return [...prev, purchase];
      });
      
      // Update purchased products or active subscriptions
      if (purchase.productId === PRODUCT_IDS.MONTHLY_SUBSCRIPTION || purchase.productId === PRODUCT_IDS.YEARLY_SUBSCRIPTION) {
        const isActive = await hasActiveSubscription(purchase.productId);
        setActiveSubscriptions(prev => ({ ...prev, [purchase.productId]: isActive }));
        
        showToast('Subscription activated successfully', 'success');
      } else {
        setPurchasedProducts(prev => ({ ...prev, [purchase.productId]: true }));
        
        showToast('Purchase completed successfully', 'success');
      }
      
      // This would typically sync with your backend
      console.log('Purchase updated:', purchase);
    } catch (error) {
      console.error('Failed to handle purchase updated:', error);
      showToast('Failed to process purchase', 'error');
    }
  };

  // Handle purchase error
  const handlePurchaseError = (error: any) => {
    console.error('Purchase error:', error);
    
    let errorMessage = 'Purchase failed';
    
    if (error.message.includes('User cancelled')) {
      errorMessage = 'Purchase cancelled';
    } else if (error.message.includes('Billing response code')) {
      errorMessage = 'Billing error occurred';
    }
    
    showToast(errorMessage, 'error');
  };

  // Purchase product
  const purchaseProduct = async (productId: string) => {
    try {
      setIsLoading(true);
      await requestIAPPurchase(productId);
    } catch (error) {
      console.error('Failed to purchase product:', error);
      showToast('Failed to purchase product', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Purchase subscription
  const purchaseSubscription = async (productId: string) => {
    try {
      setIsLoading(true);
      await requestIAPSubscription(productId);
    } catch (error) {
      console.error('Failed to purchase subscription:', error);
      showToast('Failed to purchase subscription', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Restore purchases
  const handleRestorePurchases = async () => {
    try {
      setIsLoading(true);
      const restoredPurchases = await restorePurchases();
      
      // Update purchases list
      setPurchases(restoredPurchases);
      
      // Update purchased products and active subscriptions
      const purchasedProductsMap: Record<string, boolean> = {};
      const activeSubscriptionsMap: Record<string, boolean> = {};
      
      for (const productId of Object.values(PRODUCT_IDS)) {
        if (productId === PRODUCT_IDS.MONTHLY_SUBSCRIPTION || productId === PRODUCT_IDS.YEARLY_SUBSCRIPTION) {
          activeSubscriptionsMap[productId] = await hasActiveSubscription(productId);
        } else {
          purchasedProductsMap[productId] = await hasPurchasedProduct(productId);
        }
      }
      
      setPurchasedProducts(purchasedProductsMap);
      setActiveSubscriptions(activeSubscriptionsMap);
      
      showToast('Purchases restored successfully', 'success');
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      showToast('Failed to restore purchases', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Format products for display
  const formatProducts = (): PurchaseItem[] => {
    return products.map(product => {
      let type: 'consumable' | 'non-consumable' | 'subscription' = 'consumable';
      
      if (
        product.productId === PRODUCT_IDS.PREMIUM_FEATURE ||
        product.productId === PRODUCT_IDS.REMOVE_ADS
      ) {
        type = 'non-consumable';
      }
      
      return {
        productId: product.productId,
        title: product.title,
        description: product.description,
        price: product.price,
        currency: product.currency,
        type,
        localizedPrice: product.localizedPrice,
      };
    });
  };

  // Format subscriptions for display
  const formatSubscriptions = (): PurchaseItem[] => {
    return subscriptions.map(subscription => ({
      productId: subscription.productId,
      title: subscription.title,
      description: subscription.description,
      price: subscription.price,
      currency: subscription.currency,
      type: 'subscription',
      localizedPrice: subscription.localizedPrice,
    }));
  };

  // Check if user has premium access
  const hasPremiumAccess = (): boolean => {
    return (
      purchasedProducts[PRODUCT_IDS.PREMIUM_FEATURE] ||
      activeSubscriptions[PRODUCT_IDS.MONTHLY_SUBSCRIPTION] ||
      activeSubscriptions[PRODUCT_IDS.YEARLY_SUBSCRIPTION]
    );
  };

  // Check if ads are removed
  const areAdsRemoved = (): boolean => {
    return purchasedProducts[PRODUCT_IDS.REMOVE_ADS] || hasPremiumAccess();
  };

  return {
    isLoading,
    products: formatProducts(),
    subscriptions: formatSubscriptions(),
    purchases,
    purchasedProducts,
    activeSubscriptions,
    purchaseProduct,
    purchaseSubscription,
    handleRestorePurchases,
    hasPremiumAccess,
    areAdsRemoved,
  };
};
```

### 4. Create In-App Purchase Components

#### Create Product Card Component
Create a file `src/components/iap/ProductCard.tsx`:

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
import { PurchaseItem } from '../../hooks/useInAppPurchases';

interface ProductCardProps {
  product: PurchaseItem;
  onPurchase: (productId: string) => void;
  isPurchased?: boolean;
  isLoading?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPurchase,
  isPurchased = false,
  isLoading = false,
}) => {
  const { theme } = useTheme();

  const handlePurchase = () => {
    if (!isPurchased && !isLoading) {
      onPurchase(product.productId);
    }
  };

  const getCardStyle = () => {
    if (isPurchased) {
      return { backgroundColor: `${theme.primary}20`, borderColor: theme.primary };
    }
    return { backgroundColor: theme.card, borderColor: theme.border };
  };

  const getButtonText = () => {
    if (isPurchased) {
      return 'Purchased';
    }
    if (isLoading) {
      return 'Processing...';
    }
    return product.type === 'subscription' ? 'Subscribe' : 'Buy Now';
  };

  const getButtonStyle = () => {
    if (isPurchased) {
      return { backgroundColor: theme.primary };
    }
    return { backgroundColor: theme.primary };
  };

  return (
    <View style={[styles.container, getCardStyle()]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {product.title}
        </Text>
        
        <Text style={[styles.description, { color: theme.secondaryText }]} numberOfLines={2}>
          {product.description}
        </Text>
        
        <Text style={[styles.price, { color: theme.primary }]}>
          {product.localizedPrice || `${product.currency} ${product.price}`}
        </Text>
      </View>
      
      <TouchableOpacity
        style={[styles.button, getButtonStyle()]}
        onPress={handlePurchase}
        disabled={isPurchased || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Text style={styles.buttonText}>{getButtonText()}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    marginBottom: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    height: 40,
    minWidth: 100,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ProductCard;
```

#### Create Subscription Card Component
Create a file `src/components/iap/SubscriptionCard.tsx`:

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
import { PurchaseItem } from '../../hooks/useInAppPurchases';

interface SubscriptionCardProps {
  subscription: PurchaseItem;
  onPurchase: (productId: string) => void;
  isActive?: boolean;
  isLoading?: boolean;
  isRecommended?: boolean;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  onPurchase,
  isActive = false,
  isLoading = false,
  isRecommended = false,
}) => {
  const { theme } = useTheme();

  const handlePurchase = () => {
    if (!isActive && !isLoading) {
      onPurchase(subscription.productId);
    }
  };

  const getCardStyle = () => {
    if (isActive) {
      return { backgroundColor: `${theme.primary}20`, borderColor: theme.primary };
    }
    if (isRecommended) {
      return { backgroundColor: `${theme.primary}10`, borderColor: theme.primary };
    }
    return { backgroundColor: theme.card, borderColor: theme.border };
  };

  const getButtonText = () => {
    if (isActive) {
      return 'Active';
    }
    if (isLoading) {
      return 'Processing...';
    }
    return 'Subscribe';
  };

  const getButtonStyle = () => {
    if (isActive) {
      return { backgroundColor: theme.primary };
    }
    return { backgroundColor: theme.primary };
  };

  return (
    <View style={[styles.container, getCardStyle()]}>
      {isRecommended && (
        <View style={[styles.recommendedBadge, { backgroundColor: theme.primary }]}>
          <Text style={styles.recommendedText}>Recommended</Text>
        </View>
      )}
      
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {subscription.title}
        </Text>
        
        <Text style={[styles.description, { color: theme.secondaryText }]} numberOfLines={2}>
          {subscription.description}
        </Text>
        
        <Text style={[styles.price, { color: theme.primary }]}>
          {subscription.localizedPrice || `${subscription.currency} ${subscription.price}`}
        </Text>
      </View>
      
      <TouchableOpacity
        style={[styles.button, getButtonStyle()]}
        onPress={handlePurchase}
        disabled={isActive || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Text style={styles.buttonText}>{getButtonText()}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    left: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 1,
  },
  recommendedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    marginBottom: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    height: 40,
    minWidth: 100,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SubscriptionCard;
```

#### Create Store Screen Component
Create a file `src/components/iap/StoreScreen.tsx`:

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useInAppPurchases } from '../../hooks/useInAppPurchases';
import ProductCard from './ProductCard';
import SubscriptionCard from './SubscriptionCard';

interface StoreScreenProps {
  onBack?: () => void;
}

const StoreScreen: React.FC<StoreScreenProps> = ({ onBack }) => {
  const { theme } = useTheme();
  const {
    isLoading,
    products,
    subscriptions,
    purchaseProduct,
    purchaseSubscription,
    handleRestorePurchases,
    hasPremiumAccess,
    areAdsRemoved,
  } = useInAppPurchases();
  
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'subscriptions'>('products');

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    // This would typically refresh products and subscriptions
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Handle purchase
  const handlePurchaseProduct = (productId: string) => {
    Alert.alert(
      'Confirm Purchase',
      'Are you sure you want to purchase this item?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Buy',
          onPress: () => purchaseProduct(productId),
        },
      ],
    );
  };

  // Handle subscription
  const handlePurchaseSubscription = (productId: string) => {
    Alert.alert(
      'Confirm Subscription',
      'Are you sure you want to subscribe to this plan?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Subscribe',
          onPress: () => purchaseSubscription(productId),
        },
      ],
    );
  };

  // Handle restore purchases
  const handleRestore = () => {
    Alert.alert(
      'Restore Purchases',
      'Are you sure you want to restore your previous purchases?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Restore',
          onPress: handleRestorePurchases,
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <TouchableOpacity onPress={onBack}>
          <Text style={[styles.backButton, { color: theme.primary }]}>Back</Text>
        </TouchableOpacity>
        
        <Text style={[styles.title, { color: theme.text }]}>Store</Text>
        
        <TouchableOpacity onPress={handleRestore}>
          <Text style={[styles.restoreButton, { color: theme.primary }]}>Restore</Text>
        </TouchableOpacity>
      </View>
      
      <View style={[styles.statusContainer, { backgroundColor: theme.card }]}>
        <Text style={[styles.statusText, { color: theme.text }]}>
          Premium Access: {hasPremiumAccess() ? '✅ Active' : '❌ Inactive'}
        </Text>
        
        <Text style={[styles.statusText, { color: theme.text }]}>
          Ads Removed: {areAdsRemoved() ? '✅ Yes' : '❌ No'}
        </Text>
      </View>
      
      <View style={[styles.tabContainer, { backgroundColor: theme.card }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'products' && { borderBottomColor: theme.primary },
          ]}
          onPress={() => setActiveTab('products')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'products' ? theme.primary : theme.secondaryText },
            ]}
          >
            Products
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'subscriptions' && { borderBottomColor: theme.primary },
          ]}
          onPress={() => setActiveTab('subscriptions')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'subscriptions' ? theme.primary : theme.secondaryText },
            ]}
          >
            Subscriptions
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
      >
        {activeTab === 'products' ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              In-App Products
            </Text>
            
            {products.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
                No products available
              </Text>
            ) : (
              products.map(product => (
                <ProductCard
                  key={product.productId}
                  product={product}
                  onPurchase={handlePurchaseProduct}
                  isPurchased={product.type !== 'subscription' && areAdsRemoved()}
                  isLoading={isLoading}
                />
              ))
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Subscriptions
            </Text>
            
            {subscriptions.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
                No subscriptions available
              </Text>
            ) : (
              subscriptions.map((subscription, index) => (
                <SubscriptionCard
                  key={subscription.productId}
                  subscription={subscription}
                  onPurchase={handlePurchaseSubscription}
                  isActive={hasPremiumAccess()}
                  isLoading={isLoading}
                  isRecommended={index === 1} // Recommend yearly subscription
                />
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  backButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  restoreButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  statusContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  statusText: {
    fontSize: 16,
    marginBottom: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 40,
  },
});

export default StoreScreen;
```

### 5. Create Store Screen

#### Create Store Screen
Create a file `src/screens/store/StoreScreen.tsx`:

```typescript
import React from 'react';
import { SafeAreaView } from 'react-native';
import StoreScreenComponent from '../../components/iap/StoreScreen';

const StoreScreen: React.FC = () => {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StoreScreenComponent />
    </SafeAreaView>
  );
};

export default StoreScreen;
```

### 6. Integration in App

#### Update App Entry Point
Update your `App.tsx` to include IAP initialization:

```typescript
import React, { useEffect } from 'react';
import { initIAPConnection } from './src/services/inAppPurchases';

const App = () => {
  useEffect(() => {
    // Initialize IAP when app starts
    const setupIAP = async () => {
      await initIAPConnection();
    };
    
    setupIAP();
  }, []);

  // ... rest of your app
};
```

#### Update App Navigation
Add the StoreScreen to your navigation stack:

```typescript
// In your navigation file
import StoreScreen from '../screens/store/StoreScreen';

// Add to your navigator
<Stack.Screen
  name="Store"
  component={StoreScreen}
  options={{ title: 'Store' }}
/>
```

### 7. Advanced Features Implementation

#### Create IAP Analytics Service
Create a file `src/services/iapAnalytics.ts`:

```typescript
import { logEvent } from './analytics';
import { ProductPurchase, SubscriptionPurchase } from 'react-native-iap';

// Track purchase event
export const trackPurchase = async (
  purchase: ProductPurchase | SubscriptionPurchase,
  productType: 'consumable' | 'non-consumable' | 'subscription',
  value: number,
  currency: string,
): Promise<void> => {
  try {
    await logEvent('purchase', {
      transaction_id: purchase.transactionId,
      value,
      currency,
      product_id: purchase.productId,
      product_type: productType,
      platform: purchase.platform,
    });
    
    console.log('Purchase tracked:', purchase);
  } catch (error) {
    console.error('Failed to track purchase:', error);
  }
};

// Track subscription event
export const trackSubscription = async (
  purchase: SubscriptionPurchase,
  subscriptionPeriod: 'monthly' | 'yearly',
  value: number,
  currency: string,
): Promise<void> => {
  try {
    await logEvent('subscription', {
      transaction_id: purchase.transactionId,
      value,
      currency,
      product_id: purchase.productId,
      subscription_period: subscriptionPeriod,
      platform: purchase.platform,
    });
    
    console.log('Subscription tracked:', purchase);
  } catch (error) {
    console.error('Failed to track subscription:', error);
  }
};

// Track revenue event
export const trackRevenue = async (
  purchase: ProductPurchase | SubscriptionPurchase,
  value: number,
  currency: string,
): Promise<void> => {
  try {
    await logEvent('revenue', {
      transaction_id: purchase.transactionId,
      value,
      currency,
      platform: purchase.platform,
    });
    
    console.log('Revenue tracked:', purchase);
  } catch (error) {
    console.error('Failed to track revenue:', error);
  }
};

// Track refund event
export const trackRefund = async (
  transactionId: string,
  value: number,
  currency: string,
): Promise<void> => {
  try {
    await logEvent('refund', {
      transaction_id: transactionId,
      value,
      currency,
    });
    
    console.log('Refund tracked:', transactionId);
  } catch (error) {
    console.error('Failed to track refund:', error);
  }
};

// Track store view event
export const trackStoreView = async (): Promise<void> => {
  try {
    await logEvent('store_view');
    
    console.log('Store view tracked');
  } catch (error) {
    console.error('Failed to track store view:', error);
  }
};

// Track product view event
export const trackProductView = async (
  productId: string,
  productName: string,
): Promise<void> => {
  try {
    await logEvent('product_view', {
      product_id: productId,
      product_name: productName,
    });
    
    console.log('Product view tracked:', productId);
  } catch (error) {
    console.error('Failed to track product view:', error);
  }
};

// Track add to cart event
export const trackAddToCart = async (
  productId: string,
  productName: string,
  value: number,
  currency: string,
): Promise<void> => {
  try {
    await logEvent('add_to_cart', {
      product_id: productId,
      product_name: productName,
      value,
      currency,
    });
    
    console.log('Add to cart tracked:', productId);
  } catch (error) {
    console.error('Failed to track add to cart:', error);
  }
};

// Track begin checkout event
export const trackBeginCheckout = async (
  products: Array<{
    productId: string;
    productName: string;
    value: number;
    currency: string;
  }>,
): Promise<void> => {
  try {
    await logEvent('begin_checkout', {
      products,
    });
    
    console.log('Begin checkout tracked:', products);
  } catch (error) {
    console.error('Failed to track begin checkout:', error);
  }
};
```

### 8. Testing and Debugging

#### Enable Debug Mode
Create a file `src/services/iapDebug.ts`:

```typescript
import { logEvent } from './analytics';

// Enable debug mode for IAP
export const enableIAPDebugMode = async () => {
  try {
    // Note: This is a placeholder for any platform-specific debug setup
    console.log('IAP debug mode enabled');
    
    // Log analytics event
    await logEvent('iap_debug_mode_enabled');
  } catch (error) {
    console.error('Failed to enable IAP debug mode:', error);
  }
};

// Test IAP purchase
export const testIAPPurchase = async () => {
  try {
    // This is a placeholder for testing IAP purchases
    console.log('Testing IAP purchase...');
    
    // Log analytics event
    await logEvent('test_iap_purchase');
  } catch (error) {
    console.error('Failed to test IAP purchase:', error);
  }
};
```

### 9. Best Practices and Optimization

#### In-App Purchases Best Practices
1. **Provide clear value**: Clearly communicate what users get with each purchase
2. **Offer a free trial**: Consider offering a free trial for subscriptions
3. **Use appropriate pricing**: Set prices that reflect the value of your products
4. **Provide restore functionality**: Allow users to restore purchases on new devices
5. **Handle edge cases**: Handle edge cases like network failures and interrupted purchases

#### Performance Optimization
1. **Cache products**: Cache product information to reduce loading times
2. **Lazy load**: Load products and subscriptions only when needed
3. **Minimize API calls**: Reduce unnecessary API calls for product information
4. **Use appropriate image sizes**: Use appropriately sized images for product icons
5. **Optimize for slow connections**: Handle slow network connections gracefully

#### User Experience Guidelines
1. **Make purchasing easy**: Provide a simple and intuitive purchase flow
2. **Show purchase confirmation**: Show confirmation when a purchase is successful
3. **Handle errors gracefully**: Show clear error messages when purchases fail
4. **Provide purchase history**: Allow users to view their purchase history
5. **Respect user preferences**: Allow users to manage their subscriptions easily

## Troubleshooting

### Common Issues

#### Products Not Loading
1. Check if products are configured in App Store Connect and Google Play Console
2. Verify product IDs match exactly with those in the stores
3. Ensure IAP connection is properly initialized
4. Check if device has internet connection

#### Purchases Failing
1. Check if user is signed in to their app store account
2. Verify payment method is valid
3. Ensure IAP capability is enabled in Xcode
4. Check if billing permission is added to AndroidManifest.xml

#### Subscriptions Not Renewing
1. Check if subscription is properly configured in App Store Connect and Google Play Console
2. Verify subscription status with server validation
3. Ensure subscription receipts are properly handled
4. Check if user has sufficient funds for renewal

### Debugging Tools
1. **App Store Connect and Google Play Console**: Use console dashboards to monitor sales and issues
2. **Device Logs**: Check device logs for IAP-related errors
3. **Network Inspector**: Monitor network requests for product information
4. **Sandbox Testing**: Test purchases in sandbox environments before releasing

## Conclusion
This guide provides a comprehensive implementation of in-app purchases in your React Native application. By following these steps, you'll be able to effectively monetize your app with products and subscriptions.

Remember to:
- Always follow platform guidelines for in-app purchases
- Provide clear value to users with each purchase
- Test thoroughly across different devices and platforms
- Handle edge cases gracefully
- Comply with privacy regulations and platform policies