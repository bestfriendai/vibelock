// Debug Utilities for Real-time Connection Issues
// Comprehensive debugging tools for React Native/Expo and Supabase realtime

import { supabase } from "../config/supabase";
import { enhancedRealtimeChatService } from "../services/realtimeChat";
import { reliableNetworkCheck, waitForStableConnection } from "./reliableNetworkCheck";
import { appStateManager } from "../services/appStateManager";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";

interface DebugReport {
  timestamp: Date;
  category: string;
  status: "pass" | "fail" | "warning";
  message: string;
  details?: any;
}

class DebugUtils {
  private reports: DebugReport[] = [];
  private isDebugging = false;

  /**
   * Debug realtime connection comprehensively
   */
  async debugRealtimeConnection(): Promise<DebugReport[]> {
    console.log("🔍 Starting comprehensive realtime connection debug...");
    this.reports = [];
    this.isDebugging = true;

    try {
      // 1. Check Supabase client configuration
      await this.checkSupabaseConfig();

      // 2. Check transport method
      await this.checkTransportMethod();

      // 3. Check WebSocket connectivity
      await this.checkWebSocketConnectivity();

      // 4. Check realtime channels
      await this.checkRealtimeChannels();

      // 5. Test message sending
      await this.testMessageSending();

      // 6. Check subscription states
      await this.checkSubscriptionStates();
    } catch (error) {
      this.addReport("general", "fail", "Debug process failed", error);
    } finally {
      this.isDebugging = false;
    }

    return this.reports;
  }

  /**
   * Check Supabase configuration
   */
  private async checkSupabaseConfig(): Promise<void> {
    try {
      const config = (supabase as any).realtimeConfig || (supabase as any).realtime?.config;

      if (config) {
        const transport = config.transport || "unknown";
        const hasWebWorkers = config.worker !== false;

        this.addReport(
          "config",
          hasWebWorkers ? "warning" : "pass",
          `Supabase config: transport=${transport}, webWorkers=${hasWebWorkers}`,
          config,
        );

        if (hasWebWorkers) {
          this.addReport("config", "warning", "⚠️ Web Workers may be enabled - this can cause issues in React Native");
        }
      } else {
        this.addReport("config", "warning", "Unable to access Supabase realtime config");
      }

      // Check if environment variables are set
      const hasUrl = !!process.env.EXPO_PUBLIC_SUPABASE_URL;
      const hasKey = !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      this.addReport("env", hasUrl && hasKey ? "pass" : "fail", `Environment: URL=${hasUrl}, KEY=${hasKey}`);
    } catch (error) {
      this.addReport("config", "fail", "Failed to check Supabase config", error);
    }
  }

  /**
   * Check transport method being used
   */
  private async checkTransportMethod(): Promise<void> {
    try {
      // Check for Web Workers availability
      const hasWebWorkers = typeof Worker !== "undefined";

      this.addReport(
        "transport",
        hasWebWorkers ? "warning" : "pass",
        `Web Workers ${hasWebWorkers ? "detected" : "not available"} in environment`,
      );

      // Check WebSocket availability
      const hasWebSocket = typeof WebSocket !== "undefined";

      this.addReport(
        "transport",
        hasWebSocket ? "pass" : "fail",
        `WebSocket ${hasWebSocket ? "available" : "not available"}`,
      );

      // Check actual transport from realtime client
      const realtimeClient = (supabase as any).realtime;
      if (realtimeClient) {
        const transport = realtimeClient._transport || realtimeClient.transport || "unknown";

        this.addReport(
          "transport",
          transport === "websocket" ? "pass" : "warning",
          `Realtime using transport: ${transport}`,
        );
      }
    } catch (error) {
      this.addReport("transport", "fail", "Failed to check transport method", error);
    }
  }

