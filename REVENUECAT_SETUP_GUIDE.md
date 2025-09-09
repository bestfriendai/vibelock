# 🚀 RevenueCat Complete Setup Guide for LockerRoom

## Overview
This guide will help you set up RevenueCat for your LockerRoom app with bundle ID `com.lockerroomtalk.app`.

## Step 1: RevenueCat Dashboard Setup

### 1.1 Create Project (if not exists)
1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Create a new project or use existing one

### 1.2 Create iOS App
1. Navigate to **Project Settings** → **Apps**
2. Click **+ New App**
3. Select **App Store**
4. Fill in details:
   - **App Name**: LockerRoom iOS
   - **Bundle ID**: `com.lockerroomtalk.app`
   - **App Store Connect App ID**: (leave blank for now, add later when you submit to App Store)

### 1.3 Create Android App
1. Click **+ New App** again
2. Select **Google Play**
3. Fill in details:
   - **App Name**: LockerRoom Android
   - **Package Name**: `com.lockerroomtalk.app`

## Step 2: Create Subscription Products

### 2.1 iOS Products (in App Store Connect)
You'll need to create these in App Store Connect first, then add them to RevenueCat:

1. **Monthly Premium**: `com.lockerroomtalk.app.premium.monthly`
2. **Annual Premium**: `com.lockerroomtalk.app.premium.annual`

### 2.2 Android Products (in Google Play Console)
Create these in Google Play Console, then add to RevenueCat:

1. **Monthly Premium**: `premium_monthly`
2. **Annual Premium**: `premium_annual`

### 2.3 Add Products to RevenueCat
1. Go to **Product Catalog** in RevenueCat
2. Click **+ New Product**
3. For each product:
   - Select the app (iOS or Android)
   - Enter the product identifier
   - Set product type to **Subscription**
   - Add display name

## Step 3: Create Entitlements

### 3.1 Premium Features Entitlement
1. Go to **Entitlements** in RevenueCat
2. Click **+ New Entitlement**
3. Set:
   - **Identifier**: `premium_features`
   - **Display Name**: Premium Features

### 3.2 Attach Products to Entitlement
1. Open the `premium_features` entitlement
2. Click **Attach Products**
3. Select all your subscription products (monthly and annual for both platforms)

## Step 4: Create Offerings

### 4.1 Default Offering
1. Go to **Offerings** in RevenueCat
2. Click **+ New Offering**
3. Set:
   - **Identifier**: `default`
   - **Display Name**: Default Offering
   - **Current Offering**: Yes

### 4.2 Create Packages
1. Open the default offering
2. Click **+ New Package**
3. Create these packages:

**Monthly Package:**
- **Identifier**: `$rc_monthly`
- **Display Name**: Monthly Premium
- **Products**: Attach monthly products from both platforms

**Annual Package:**
- **Identifier**: `$rc_annual`
- **Display Name**: Annual Premium
- **Products**: Attach annual products from both platforms

## Step 5: Get API Keys

### 5.1 Get Public API Keys
1. Go to each app in **Project Settings** → **Apps**
2. Copy the **Public API Key** for each platform:
   - iOS Public API Key
   - Android Public API Key

## Step 6: Update Environment Variables

Add these to your `.env` file:

```bash
# RevenueCat API Keys
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=your_ios_public_key_here
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=your_android_public_key_here
```

## Step 7: Test Configuration

Run the validation script:
```bash
node scripts/validate-monetization.js
```

## Next Steps

1. Create development builds for testing
2. Test subscription flows
3. Verify premium features unlock correctly
4. Set up App Store Connect and Google Play Console products
5. Submit for review

## Premium Features to Implement

Based on your paywall, these features should be gated:
- 🚫 Ad-Free Experience
- 🔍 Advanced Search & Filters
- 📊 Review Analytics & Insights
- 🎨 Custom Profile Themes
- ⚡ Priority Support
- 🌍 Extended Location Search
