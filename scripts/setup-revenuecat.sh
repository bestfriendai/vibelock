#!/bin/bash

# RevenueCat Automated Setup Script for Loccc
# This script automates the RevenueCat configuration process

set -e # Exit on error

echo "🚀 Starting RevenueCat Setup for Loccc..."
echo "==========================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to prompt for input with default value
prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local input
    read -p "$prompt [$default]: " input
    echo "${input:-$default}"
}

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

if ! command_exists revenuecat; then
    echo -e "${YELLOW}RevenueCat CLI not found. Installing...${NC}"
    npm install -g @revenuecat/cli
else
    echo -e "${GREEN}✓ RevenueCat CLI installed${NC}"
fi

# Check for required files
echo -e "\n${YELLOW}Checking for required files...${NC}"

if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}Creating .env.production from template...${NC}"
    cp .env.example .env.production
fi

# Prompt for configuration
echo -e "\n${YELLOW}Please provide your RevenueCat configuration:${NC}"
echo "You can find these values in your RevenueCat dashboard"
echo ""

PROJECT_ID=$(prompt_with_default "RevenueCat Project ID" "")
IOS_BUNDLE_ID=$(prompt_with_default "iOS Bundle ID" "com.lockerroom.app")
ANDROID_PACKAGE=$(prompt_with_default "Android Package Name" "com.lockerroom.app")

# App Store Connect credentials (for iOS)
echo -e "\n${YELLOW}App Store Connect Configuration (for iOS):${NC}"
ASC_KEY_ID=$(prompt_with_default "App Store Connect API Key ID" "")
ASC_ISSUER_ID=$(prompt_with_default "App Store Connect Issuer ID" "")
ASC_KEY_PATH=$(prompt_with_default "Path to App Store Connect .p8 key file" "./AuthKey.p8")
ASC_APP_ID=$(prompt_with_default "App Store App ID" "")

# Google Play credentials (for Android)
echo -e "\n${YELLOW}Google Play Configuration (for Android):${NC}"
GOOGLE_SA_PATH=$(prompt_with_default "Path to Google Play service account JSON" "./google-play-service-account.json")

# Login to RevenueCat
echo -e "\n${YELLOW}Logging in to RevenueCat...${NC}"
echo "A browser window will open for authentication"
revenuecat login || true

# Create configuration file
echo -e "\n${YELLOW}Creating RevenueCat configuration file...${NC}"

cat > revenuecat-config.json <<EOF
{
  "project_id": "$PROJECT_ID",
  "ios": {
    "bundle_id": "$IOS_BUNDLE_ID",
    "app_store_connect": {
      "key_id": "$ASC_KEY_ID",
      "issuer_id": "$ASC_ISSUER_ID",
      "key_path": "$ASC_KEY_PATH",
      "app_id": "$ASC_APP_ID"
    }
  },
  "android": {
    "package_name": "$ANDROID_PACKAGE",
    "google_play": {
      "service_account_path": "$GOOGLE_SA_PATH"
    }
  },
  "products": [
    {
      "identifier": "monthly_premium",
      "type": "subscription",
      "display_name": "Monthly Premium",
      "description": "Get premium access for one month",
      "ios_product_id": "com.lockerroom.premium.monthly",
      "android_product_id": "monthly_premium",
      "price_usd": 9.99
    },
    {
      "identifier": "annual_premium",
      "type": "subscription",
      "display_name": "Annual Premium",
      "description": "Get premium access for one year (save 20%)",
      "ios_product_id": "com.lockerroom.premium.annual",
      "android_product_id": "annual_premium",
      "price_usd": 95.99
    },
    {
      "identifier": "lifetime_premium",
      "type": "one_time",
      "display_name": "Lifetime Premium",
      "description": "Get lifetime premium access",
      "ios_product_id": "com.lockerroom.premium.lifetime",
      "android_product_id": "lifetime_premium",
      "price_usd": 199.99
    }
  ],
  "entitlements": [
    {
      "identifier": "premium",
      "display_name": "Premium Access",
      "description": "Unlock all premium features including unlimited reviews, ad-free experience, and priority support"
    }
  ],
  "offerings": [
    {
      "identifier": "default",
      "display_name": "Standard Pricing",
      "packages": [
        {
          "identifier": "\$rc_monthly",
          "product_id": "monthly_premium"
        },
        {
          "identifier": "\$rc_annual",
          "product_id": "annual_premium"
        },
        {
          "identifier": "\$rc_lifetime",
          "product_id": "lifetime_premium"
        }
      ]
    }
  ]
}
EOF