  /**
   * Check WebSocket connectivity
   */
  private async checkWebSocketConnectivity(): Promise<void> {
    try {
      const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
      if (!url) {
        this.addReport("websocket", "fail", "No Supabase URL configured");
        return;
      }

      // Convert HTTP URL to WebSocket URL
      const wsUrl = url.replace("https://", "wss://").replace("http://", "ws://");
      const testUrl = `${wsUrl}/realtime/v1/websocket`;

      // Test WebSocket connection
      const ws = new WebSocket(testUrl);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error("WebSocket connection timeout"));
        }, 5000);

        ws.onopen = () => {
          clearTimeout(timeout);
          this.addReport("websocket", "pass", "WebSocket connection successful");
          ws.close();
          resolve();
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          this.addReport("websocket", "fail", "WebSocket connection failed", error);
          reject(error);
        };
      });
    } catch (error) {
      this.addReport("websocket", "fail", "WebSocket test failed", error);
    }
  }

  /**
   * Check realtime channels
   */
  private async checkRealtimeChannels(): Promise<void> {
    try {
      const channels = (supabase as any).realtime?.channels || [];

      this.addReport(
        "channels",
        "pass",
        `Active channels: ${channels.length}`,
        channels.map((c: any) => c.topic),
      );

      // Check if realtime is connected
      const isConnected = supabase.realtime?.isConnected?.() ?? false;

      this.addReport("channels", isConnected ? "pass" : "warning", `Realtime connected: ${isConnected}`);
    } catch (error) {
      this.addReport("channels", "fail", "Failed to check channels", error);
    }
  }

  /**
   * Test message sending capability
   */
  private async testMessageSending(): Promise<void> {
    try {
      // Create a test channel
      const testChannel = supabase.channel(`debug_test_${Date.now()}`);

      let received = false;

      // Subscribe to broadcasts
      testChannel.on("broadcast", { event: "test" }, (payload) => {
        received = true;
        this.addReport("messaging", "pass", "Test message received", payload);
      });

      // Subscribe to channel
      await new Promise<void>((resolve) => {
        testChannel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            resolve();
          }
        });
      });

      // Send test message
      await testChannel.send({
        type: "broadcast",
        event: "test",
        payload: { test: true, timestamp: Date.now() },
      });

      // Wait for message
      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (!received) {
        this.addReport("messaging", "warning", "Test message not received within timeout");
      }

      // Cleanup
      await testChannel.unsubscribe();
    } catch (error) {
      this.addReport("messaging", "fail", "Message test failed", error);
    }
  }

  /**
   * Check subscription states
   */
  private async checkSubscriptionStates(): Promise<void> {
    try {
      const activeRooms = enhancedRealtimeChatService.getActiveRoomIds();
      const subscribedCount = enhancedRealtimeChatService.getActiveSubscriptionsCount();

      this.addReport(
        "subscriptions",
        "pass",
        `Active rooms: ${activeRooms.length}, Subscriptions: ${subscribedCount}`,
        { rooms: activeRooms },
      );
    } catch (error) {
      this.addReport("subscriptions", "fail", "Failed to check subscriptions", error);
    }
  }

  /**
   * Debug Web Workers compatibility
   */
  async debugWebWorkersCompatibility(): Promise<DebugReport[]> {
    console.log("🔍 Debugging Web Workers compatibility...");
    this.reports = [];

    try {
      // Check if Web Workers are available
      const hasWorkers = typeof Worker !== "undefined";

      this.addReport(
        "workers",
        hasWorkers ? "warning" : "pass",
        `Web Workers ${hasWorkers ? "detected" : "not available"}`,
      );

      if (hasWorkers) {
        // Try to create a worker (will likely fail in React Native)
        try {
          const blob = new Blob(['self.postMessage("test");'], { type: "application/javascript" });
          const url = URL.createObjectURL(blob);
          const worker = new Worker(url);

          this.addReport("workers", "fail", "⚠️ Web Worker creation succeeded - unexpected in React Native!");
          worker.terminate();
          URL.revokeObjectURL(url);
        } catch (error) {
          this.addReport("workers", "pass", "Web Worker creation failed as expected in React Native");
        }
      }

      // Check SharedWorker (another potential issue)
      const hasSharedWorkers = typeof SharedWorker !== "undefined";

      this.addReport(
        "workers",
        hasSharedWorkers ? "warning" : "pass",
        `SharedWorker ${hasSharedWorkers ? "detected" : "not available"}`,
      );
    } catch (error) {
      this.addReport("workers", "fail", "Web Workers check failed", error);
    }

    return this.reports;
  }

  /**
   * Debug network connectivity
   */
  async debugNetworkConnectivity(): Promise<DebugReport[]> {
    console.log("🔍 Debugging network connectivity...");
    this.reports = [];

    try {
      // NetInfo state
      const netInfo = await NetInfo.fetch();

      this.addReport(
        "network",
        netInfo.isConnected ? "pass" : "fail",
        `NetInfo: connected=${netInfo.isConnected}, type=${netInfo.type}`,
        netInfo,
      );

      // Reliable network check
      const reliableCheck = await reliableNetworkCheck();

      this.addReport(
        "network",
        reliableCheck.isOnline ? "pass" : "fail",
        `Reliable check: online=${reliableCheck.isOnline}, stable=${reliableCheck.isStable}, latency=${reliableCheck.latency}ms`,
        reliableCheck,
      );

      // Test stable connection
      const isStable = await waitForStableConnection(3, 1000);

      this.addReport("network", isStable ? "pass" : "warning", `Stable connection: ${isStable}`);

      // Check Supabase connectivity
      const { data, error } = await supabase.from("chat_rooms_firebase").select("count").limit(1);

      this.addReport(
        "network",
        !error ? "pass" : "fail",
        `Supabase API ${!error ? "reachable" : "unreachable"}`,
        error,
      );
    } catch (error) {
      this.addReport("network", "fail", "Network check failed", error);
    }

    return this.reports;
  }

  /**
   * Debug AppState transitions
   */
  async debugAppStateTransitions(): Promise<DebugReport[]> {
    console.log("🔍 Debugging AppState transitions...");
    this.reports = [];

    try {
      // Current AppState
      const currentState = AppState.currentState;

      this.addReport("appstate", "pass", `Current AppState: ${currentState}`);

      // AppStateManager status
      const managerInfo = appStateManager.getDebugInfo();

      this.addReport(
        "appstate",
        managerInfo.isInitialized ? "pass" : "warning",
        `AppStateManager initialized: ${managerInfo.isInitialized}`,
        managerInfo,
      );

      // Monitor state changes for 5 seconds
      console.log("📱 Monitoring AppState changes for 5 seconds...");

      const listener = AppState.addEventListener("change", (nextState) => {
        this.addReport("appstate", "pass", `AppState changed to: ${nextState}`);
      });

      await new Promise((resolve) => setTimeout(resolve, 5000));
      listener.remove();
    } catch (error) {
      this.addReport("appstate", "fail", "AppState debug failed", error);
    }

    return this.reports;
  }

  /**
   * Generate comprehensive connection report
   */
  async generateConnectionReport(): Promise<string> {
    console.log("📊 Generating comprehensive connection report...");

    const sections = [
      { name: "Realtime Connection", fn: () => this.debugRealtimeConnection() },
      { name: "Web Workers", fn: () => this.debugWebWorkersCompatibility() },
      { name: "Network", fn: () => this.debugNetworkConnectivity() },
      { name: "AppState", fn: () => this.debugAppStateTransitions() },
    ];

    let report = "=== REALTIME CONNECTION DEBUG REPORT ===\n";
    report += `Generated: ${new Date().toISOString()}\n\n`;

    for (const section of sections) {
      report += `--- ${section.name} ---\n`;

      try {
        const results = await section.fn();

        for (const result of results) {
          const icon = result.status === "pass" ? "✅" : result.status === "fail" ? "❌" : "⚠️";

          report += `${icon} [${result.category}] ${result.message}\n`;

          if (result.details) {
            report += `   Details: ${JSON.stringify(result.details, null, 2)}\n`;
          }
        }
      } catch (error) {
        report += `❌ Section failed: ${error}\n`;
      }

      report += "\n";
    }

    // Summary
    const allReports = this.reports;
    const passed = allReports.filter((r) => r.status === "pass").length;
    const failed = allReports.filter((r) => r.status === "fail").length;
    const warnings = allReports.filter((r) => r.status === "warning").length;

    report += "--- SUMMARY ---\n";
    report += `✅ Passed: ${passed}\n`;
    report += `❌ Failed: ${failed}\n`;
    report += `⚠️ Warnings: ${warnings}\n`;

    // Recommendations
    if (failed > 0 || warnings > 0) {
      report += "\n--- RECOMMENDATIONS ---\n";

      if (allReports.some((r) => r.message.includes("Web Workers"))) {
        report += "• Web Workers detected - ensure Supabase is configured for WebSocket-only transport\n";
      }

      if (allReports.some((r) => r.category === "network" && r.status === "fail")) {
        report += "• Network issues detected - check internet connectivity and firewall settings\n";
      }

      if (allReports.some((r) => r.category === "websocket" && r.status === "fail")) {
        report += "• WebSocket connection failed - check if WSS protocol is allowed\n";
      }
    }

    console.log(report);
    return report;
  }

  /**
   * Add a report entry
   */
  private addReport(category: string, status: "pass" | "fail" | "warning", message: string, details?: any): void {
    const report: DebugReport = {
      timestamp: new Date(),
      category,
      status,
      message,
      details,
    };

    this.reports.push(report);

    // Log immediately
    const icon = status === "pass" ? "✅" : status === "fail" ? "❌" : "⚠️";
    console.log(`${icon} [${category}] ${message}`);
    if (details) {
      console.log("   Details:", details);
    }
  }

  /**
   * Quick connection test
   */
  async quickConnectionTest(): Promise<boolean> {
    try {
      console.log("⚡ Running quick connection test...");

      // 1. Check network
      const network = await reliableNetworkCheck();
      if (!network.isOnline) {
        console.log("❌ Network offline");
        return false;
      }

      // 2. Check Supabase
      const { error } = await supabase.from("chat_rooms_firebase").select("count").limit(1);
      if (error) {
        console.log("❌ Supabase unreachable");
        return false;
      }

      // 3. Check realtime
      const isConnected = supabase.realtime?.isConnected?.() ?? false;
      if (!isConnected) {
        console.log("⚠️ Realtime not connected");
        return false;
      }

      console.log("✅ Connection test passed");
      return true;
    } catch (error) {
      console.log("❌ Connection test failed:", error);
      return false;
    }
  }
}

// Export singleton instance
export const debugUtils = new DebugUtils();
export default debugUtils;
