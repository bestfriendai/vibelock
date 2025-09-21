import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

interface MonitoringMetric {
  timestamp: Date;
  value: number | string | boolean;
  metadata?: Record<string, any>;
}

interface UserFlow {
  flowName: string;
  steps: Array<{
    name: string;
    timestamp: Date;
    duration: number;
    success: boolean;
    metadata?: Record<string, any>;
  }>;
  startTime: Date;
  endTime?: Date;
  completed: boolean;
}

interface ErrorReport {
  error: Error | string;
  context: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  deviceInfo: Record<string, any>;
  networkInfo: Record<string, any>;
  userSession?: string;
  stackTrace?: string;
}

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
  threshold?: number;
  exceeded: boolean;
}

interface EngagementMetric {
  action: string;
  screen: string;
  timestamp: Date;
  data?: Record<string, any>;
  sessionId: string;
}

interface HealthReport {
  timestamp: Date;
  uptime: number;
  metrics: {
    authSuccessRate: number;
    messageDeliveryRate: number;
    connectionStability: number;
    crashRate: number;
    averageResponseTime: number;
    activeUsers: number;
    errorRate: number;
  };
  alerts: Alert[];
  recommendations: string[];
}

interface Alert {
  type: 'error' | 'performance' | 'security' | 'availability';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  resolved: boolean;
}

class ProductionMonitor {
  private static instance: ProductionMonitor;
  private sessionId: string;
  private startTime: Date;
  private metrics: Map<string, MonitoringMetric[]> = new Map();
  private userFlows: Map<string, UserFlow> = new Map();
  private errors: ErrorReport[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private engagementMetrics: EngagementMetric[] = [];
  private alerts: Alert[] = [];
  private networkState: any = null;
  private deviceInfo: Record<string, any> = {};
  private analyticsEnabled: boolean = true;
  private dataCollectionConsent: boolean = false;

  // Thresholds for monitoring
  private thresholds = {
    errorRate: 0.05, // 5% error rate
    performanceDegradation: 2.0, // 2x slower than baseline
    authFailureRate: 0.1, // 10% auth failure rate
    messageDeliveryRate: 0.95, // 95% delivery success
    connectionStability: 0.9, // 90% stability
    crashRate: 0.01, // 1% crash rate
    memoryWarning: 0.8, // 80% memory usage
    responseTime: 3000 // 3 seconds
  };

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = new Date();
    this.initializeMonitoring();
  }

  static getInstance(): ProductionMonitor {
    if (!ProductionMonitor.instance) {
      ProductionMonitor.instance = new ProductionMonitor();
    }
    return ProductionMonitor.instance;
  }

  private async initializeMonitoring() {
    // Collect device information
    this.deviceInfo = {
      brand: Device.brand,
      manufacturer: Device.manufacturer,
      modelName: Device.modelName,
      osName: Device.osName,
      osVersion: Device.osVersion,
      deviceType: Device.deviceType,
      isDevice: Device.isDevice,
      platform: Platform.OS,
      appVersion: Application.nativeApplicationVersion,
      buildVersion: Application.nativeBuildVersion
    };

    // Monitor network state
    NetInfo.addEventListener(state => {
      this.networkState = state;
      this.trackNetworkChange(state);
    });

    // Load user consent
    await this.loadDataCollectionConsent();

    // Set up periodic health checks
    setInterval(() => this.performHealthCheck(), 60000); // Every minute

    // Set up alert monitoring
    setInterval(() => this.checkAlerts(), 30000); // Every 30 seconds

    // Clean up old data periodically
    setInterval(() => this.cleanupOldData(), 3600000); // Every hour
  }

