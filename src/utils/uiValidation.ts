import { AccessibilityInfo, Platform } from 'react-native';
import { captureScreen } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import { performanceMonitor } from './performance';
import { productionMonitor } from '../services/productionMonitoring';

interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  screenshot?: string;
  metrics?: Record<string, any>;
}

interface UIElement {
  id: string;
  type: string;
  visible: boolean;
  accessible: boolean;
  label?: string;
  hint?: string;
  role?: string;
  state?: Record<string, any>;
}

interface ValidationRule {
  name: string;
  check: () => boolean | Promise<boolean>;
  errorMessage: string;
  severity: 'error' | 'warning' | 'suggestion';
}

interface AccessibilityIssue {
  element: string;
  issue: string;
  severity: 'high' | 'medium' | 'low';
  wcagCriteria?: string;
}

interface PerformanceThreshold {
  metric: string;
  threshold: number;
  actual: number;
  passed: boolean;
}

interface UIReport {
  timestamp: Date;
  screen: string;
  validationResults: ValidationResult;
  accessibilityScore: number;
  performanceScore: number;
  userExperienceScore: number;
  issues: Array<{
    type: string;
    description: string;
    severity: string;
  }>;
  recommendations: string[];
  screenshots: string[];
}

export class UIValidator {
  private static instance: UIValidator;
  private validationRules: Map<string, ValidationRule[]> = new Map();
  private screenshots: string[] = [];
  private reports: UIReport[] = [];
  private currentScreen: string = '';

  constructor() {
    this.initializeValidationRules();
  }

  static getInstance(): UIValidator {
    if (!UIValidator.instance) {
      UIValidator.instance = new UIValidator();
    }
    return UIValidator.instance;
  }

  /**
   * Initialize default validation rules
   */
  private initializeValidationRules() {
    // Loading state rules
    this.addRule('loading', {
      name: 'Loading Indicator Present',
      check: () => this.checkElementExists('loadingIndicator'),
      errorMessage: 'No loading indicator present during async operations',
      severity: 'error'
    });

    // Error state rules
    this.addRule('error', {
      name: 'Error Message Display',
      check: () => this.checkElementExists('errorMessage'),
      errorMessage: 'Error messages not properly displayed to users',
      severity: 'error'
    });

    // Accessibility rules
    this.addRule('accessibility', {
      name: 'Screen Reader Labels',
      check: () => this.checkAccessibilityLabels(),
      errorMessage: 'Missing accessibility labels on interactive elements',
      severity: 'error'
    });

    // Performance rules
    this.addRule('performance', {
      name: 'Render Performance',
      check: () => this.checkRenderPerformance(),
      errorMessage: 'Screen render time exceeds acceptable threshold',
      severity: 'warning'
    });

    // Responsive design rules
    this.addRule('responsive', {
      name: 'Responsive Layout',
      check: () => this.checkResponsiveDesign(),
      errorMessage: 'Layout issues detected on current screen size',
      severity: 'warning'
    });
  }

  /**
   * Validate screen state
   */
  async validateScreenState(screenName: string, expectedElements: string[]): Promise<ValidationResult> {
    this.currentScreen = screenName;
    const result: ValidationResult = {
      passed: true,
      errors: [],
      warnings: [],
      suggestions: [],
      metrics: {}
    };

    const startTime = Date.now();

    // Check expected elements
    for (const element of expectedElements) {
      const exists = await this.checkElementExists(element);
      if (!exists) {
        result.errors.push(`Expected element "${element}" not found`);
        result.passed = false;
      }
    }

    // Run validation rules
    const rules = this.validationRules.get('common') || [];
    for (const rule of rules) {
      try {
        const passed = await rule.check();
        if (!passed) {
          switch (rule.severity) {
            case 'error':
              result.errors.push(rule.errorMessage);
              result.passed = false;
              break;
            case 'warning':
              result.warnings.push(rule.errorMessage);
              break;
            case 'suggestion':
              result.suggestions.push(rule.errorMessage);
              break;
          }
        }
      } catch (error) {
        result.warnings.push(`Validation rule "${rule.name}" failed: ${error}`);
      }
    }

    // Capture screenshot if validation failed
    if (!result.passed) {
      result.screenshot = await this.captureValidationScreenshot(screenName);
    }

    // Record metrics
    result.metrics = {
      validationDuration: Date.now() - startTime,
      elementCount: expectedElements.length,
      errorCount: result.errors.length,
      warningCount: result.warnings.length
    };

    // Track with production monitor
    productionMonitor.trackPerformance(`ui_validation_${screenName}`, result.metrics.validationDuration, {
      passed: result.passed,
      errors: result.errors.length
    });

    return result;
  }

