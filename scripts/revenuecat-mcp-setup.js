#!/usr/bin/env node

/**
 * RevenueCat MCP Setup Script
 * This script uses the RevenueCat Model Context Protocol server to configure everything
 */

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Color codes for output
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.blue}▶${colors.reset} ${msg}`),
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const prompt = (question) => {
  return new Promise((resolve) => {
    rl.question(`${colors.yellow}${question}${colors.reset}: `, resolve);
  });
};

// Configuration class for RevenueCat MCP
class RevenueCatMCPConfig {
  constructor() {
    this.config = {
      apiKey: "",
      projectId: "",
      iosAppId: "",
      androidAppId: "",
      products: [],
      entitlements: [],
      offerings: [],
      webhook: {},
    };
  }

  async collectCredentials() {
    console.log(`\n${colors.cyan}═══════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}     RevenueCat MCP Configuration Setup${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════════════${colors.reset}\n`);

    log.info("Please provide your RevenueCat credentials:");

    this.config.apiKey = await prompt("RevenueCat API Key (secret key)");
    this.config.projectId = await prompt("RevenueCat Project ID");
    this.config.iosAppId = await prompt("iOS App ID (from RevenueCat)");
    this.config.androidAppId = await prompt("Android App ID (from RevenueCat)");

    // Save to environment file
    this.saveToEnv();
  }

  saveToEnv() {
    const envPath = path.join(process.cwd(), ".env.mcp");
    const envContent = `
# RevenueCat MCP Configuration
REVENUECAT_API_KEY=${this.config.apiKey}
REVENUECAT_PROJECT_ID=${this.config.projectId}
REVENUECAT_APP_ID_IOS=${this.config.iosAppId}
REVENUECAT_APP_ID_ANDROID=${this.config.androidAppId}
`;

    fs.writeFileSync(envPath, envContent.trim());
    log.success("Credentials saved to .env.mcp");
  }

  async setupProducts() {
    log.step("Setting up products...");

    this.config.products = [
      {
        identifier: "monthly_premium",
        displayName: "Monthly Premium",
        type: "subscription",
        iosProductId: "com.lockerroom.premium.monthly",
        androidProductId: "monthly_premium",
        price: 9.99,
        currency: "USD",
        duration: "P1M",
      },
      {
        identifier: "annual_premium",
        displayName: "Annual Premium (Save 20%)",
        type: "subscription",
        iosProductId: "com.lockerroom.premium.annual",
        androidProductId: "annual_premium",
        price: 95.99,
        currency: "USD",
        duration: "P1Y",
      },
      {
        identifier: "lifetime_premium",
        displayName: "Lifetime Premium",
        type: "non_consumable",
        iosProductId: "com.lockerroom.premium.lifetime",
        androidProductId: "lifetime_premium",
        price: 199.99,
        currency: "USD",
      },
    ];

    log.success(`Configured ${this.config.products.length} products`);
  }

  async setupEntitlements() {
    log.step("Setting up entitlements...");

    this.config.entitlements = [
      {
        identifier: "premium",
        displayName: "Premium Access",
        description: "Unlock all premium features",
        products: ["monthly_premium", "annual_premium", "lifetime_premium"],
      },
    ];

    log.success(`Configured ${this.config.entitlements.length} entitlements`);
  }

  async setupOfferings() {
    log.step("Setting up offerings...");

    this.config.offerings = [
      {
        identifier: "default",
        displayName: "Standard Pricing",
        isCurrent: true,
        packages: [
          {
            identifier: "$rc_monthly",
            displayName: "Monthly",
            productId: "monthly_premium",
            position: 0,
          },
          {
            identifier: "$rc_annual",
            displayName: "Annual",
            productId: "annual_premium",
            position: 1,
          },
          {
            identifier: "$rc_lifetime",
            displayName: "Lifetime",
            productId: "lifetime_premium",
            position: 2,
          },
        ],
      },
    ];

    log.success(`Configured ${this.config.offerings.length} offerings`);
  }

  async setupWebhook() {
    log.step("Setting up webhook configuration...");

    const webhookUrl = await prompt(
      "Webhook URL (e.g., https://your-project.supabase.co/functions/v1/revenuecat-webhook)",
    );
    const webhookSecret = require("crypto").randomBytes(32).toString("hex");

    this.config.webhook = {
      url: webhookUrl,
      secret: webhookSecret,
      events: [
        "initial_purchase",
        "renewal",
        "cancellation",
        "uncancellation",
        "non_renewing_purchase",
        "subscription_paused",
        "expiration",
        "billing_issue",
        "product_change",
      ],
    };

    log.success("Webhook configuration created");
    log.warning(`Webhook Secret: ${colors.yellow}${webhookSecret}${colors.reset}`);
    log.warning("Save this secret securely - you will need it for your webhook endpoint!");
  }

  exportConfig() {
    const configPath = path.join(process.cwd(), "revenuecat-mcp-config.json");
    fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
    log.success(`Configuration exported to ${configPath}`);
  }
}

// MCP Server Manager
class MCPServerManager {
  constructor(config) {
    this.config = config;
    this.server = null;
  }

  async start() {
    log.step("Starting RevenueCat MCP server...");

    // Load environment variables
    require("dotenv").config({ path: ".env.mcp" });

    // Start the MCP server
    this.server = spawn("npx", ["revenuecat-mcp"], {
      env: {
        ...process.env,
        REVENUECAT_API_KEY: this.config.apiKey,
        REVENUECAT_PROJECT_ID: this.config.projectId,
        REVENUECAT_APP_ID_IOS: this.config.iosAppId,
        REVENUECAT_APP_ID_ANDROID: this.config.androidAppId,
      },
      stdio: "pipe",
    });

    this.server.stdout.on("data", (data) => {
      console.log(`${colors.green}[MCP]${colors.reset} ${data.toString()}`);
    });

    this.server.stderr.on("data", (data) => {
      console.error(`${colors.red}[MCP Error]${colors.reset} ${data.toString()}`);
    });

    this.server.on("close", (code) => {
      log.info(`MCP server exited with code ${code}`);
    });

    log.success("RevenueCat MCP server started");
  }

  async executeCommand(command) {
    // Send command to MCP server
    log.info(`Executing: ${command}`);
    // Implementation would depend on MCP protocol
  }

  stop() {
    if (this.server) {
      this.server.kill();
      log.info("MCP server stopped");
    }
  }
}

// API Configuration Generator
class APIConfigGenerator {
  static generateIOSConfig(config) {
    return {
      bundleId: "com.lockerroom.app",
      products: config.products.map((p) => ({
        productId: p.iosProductId,
        type: p.type === "subscription" ? "AUTO_RENEWABLE_SUBSCRIPTION" : "NON_CONSUMABLE",
        referenceName: p.displayName,
        price: p.price,
        currency: p.currency,
      })),
    };
  }

  static generateAndroidConfig(config) {
    return {
      packageName: "com.lockerroom.app",
      products: config.products.map((p) => ({
        productId: p.androidProductId,
        type: p.type === "subscription" ? "subs" : "inapp",
        defaultPrice: {
          priceMicros: Math.floor(p.price * 1000000),
          currency: p.currency,
        },
        listings: {
          "en-US": {
            title: p.displayName,
            description: `Access to ${p.displayName}`,
          },
        },
      })),
    };
  }

  static generateImplementationCode(config) {
    const code = `
// RevenueCat Implementation Code
// Generated by RevenueCat MCP Setup

import Purchases, { 
  PurchasesOffering, 
  CustomerInfo,
  PurchasesPackage,
  PurchasesError,
  PURCHASES_ERROR_CODE
} from 'react-native-purchases';
import { Platform } from 'react-native';

export class RevenueCatService {
  private static instance: RevenueCatService;
  private isInitialized = false;
  
  static getInstance(): RevenueCatService {
    if (!RevenueCatService.instance) {
      RevenueCatService.instance = new RevenueCatService();
    }
    return RevenueCatService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      const apiKey = Platform.select({
        ios: '${config.iosAppId}',
        android: '${config.androidAppId}'
      });

      if (!apiKey) {
        throw new Error('RevenueCat API key not found for platform');
      }

      await Purchases.configure({ 
        apiKey,
        appUserID: null,
        observerMode: false,
        useAmazon: false
      });

      if (__DEV__) {
        Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
      }

      this.isInitialized = true;
      console.log('RevenueCat initialized successfully');
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
      throw error;
    }
  }

  async getOfferings(): Promise<PurchasesOffering | null> {
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
    } catch (error) {
      console.error('Error fetching offerings:', error);
      return null;
    }
  }

  async purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return customerInfo;
    } catch (error) {
      if (error instanceof PurchasesError) {
        if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
          console.log('Purchase cancelled by user');
        }
      }
      throw error;
    }
  }

  async restorePurchases(): Promise<CustomerInfo> {
    try {
      const customerInfo = await Purchases.restorePurchases();
      return customerInfo;
    } catch (error) {
      console.error('Error restoring purchases:', error);
      throw error;
    }
  }

  async getCustomerInfo(): Promise<CustomerInfo> {
    try {
      return await Purchases.getCustomerInfo();
    } catch (error) {
      console.error('Error getting customer info:', error);
      throw error;
    }
  }

  async checkPremiumStatus(): Promise<boolean> {
    try {
      const customerInfo = await this.getCustomerInfo();
      return customerInfo.entitlements.active['premium'] !== undefined;
    } catch (error) {
      console.error('Error checking premium status:', error);
      return false;
    }
  }
}