echo -e "${GREEN}✓ Configuration file created${NC}"

# Create setup functions
setup_ios_products() {
    echo -e "\n${YELLOW}Setting up iOS products in App Store Connect...${NC}"
    
    # Create subscription group
    echo "Creating subscription group..."
    
    # Monthly subscription
    cat > ios_monthly_product.json <<EOF
{
  "data": {
    "type": "inAppPurchases",
    "attributes": {
      "productId": "com.lockerroom.premium.monthly",
      "referenceName": "Monthly Premium",
      "inAppPurchaseType": "AUTO_RENEWABLE_SUBSCRIPTION",
      "familySharable": false
    },
    "relationships": {
      "app": {
        "data": {
          "type": "apps",
          "id": "$ASC_APP_ID"
        }
      }
    }
  }
}
EOF

    # Annual subscription
    cat > ios_annual_product.json <<EOF
{
  "data": {
    "type": "inAppPurchases",
    "attributes": {
      "productId": "com.lockerroom.premium.annual",
      "referenceName": "Annual Premium",
      "inAppPurchaseType": "AUTO_RENEWABLE_SUBSCRIPTION",
      "familySharable": false
    },
    "relationships": {
      "app": {
        "data": {
          "type": "apps",
          "id": "$ASC_APP_ID"
        }
      }
    }
  }
}
EOF

    # Lifetime purchase
    cat > ios_lifetime_product.json <<EOF
{
  "data": {
    "type": "inAppPurchases",
    "attributes": {
      "productId": "com.lockerroom.premium.lifetime",
      "referenceName": "Lifetime Premium",
      "inAppPurchaseType": "NON_CONSUMABLE",
      "familySharable": true
    },
    "relationships": {
      "app": {
        "data": {
          "type": "apps",
          "id": "$ASC_APP_ID"
        }
      }
    }
  }
}
EOF

    echo -e "${GREEN}✓ iOS product configuration files created${NC}"
    echo -e "${YELLOW}Note: You'll need to complete product setup in App Store Connect${NC}"
}

setup_android_products() {
    echo -e "\n${YELLOW}Setting up Android products...${NC}"
    
    # Create product configuration files
    cat > android_products.json <<EOF
{
  "products": [
    {
      "sku": "monthly_premium",
      "type": "subs",
      "defaultPrice": {
        "priceMicros": "9990000",
        "currency": "USD"
      },
      "listings": {
        "en-US": {
          "title": "Monthly Premium",
          "description": "Get premium access for one month"
        }
      },
      "subscriptionPeriod": "P1M"
    },
    {
      "sku": "annual_premium",
      "type": "subs",
      "defaultPrice": {
        "priceMicros": "95990000",
        "currency": "USD"
      },
      "listings": {
        "en-US": {
          "title": "Annual Premium",
          "description": "Get premium access for one year (save 20%)"
        }
      },
      "subscriptionPeriod": "P1Y"
    },
    {
      "sku": "lifetime_premium",
      "type": "inapp",
      "defaultPrice": {
        "priceMicros": "199990000",
        "currency": "USD"
      },
      "listings": {
        "en-US": {
          "title": "Lifetime Premium",
          "description": "Get lifetime premium access"
        }
      }
    }
  ]
}
EOF

    echo -e "${GREEN}✓ Android product configuration created${NC}"
    echo -e "${YELLOW}Note: You'll need to complete product setup in Google Play Console${NC}"
}

# Setup products
setup_ios_products
setup_android_products

# Create webhook configuration
echo -e "\n${YELLOW}Creating webhook configuration...${NC}"

WEBHOOK_URL=$(prompt_with_default "Webhook URL" "https://your-project.supabase.co/functions/v1/revenuecat-webhook")
WEBHOOK_SECRET=$(openssl rand -hex 32)

cat > webhook-config.json <<EOF
{
  "url": "$WEBHOOK_URL",
  "secret": "$WEBHOOK_SECRET",
  "events": [
    "initial_purchase",
    "renewal",
    "cancellation",
    "uncancellation",
    "non_renewing_purchase",
    "subscription_paused",
    "expiration",
    "billing_issue",
    "product_change"
  ]
}
EOF