  /**
   * Validate user flow
   */
  async validateUserFlow(flowSteps: Array<{
    screen: string;
    action: string;
    expectedResult: string;
  }>): Promise<ValidationResult> {
    const result: ValidationResult = {
      passed: true,
      errors: [],
      warnings: [],
      suggestions: [],
      metrics: {}
    };

    const startTime = Date.now();

    for (const step of flowSteps) {
      try {
        // Track flow step
        productionMonitor.trackUserFlow('UIValidation', `${step.screen}:${step.action}`);

        // Validate screen state
        const screenResult = await this.validateScreenState(step.screen, []);

        if (!screenResult.passed) {
          result.errors.push(`Flow step failed at ${step.screen}: ${screenResult.errors.join(', ')}`);
          result.passed = false;
        }

        // Check expected result
        const resultValid = await this.validateExpectedResult(step.expectedResult);
        if (!resultValid) {
          result.errors.push(`Expected result not achieved: ${step.expectedResult}`);
          result.passed = false;
        }

      } catch (error: any) {
        result.errors.push(`Flow validation error: ${error.message}`);
        result.passed = false;
      }
    }

    result.metrics = {
      flowDuration: Date.now() - startTime,
      stepsCompleted: flowSteps.length,
      flowPassed: result.passed
    };

    return result;
  }

  /**
   * Validate accessibility compliance
   */
  async validateAccessibility(component?: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      passed: true,
      errors: [],
      warnings: [],
      suggestions: [],
      metrics: {}
    };

    const issues: AccessibilityIssue[] = [];

    // Check screen reader support
    const screenReaderEnabled = await this.checkScreenReaderEnabled();
    if (!screenReaderEnabled) {
      result.suggestions.push('Screen reader is not enabled for testing');
    }

    // Check color contrast
    const contrastIssues = await this.checkColorContrast();
    if (contrastIssues.length > 0) {
      issues.push(...contrastIssues);
    }

    // Check touch target sizes
    const touchTargetIssues = await this.checkTouchTargetSizes();
    if (touchTargetIssues.length > 0) {
      issues.push(...touchTargetIssues);
    }

    // Check focus management
    const focusIssues = await this.checkFocusManagement();
    if (focusIssues.length > 0) {
      issues.push(...focusIssues);
    }

    // Check text scaling
    const textScalingIssues = await this.checkTextScaling();
    if (textScalingIssues.length > 0) {
      issues.push(...textScalingIssues);
    }

    // Process issues
    for (const issue of issues) {
      switch (issue.severity) {
        case 'high':
          result.errors.push(issue.issue);
          result.passed = false;
          break;
        case 'medium':
          result.warnings.push(issue.issue);
          break;
        case 'low':
          result.suggestions.push(issue.issue);
          break;
      }
    }

    // Calculate accessibility score
    const score = this.calculateAccessibilityScore(issues);
    result.metrics = {
      accessibilityScore: score,
      issueCount: issues.length,
      highSeverityCount: issues.filter(i => i.severity === 'high').length
    };

    // Add WCAG compliance recommendations
    if (score < 90) {
      result.suggestions.push('Consider WCAG 2.1 Level AA compliance review');
    }