// Export singleton instance
export const revenueCatService = RevenueCatService.getInstance();
`;

    const filePath = path.join(process.cwd(), "src", "services", "revenueCatService.ts");
    fs.writeFileSync(filePath, code.trim());
    log.success(`Implementation code generated at ${filePath}`);
  }
}

// Main Setup Flow
async function main() {
  console.clear();

  try {
    // Initialize configuration
    const config = new RevenueCatMCPConfig();

    // Collect credentials
    await config.collectCredentials();

    // Setup products, entitlements, and offerings
    await config.setupProducts();
    await config.setupEntitlements();
    await config.setupOfferings();
    await config.setupWebhook();

    // Export configuration
    config.exportConfig();

    // Generate implementation files
    log.step("Generating implementation files...");
    APIConfigGenerator.generateImplementationCode(config.config);

    // Generate iOS configuration
    const iosConfig = APIConfigGenerator.generateIOSConfig(config.config);
    fs.writeFileSync("ios-products.json", JSON.stringify(iosConfig, null, 2));
    log.success("iOS product configuration generated");

    // Generate Android configuration
    const androidConfig = APIConfigGenerator.generateAndroidConfig(config.config);
    fs.writeFileSync("android-products.json", JSON.stringify(androidConfig, null, 2));
    log.success("Android product configuration generated");

    // Start MCP server
    const mcpManager = new MCPServerManager(config.config);

    const startServer = await prompt("\nStart RevenueCat MCP server now? (y/n)");
    if (startServer.toLowerCase() === "y") {
      await mcpManager.start();

      // Keep the server running
      log.info("MCP server is running. Press Ctrl+C to stop.");
      process.on("SIGINT", () => {
        mcpManager.stop();
        process.exit(0);
      });
    }

    // Display summary
    console.log(`\n${colors.green}═══════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}     RevenueCat MCP Setup Complete!${colors.reset}`);
    console.log(`${colors.green}═══════════════════════════════════════════════${colors.reset}\n`);

    console.log(`${colors.cyan}Next Steps:${colors.reset}`);
    console.log("1. Create products in App Store Connect");
    console.log("2. Create products in Google Play Console");
    console.log("3. Link products in RevenueCat Dashboard");
    console.log("4. Deploy webhook endpoint with the generated secret");
    console.log("5. Test purchases in sandbox/test environment");

    console.log(`\n${colors.cyan}Generated Files:${colors.reset}`);
    console.log("- .env.mcp (credentials)");
    console.log("- revenuecat-mcp-config.json (full configuration)");
    console.log("- src/services/revenueCatService.ts (implementation)");
    console.log("- ios-products.json (iOS product config)");
    console.log("- android-products.json (Android product config)");

    console.log(`\n${colors.yellow}Important:${colors.reset}`);
    console.log(`Webhook Secret: ${colors.yellow}${config.config.webhook.secret}${colors.reset}`);
    console.log("Save this secret in your Supabase environment variables!");
  } catch (error) {
    log.error(`Setup failed: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the setup
main().catch(console.error);