echo -e "${GREEN}✓ Webhook configuration created${NC}"
echo -e "Webhook Secret: ${YELLOW}$WEBHOOK_SECRET${NC}"
echo -e "${RED}⚠️  Save this webhook secret securely!${NC}"

# Update .env.production
echo -e "\n${YELLOW}Updating .env.production...${NC}"

# Function to update or add env variable
update_env() {
    local key=$1
    local value=$2
    local file=".env.production"
    
    if grep -q "^$key=" "$file"; then
        sed -i.bak "s/^$key=.*/$key=$value/" "$file"
    else
        echo "$key=$value" >> "$file"
    fi
}

# Note: These will be filled after running RevenueCat CLI commands
echo -e "${YELLOW}Please run the following commands to get your API keys:${NC}"
echo ""
echo "# Get iOS API key:"
echo "revenuecat app get-public-key ios --project-id $PROJECT_ID"
echo ""
echo "# Get Android API key:"
echo "revenuecat app get-public-key android --project-id $PROJECT_ID"
echo ""
echo "# Then update .env.production with the keys"

# Create validation script
cat > validate-revenuecat.js <<'EOF'
const fs = require('fs');
require('dotenv').config({ path: '.env.production' });

console.log('🔍 Validating RevenueCat Configuration...\n');

const required = [
  'EXPO_PUBLIC_REVENUECAT_IOS_API_KEY',
  'EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY',
  'REVENUECAT_WEBHOOK_SECRET'
];

let hasErrors = false;

required.forEach(key => {
  const value = process.env[key];
  if (!value || value === '') {
    console.log(`❌ ${key} is not set`);
    hasErrors = true;
  } else {
    console.log(`✅ ${key} is configured`);
  }
});

if (hasErrors) {
  console.log('\n❌ RevenueCat configuration incomplete');
  process.exit(1);
} else {
  console.log('\n✅ RevenueCat configuration complete!');
}
EOF

# Create test purchase script
cat > test-purchase.js <<'EOF'
// Test RevenueCat Integration
import Purchases from 'react-native-purchases';

export async function testRevenueCat() {
  try {
    // Get offerings
    const offerings = await Purchases.getOfferings();
    console.log('Available offerings:', offerings);
    
    // Get customer info
    const customerInfo = await Purchases.getCustomerInfo();
    console.log('Customer info:', customerInfo);
    
    // Check entitlements
    const isPremium = customerInfo.entitlements.active['premium'];
    console.log('Is Premium:', !!isPremium);
    
    return true;
  } catch (error) {
    console.error('RevenueCat test failed:', error);
    return false;
  }
}
EOF

# Create EAS secrets upload script
cat > upload-secrets.sh <<EOF
#!/bin/bash
echo "Uploading RevenueCat secrets to EAS..."

# Read API keys from .env.production
source .env.production

eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_IOS_API_KEY --value "\$EXPO_PUBLIC_REVENUECAT_IOS_API_KEY" --force
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY --value "\$EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY" --force
eas secret:create --scope project --name REVENUECAT_WEBHOOK_SECRET --value "\$REVENUECAT_WEBHOOK_SECRET" --force

echo "✅ Secrets uploaded to EAS"
EOF

chmod +x upload-secrets.sh

# Summary
echo -e "\n${GREEN}=========================================="
echo -e "✅ RevenueCat Setup Complete!"
echo -e "==========================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Complete product setup in App Store Connect"
echo "2. Complete product setup in Google Play Console"
echo "3. Run the RevenueCat CLI commands shown above to get API keys"
echo "4. Update .env.production with the API keys"
echo "5. Run: node validate-revenuecat.js to verify configuration"
echo "6. Run: ./upload-secrets.sh to upload to EAS"
echo "7. Deploy webhook endpoint to Supabase"
echo ""
echo -e "${YELLOW}Generated Files:${NC}"
echo "- revenuecat-config.json (main configuration)"
echo "- webhook-config.json (webhook settings)"
echo "- ios_*.json (iOS product configs)"
echo "- android_products.json (Android product config)"
echo "- validate-revenuecat.js (validation script)"
echo "- test-purchase.js (test integration)"
echo "- upload-secrets.sh (EAS secrets upload)"
echo ""
echo -e "${YELLOW}Webhook Secret:${NC} $WEBHOOK_SECRET"
echo -e "${RED}⚠️  Save the webhook secret securely!${NC}"