  /**
   * Track user flow through the app
   */
  trackUserFlow(flowName: string, step: string, metadata?: Record<string, any>) {
    if (!this.analyticsEnabled || !this.dataCollectionConsent) return;

    const flowKey = `${flowName}-${this.sessionId}`;
    let flow = this.userFlows.get(flowKey);

    if (!flow) {
      flow = {
        flowName,
        steps: [],
        startTime: new Date(),
        completed: false
      };
      this.userFlows.set(flowKey, flow);
    }

    const stepStart = Date.now();
    flow.steps.push({
      name: step,
      timestamp: new Date(),
      duration: 0,
      success: true,
      metadata: this.sanitizeMetadata(metadata)
    });

    // Update step duration when next step starts
    if (flow.steps.length > 1) {
      const previousStep = flow.steps[flow.steps.length - 2];
      previousStep.duration = stepStart - previousStep.timestamp.getTime();
    }

    this.analyzeUserFlow(flow);
  }

  /**
   * Track errors with context
   */
  trackError(error: Error | string, context: Record<string, any>, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') {
    const errorReport: ErrorReport = {
      error: error instanceof Error ? error.message : error,
      context: this.sanitizeMetadata(context),
      severity,
      timestamp: new Date(),
      deviceInfo: this.deviceInfo,
      networkInfo: this.networkState,
      userSession: this.sessionId,
      stackTrace: error instanceof Error ? error.stack : undefined
    };

    this.errors.push(errorReport);

    // Check if error rate is too high
    this.checkErrorRate();

    // Create alert for critical errors
    if (severity === 'critical') {
      this.createAlert('error', `Critical error: ${errorReport.error}`, 'critical');
    }

    // Send to remote monitoring service (if configured)
    this.sendToRemoteMonitoring('error', errorReport);
  }

  /**
   * Track performance metrics
   */
  trackPerformance(operation: string, duration: number, metadata?: Record<string, any>) {
    if (!this.analyticsEnabled || !this.dataCollectionConsent) return;

    const threshold = this.getPerformanceThreshold(operation);
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: new Date(),
      metadata: this.sanitizeMetadata(metadata),
      threshold,
      exceeded: duration > threshold
    };

    this.performanceMetrics.push(metric);

    // Alert on performance degradation
    if (metric.exceeded) {
      const degradationFactor = duration / threshold;
      if (degradationFactor > this.thresholds.performanceDegradation) {
        this.createAlert(
          'performance',
          `Performance degradation detected: ${operation} is ${degradationFactor.toFixed(1)}x slower than expected`,
          'medium'
        );
      }
    }