    return result;
  }

  /**
   * Validate performance metrics
   */
  async validatePerformance(operation: string, thresholds: Record<string, number>): Promise<ValidationResult> {
    const result: ValidationResult = {
      passed: true,
      errors: [],
      warnings: [],
      suggestions: [],
      metrics: {}
    };

    const metrics = performanceMonitor.getDetailedMetrics();
    const thresholdResults: PerformanceThreshold[] = [];

    // Check each threshold
    for (const [metric, threshold] of Object.entries(thresholds)) {
      const actual = this.getMetricValue(metrics, metric);
      const passed = actual <= threshold;

      thresholdResults.push({
        metric,
        threshold,
        actual,
        passed
      });

      if (!passed) {
        const exceedancePercent = ((actual - threshold) / threshold * 100).toFixed(1);

        if (exceedancePercent > '50') {
          result.errors.push(`${metric} exceeds threshold by ${exceedancePercent}%`);
          result.passed = false;
        } else {
          result.warnings.push(`${metric} exceeds threshold by ${exceedancePercent}%`);
        }
      }
    }

    result.metrics = {
      operation,
      thresholdResults,
      overallScore: this.calculatePerformanceScore(thresholdResults)
    };

    // Add performance recommendations
    if (!result.passed) {
      result.suggestions.push('Consider performance optimization for slow operations');
      result.suggestions.push('Profile the app to identify bottlenecks');
    }

    return result;
  }

  /**
   * Generate comprehensive UI report
   */
  async generateUIReport(): Promise<UIReport> {
    const validationResult = await this.validateScreenState(this.currentScreen, []);
    const accessibilityResult = await this.validateAccessibility();
    const performanceResult = await this.validatePerformance('overall', {
      renderTime: 100,
      responseTime: 1000,
      animationFPS: 60
    });

    const report: UIReport = {
      timestamp: new Date(),
      screen: this.currentScreen,
      validationResults: validationResult,
      accessibilityScore: accessibilityResult.metrics?.accessibilityScore || 0,
      performanceScore: performanceResult.metrics?.overallScore || 0,
      userExperienceScore: this.calculateUXScore(validationResult, accessibilityResult, performanceResult),
      issues: this.consolidateIssues(validationResult, accessibilityResult, performanceResult),
      recommendations: this.generateRecommendations(validationResult, accessibilityResult, performanceResult),
      screenshots: this.screenshots
    };

    this.reports.push(report);
    return report;
  }

  /**
   * Check if element exists
   */
  private async checkElementExists(elementId: string): Promise<boolean> {
    // In a real implementation, this would check the actual UI tree
    // For now, simulate with random success
    return Math.random() > 0.2;
  }

  /**
   * Check accessibility labels
   */
  private async checkAccessibilityLabels(): Promise<boolean> {
    // Check if accessibility labels are present
    try {
      const isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
      const isScreenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();

      // In production, would check actual UI elements
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check render performance
   */
  private checkRenderPerformance(): boolean {
    const metrics = performanceMonitor.getDetailedMetrics();
    return metrics.avgRenderTime < 100; // 100ms threshold
  }

  /**
   * Check responsive design
   */
  private checkResponsiveDesign(): boolean {
    // In production, would check actual layout measurements
    return true;
  }

  /**
   * Check screen reader enabled
   */
  private async checkScreenReaderEnabled(): Promise<boolean> {
    try {
      return await AccessibilityInfo.isScreenReaderEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Check color contrast
   */
  private async checkColorContrast(): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    // In production, would analyze actual color values
    // For now, return empty array

    return issues;
  }

  /**
   * Check touch target sizes
   */
  private async checkTouchTargetSizes(): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];
    const MIN_TOUCH_TARGET_SIZE = 44; // iOS HIG recommendation

    // In production, would measure actual touch targets
    // For now, simulate some checks

    return issues;
  }

  /**
   * Check focus management
   */
  private async checkFocusManagement(): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    // Check for proper focus order
    // Check for focus traps
    // Check for focus indicators

    return issues;
  }

  /**
   * Check text scaling
   */
  private async checkTextScaling(): Promise<AccessibilityIssue[]> {
    const issues: AccessibilityIssue[] = [];

    // Check if text scales properly
    // Check for text truncation
    // Check for minimum text sizes

    return issues;
  }

  /**
   * Validate expected result
   */
  private async validateExpectedResult(expectedResult: string): Promise<boolean> {
    // In production, would check actual UI state
    return true;
  }

  /**
   * Calculate accessibility score
   */
  private calculateAccessibilityScore(issues: AccessibilityIssue[]): number {
    if (issues.length === 0) return 100;

    const weights = { high: 10, medium: 5, low: 2 };
    const totalWeight = issues.reduce((sum, issue) => sum + weights[issue.severity], 0);
    const maxWeight = issues.length * weights.high;

    return Math.max(0, 100 - (totalWeight / maxWeight * 100));
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(results: PerformanceThreshold[]): number {
    if (results.length === 0) return 100;

    const passedCount = results.filter(r => r.passed).length;
    return (passedCount / results.length) * 100;
  }

  /**
   * Calculate UX score
   */
  private calculateUXScore(...results: ValidationResult[]): number {
    const scores = results.map(r => {
      const errorPenalty = r.errors.length * 10;
      const warningPenalty = r.warnings.length * 5;
      return Math.max(0, 100 - errorPenalty - warningPenalty);
    });

    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  /**
   * Get metric value
   */
  private getMetricValue(metrics: any, metricName: string): number {
    switch (metricName) {
      case 'renderTime':
        return metrics.avgRenderTime || 0;
      case 'responseTime':
        return metrics.avgScrollTime || 0;
      case 'animationFPS':
        return metrics.fps || 60;
      default:
        return 0;
    }
  }

  /**
   * Consolidate issues
   */
  private consolidateIssues(...results: ValidationResult[]): Array<{
    type: string;
    description: string;
    severity: string;
  }> {
    const issues: Array<{ type: string; description: string; severity: string }> = [];

    for (const result of results) {
      result.errors.forEach(error => {
        issues.push({ type: 'error', description: error, severity: 'high' });
      });

      result.warnings.forEach(warning => {
        issues.push({ type: 'warning', description: warning, severity: 'medium' });
      });

      result.suggestions.forEach(suggestion => {
        issues.push({ type: 'suggestion', description: suggestion, severity: 'low' });
      });
    }

    return issues;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(...results: ValidationResult[]): string[] {
    const recommendations: string[] = [];
    const allErrors = results.flatMap(r => r.errors);
    const allWarnings = results.flatMap(r => r.warnings);

    if (allErrors.length > 0) {
      recommendations.push('Address critical UI errors immediately');
    }

    if (allWarnings.length > 5) {
      recommendations.push('Review and fix UI warnings to improve user experience');
    }

    const accessibilityScore = results[0]?.metrics?.accessibilityScore || 100;
    if (accessibilityScore < 80) {
      recommendations.push('Improve accessibility compliance for better inclusivity');
    }

    const performanceScore = results[0]?.metrics?.overallScore || 100;
    if (performanceScore < 80) {
      recommendations.push('Optimize performance for better user experience');
    }

    if (recommendations.length === 0) {
      recommendations.push('UI validation passed - maintain current standards');
    }

    return recommendations;
  }

  /**
   * Capture validation screenshot
   */
  private async captureValidationScreenshot(screenName: string): Promise<string | undefined> {
    try {
      const uri = await captureScreen({
        format: 'png',
        quality: 0.8
      });

      const fileName = `ui_validation_${screenName}_${Date.now()}.png`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.copyAsync({ from: uri, to: fileUri });
      this.screenshots.push(fileUri);

      return fileUri;
    } catch (error) {
      console.warn('Failed to capture validation screenshot:', error);
      return undefined;
    }
  }

  /**
   * Add validation rule
   */
  addRule(category: string, rule: ValidationRule) {
    if (!this.validationRules.has(category)) {
      this.validationRules.set(category, []);
    }
    this.validationRules.get(category)!.push(rule);
  }

  /**
   * Clear validation data
   */
  clearValidationData() {
    this.screenshots = [];
    this.reports = [];
  }

  /**
   * Export validation reports
   */
  exportReports(): string {
    return JSON.stringify(this.reports, null, 2);
  }
}

// Export singleton instance
export const uiValidator = UIValidator.getInstance();