    this.analyzePerformanceTrends();
  }

  /**
   * Track user engagement
   */
  trackUserEngagement(action: string, screen: string, data?: Record<string, any>) {
    if (!this.analyticsEnabled || !this.dataCollectionConsent) return;

    const metric: EngagementMetric = {
      action,
      screen,
      timestamp: new Date(),
      data: this.sanitizeMetadata(data),
      sessionId: this.sessionId
    };

    this.engagementMetrics.push(metric);
    this.analyzeEngagementPatterns();
  }

  /**
   * Generate health report
   */
  async generateHealthReport(): Promise<HealthReport> {
    const uptime = Date.now() - this.startTime.getTime();
    const recentErrors = this.errors.filter(e =>
      e.timestamp.getTime() > Date.now() - 3600000 // Last hour
    );

    const authMetrics = this.getAuthMetrics();
    const messageMetrics = this.getMessageMetrics();
    const connectionMetrics = this.getConnectionMetrics();
    const performanceMetrics = this.getAveragePerformance();

    const report: HealthReport = {
      timestamp: new Date(),
      uptime,
      metrics: {
        authSuccessRate: authMetrics.successRate,
        messageDeliveryRate: messageMetrics.deliveryRate,
        connectionStability: connectionMetrics.stability,
        crashRate: this.calculateCrashRate(),
        averageResponseTime: performanceMetrics.avgResponseTime,
        activeUsers: this.getActiveUserCount(),
        errorRate: recentErrors.length / Math.max(1, this.getTotalOperations())
      },
      alerts: this.alerts.filter(a => !a.resolved),
      recommendations: this.generateRecommendations()
    };

    // Store report
    await this.storeHealthReport(report);

    return report;
  }

  /**
   * Get authentication metrics
   */
  private getAuthMetrics(): { successRate: number; failures: number } {
    const authFlows = Array.from(this.userFlows.values()).filter(f =>
      f.flowName.includes('Authentication')
    );

    const successful = authFlows.filter(f => f.completed).length;
    const total = Math.max(1, authFlows.length);

    return {
      successRate: successful / total,
      failures: total - successful
    };
  }

  /**
   * Get message delivery metrics
   */
  private getMessageMetrics(): { deliveryRate: number; avgLatency: number } {
    const messageMetrics = this.performanceMetrics.filter(m =>
      m.operation.includes('message')
    );

    const delivered = messageMetrics.filter(m => !m.exceeded).length;
    const total = Math.max(1, messageMetrics.length);
    const avgLatency = messageMetrics.reduce((sum, m) => sum + m.duration, 0) / total;

    return {
      deliveryRate: delivered / total,
      avgLatency
    };
  }

  /**
   * Get connection stability metrics
   */
  private getConnectionMetrics(): { stability: number; disconnections: number } {
    const connectionEvents = this.metrics.get('network_change') || [];
    const disconnections = connectionEvents.filter(e =>
      e.value === false
    ).length;

    const totalTime = Date.now() - this.startTime.getTime();
    const disconnectionTime = disconnections * 5000; // Assume 5s per disconnection

    return {
      stability: Math.max(0, 1 - (disconnectionTime / totalTime)),
      disconnections
    };
  }

  /**
   * Get average performance metrics
   */
  private getAveragePerformance(): { avgResponseTime: number } {
    if (this.performanceMetrics.length === 0) {
      return { avgResponseTime: 0 };
    }

    const totalDuration = this.performanceMetrics.reduce((sum, m) => sum + m.duration, 0);
    return {
      avgResponseTime: totalDuration / this.performanceMetrics.length
    };
  }

  /**
   * Calculate crash rate
   */
  private calculateCrashRate(): number {
    const criticalErrors = this.errors.filter(e => e.severity === 'critical').length;
    const totalSessions = Math.max(1, this.getActiveUserCount());
    return criticalErrors / totalSessions;
  }

  /**
   * Get active user count
   */
  private getActiveUserCount(): number {
    const uniqueSessions = new Set(this.engagementMetrics.map(e => e.sessionId));
    return uniqueSessions.size || 1;
  }

  /**
   * Get total operations count
   */
  private getTotalOperations(): number {
    return this.performanceMetrics.length + this.engagementMetrics.length;
  }

  /**
   * Generate recommendations based on metrics
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const report = {
      authSuccessRate: this.getAuthMetrics().successRate,
      messageDeliveryRate: this.getMessageMetrics().deliveryRate,
      errorRate: this.errors.length / Math.max(1, this.getTotalOperations()),
      avgResponseTime: this.getAveragePerformance().avgResponseTime
    };

    if (report.authSuccessRate < this.thresholds.authFailureRate) {
      recommendations.push('Authentication system needs review - high failure rate detected');
    }

    if (report.messageDeliveryRate < this.thresholds.messageDeliveryRate) {
      recommendations.push('Message delivery issues detected - check network and server status');
    }

    if (report.errorRate > this.thresholds.errorRate) {
      recommendations.push('High error rate detected - review error logs and implement fixes');
    }

    if (report.avgResponseTime > this.thresholds.responseTime) {
      recommendations.push('Performance optimization needed - response times exceeding threshold');
    }

    if (this.alerts.filter(a => !a.resolved && a.severity === 'critical').length > 0) {
      recommendations.push('Critical alerts require immediate attention');
    }

    if (recommendations.length === 0) {
      recommendations.push('System is performing within acceptable parameters');
    }

    return recommendations;
  }

  /**
   * Create alert
   */
  private createAlert(type: Alert['type'], message: string, severity: Alert['severity']) {
    const alert: Alert = {
      type,
      message,
      severity,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.push(alert);

    // Auto-resolve low severity alerts after 1 hour
    if (severity === 'low') {
      setTimeout(() => {
        alert.resolved = true;
      }, 3600000);
    }
  }

  /**
   * Check error rate and create alerts
   */
  private checkErrorRate() {
    const recentErrors = this.errors.filter(e =>
      e.timestamp.getTime() > Date.now() - 600000 // Last 10 minutes
    );

    const errorRate = recentErrors.length / Math.max(1, this.getTotalOperations());

    if (errorRate > this.thresholds.errorRate) {
      this.createAlert(
        'error',
        `Error rate (${(errorRate * 100).toFixed(1)}%) exceeds threshold`,
        errorRate > this.thresholds.errorRate * 2 ? 'high' : 'medium'
      );
    }
  }

  /**
   * Check alerts periodically
   */
  private checkAlerts() {
    // Auto-resolve alerts that haven't recurred
    this.alerts.forEach(alert => {
      if (!alert.resolved && alert.timestamp.getTime() < Date.now() - 3600000) {
        // Check if issue persists
        const stillActive = this.checkAlertCondition(alert);
        if (!stillActive) {
          alert.resolved = true;
        }
      }
    });
  }

  /**
   * Check if alert condition still exists
   */
  private checkAlertCondition(alert: Alert): boolean {
    switch (alert.type) {
      case 'error':
        const errorRate = this.errors.length / Math.max(1, this.getTotalOperations());
        return errorRate > this.thresholds.errorRate;

      case 'performance':
        const recent = this.performanceMetrics.filter(m =>
          m.timestamp.getTime() > Date.now() - 600000
        );
        return recent.some(m => m.exceeded);

      default:
        return false;
    }
  }

  /**
   * Perform health check
   */
  private async performHealthCheck() {
    const report = await this.generateHealthReport();

    // Check critical metrics
    if (report.metrics.crashRate > this.thresholds.crashRate) {
      this.createAlert('availability', 'High crash rate detected', 'critical');
    }

    if (report.metrics.connectionStability < this.thresholds.connectionStability) {
      this.createAlert('availability', 'Connection stability issues', 'high');
    }
  }

  /**
   * Track network changes
   */
  private trackNetworkChange(state: any) {
    this.addMetric('network_change', state.isConnected, {
      type: state.type,
      isInternetReachable: state.isInternetReachable
    });

    if (!state.isConnected) {
      this.createAlert('availability', 'Network disconnection detected', 'medium');
    }
  }

  /**
   * Analyze user flow patterns
   */
  private analyzeUserFlow(flow: UserFlow) {
    // Check for incomplete flows
    const flowDuration = Date.now() - flow.startTime.getTime();
    if (flowDuration > 300000 && !flow.completed) { // 5 minutes
      this.createAlert(
        'performance',
        `User flow "${flow.flowName}" taking too long`,
        'low'
      );
    }
  }

  /**
   * Analyze performance trends
   */
  private analyzePerformanceTrends() {
    const recentMetrics = this.performanceMetrics.filter(m =>
      m.timestamp.getTime() > Date.now() - 600000 // Last 10 minutes
    );

    const operations = new Map<string, number[]>();
    recentMetrics.forEach(m => {
      if (!operations.has(m.operation)) {
        operations.set(m.operation, []);
      }
      operations.get(m.operation)!.push(m.duration);
    });

    // Check for trending performance issues
    operations.forEach((durations, operation) => {
      if (durations.length >= 5) {
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        const threshold = this.getPerformanceThreshold(operation);

        if (avg > threshold * 1.5) {
          this.createAlert(
            'performance',
            `Performance degradation trend for ${operation}`,
            'medium'
          );
        }
      }
    });
  }

  /**
   * Analyze engagement patterns
   */
  private analyzeEngagementPatterns() {
    const recentEngagement = this.engagementMetrics.filter(e =>
      e.timestamp.getTime() > Date.now() - 3600000 // Last hour
    );

    // Track feature usage
    const featureUsage = new Map<string, number>();
    recentEngagement.forEach(e => {
      const key = `${e.screen}:${e.action}`;
      featureUsage.set(key, (featureUsage.get(key) || 0) + 1);
    });

    // Store for analytics
    this.addMetric('feature_usage', Object.fromEntries(featureUsage));
  }

  /**
   * Get performance threshold for operation
   */
  private getPerformanceThreshold(operation: string): number {
    const thresholds: Record<string, number> = {
      'auth': 2000,
      'message-send': 1000,
      'message-receive': 500,
      'room-load': 3000,
      'image-upload': 5000,
      'voice-record': 100,
      'search': 1500
    };

    for (const [key, value] of Object.entries(thresholds)) {
      if (operation.toLowerCase().includes(key)) {
        return value;
      }
    }

    return this.thresholds.responseTime;
  }

  /**
   * Sanitize metadata to remove sensitive information
   */
  private sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;

    const sanitized: Record<string, any> = {};
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential'];

    for (const [key, value] of Object.entries(metadata)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeMetadata(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Add metric
   */
  private addMetric(name: string, value: any, metadata?: Record<string, any>) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name)!.push({
      timestamp: new Date(),
      value,
      metadata
    });
  }

  /**
   * Send data to remote monitoring service
   */
  private async sendToRemoteMonitoring(type: string, data: any) {
    // Implementation would send to actual monitoring service
    // For now, just log
    if (__DEV__) {
      console.log(`[ProductionMonitor] ${type}:`, data);
    }
  }

  /**
   * Store health report
   */
  private async storeHealthReport(report: HealthReport) {
    try {
      const reports = await this.getStoredReports();
      reports.push(report);

      // Keep only last 24 hours of reports
      const cutoff = Date.now() - 86400000;
      const filtered = reports.filter(r =>
        new Date(r.timestamp).getTime() > cutoff
      );

      await AsyncStorage.setItem(
        '@production_health_reports',
        JSON.stringify(filtered)
      );
    } catch (error) {
      console.error('Failed to store health report:', error);
    }
  }

  /**
   * Get stored health reports
   */
  private async getStoredReports(): Promise<HealthReport[]> {
    try {
      const stored = await AsyncStorage.getItem('@production_health_reports');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Load data collection consent
   */
  private async loadDataCollectionConsent() {
    try {
      const consent = await AsyncStorage.getItem('@data_collection_consent');
      this.dataCollectionConsent = consent === 'true';
    } catch {
      this.dataCollectionConsent = false;
    }
  }

  /**
   * Set data collection consent
   */
  async setDataCollectionConsent(consent: boolean) {
    this.dataCollectionConsent = consent;
    await AsyncStorage.setItem('@data_collection_consent', consent.toString());
  }

  /**
   * Clean up old data
   */
  private cleanupOldData() {
    const cutoff = Date.now() - 86400000; // 24 hours

    // Clean errors
    this.errors = this.errors.filter(e =>
      e.timestamp.getTime() > cutoff
    );

    // Clean performance metrics
    this.performanceMetrics = this.performanceMetrics.filter(m =>
      m.timestamp.getTime() > cutoff
    );

    // Clean engagement metrics
    this.engagementMetrics = this.engagementMetrics.filter(e =>
      e.timestamp.getTime() > cutoff
    );

    // Clean resolved alerts
    this.alerts = this.alerts.filter(a =>
      !a.resolved || a.timestamp.getTime() > cutoff
    );

    // Clean metrics
    this.metrics.forEach((values, key) => {
      const filtered = values.filter(v =>
        v.timestamp.getTime() > cutoff
      );
      this.metrics.set(key, filtered);
    });
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Export monitoring data for analysis
   */
  async exportMonitoringData(): Promise<string> {
    const data = {
      sessionId: this.sessionId,
      startTime: this.startTime,
      deviceInfo: this.deviceInfo,
      metrics: Object.fromEntries(this.metrics),
      userFlows: Array.from(this.userFlows.values()),
      errors: this.errors,
      performanceMetrics: this.performanceMetrics,
      engagementMetrics: this.engagementMetrics,
      alerts: this.alerts,
      healthReports: await this.getStoredReports()
    };

    return JSON.stringify(data, null, 2);
  }
}

// Export singleton instance
export const productionMonitor = ProductionMonitor.getInstance();