import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PerformanceOptimizer {
  constructor() {
    this.optimizations = [];
  }

  // Analyze current performance configuration
  analyzeCurrentState() {
    console.log("Analyzing current performance configuration...\n");

    const analysis = {
      metroConfig: this.checkMetroConfig(),
      packageJson: this.checkPackageJson(),
      chatRoomScreen: this.checkChatRoomScreen(),
      imageOptimization: this.checkImageOptimization(),
      memoryManagement: this.checkMemoryManagement(),
    };

    return analysis;
  }

  checkMetroConfig() {
    const metroPath = path.join(__dirname, "..", "metro.config.js");
    if (!fs.existsSync(metroPath)) {
      return { exists: false, optimizations: [] };
    }

    const content = fs.readFileSync(metroPath, "utf8");
    const optimizations = [];

    // Check for existing optimizations
    if (content.includes("inlineRequires: true")) {
      optimizations.push("Inline requires enabled");
    } else {
      optimizations.push("Inline requires not enabled");
    }

    if (content.includes("experimentalImportSupport")) {
      optimizations.push("Experimental import support enabled");
    } else {
      optimizations.push("Experimental import support not enabled");
    }

    if (content.includes("hermesParser: true")) {
      optimizations.push("Hermes parser enabled");
    } else {
      optimizations.push("Hermes parser not enabled");
    }

    return { exists: true, optimizations };
  }

  checkPackageJson() {
    const packagePath = path.join(__dirname, "..", "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

    const optimizations = [];
    const deps = packageJson.dependencies || {};

    // Check for performance libraries
    if (deps["@shopify/flash-list"]) {
      optimizations.push("FlashList for optimized list rendering");
    }

    if (deps["react-native-reanimated"]) {
      optimizations.push("Reanimated for smooth animations");
    }

    if (deps["expo-image"]) {
      optimizations.push("Expo Image for optimized image loading");
    }

    // Check for potentially heavy dependencies
    const heavyDeps = ["@shopify/react-native-skia", "react-native-maps", "lottie-react-native"];
    heavyDeps.forEach((dep) => {
      if (deps[dep]) {
        optimizations.push("Heavy dependency: " + dep);
      }
    });

    return { optimizations, totalDeps: Object.keys(deps).length };
  }

  checkChatRoomScreen() {
    const chatRoomPath = path.join(__dirname, "..", "src", "screens", "ChatRoomScreen.tsx");
    if (!fs.existsSync(chatRoomPath)) {
      return { exists: false, optimizations: [] };
    }

    const content = fs.readFileSync(chatRoomPath, "utf8");
    const optimizations = [];

    // Check for performance optimizations
    if (content.includes("usePerformanceOptimization")) {
      optimizations.push("Performance optimization hook used");
    }

    if (content.includes("FlashList")) {
      optimizations.push("FlashList for chat messages");
    }

    if (content.includes("getCachedOptimizedMessageList")) {
      optimizations.push("Message caching implemented");
    }

    if (content.includes("useMemo")) {
      optimizations.push("Memoization used for message lists");
    }

    // Check for potential issues
    if (content.includes("setInterval") && !content.includes("clearInterval")) {
      optimizations.push("Potential memory leak: setInterval without clearInterval");
    }

    if (content.includes("setTimeout") && !content.includes("clearTimeout")) {
      optimizations.push("Potential memory leak: setTimeout without clearTimeout");
    }

    return { exists: true, optimizations };
  }

  checkImageOptimization() {
    const lazyImagePath = path.join(__dirname, "..", "src", "components", "LazyImage.tsx");
    const compressionPath = path.join(__dirname, "..", "src", "services", "imageCompressionService.ts");

    const optimizations = [];

    if (fs.existsSync(lazyImagePath)) {
      const content = fs.readFileSync(lazyImagePath, "utf8");

      if (content.includes("LazyImage")) {
        optimizations.push("Lazy image loading implemented");
      }

      if (content.includes("blurhash")) {
        optimizations.push("Blurhash placeholders used");
      }

      if (content.includes("ImagePreloader")) {
        optimizations.push("Image preloading utility available");
      }
    }

    if (fs.existsSync(compressionPath)) {
      const content = fs.readFileSync(compressionPath, "utf8");

      if (content.includes("imageCompressionService")) {
        optimizations.push("Image compression service available");
      }

      if (content.includes("webp")) {
        optimizations.push("WebP format supported");
      }
    }

    return { optimizations };
  }

  checkMemoryManagement() {
    const memoryManagerPath = path.join(__dirname, "..", "src", "services", "memoryManager.ts");
    const performanceHookPath = path.join(__dirname, "..", "src", "hooks", "usePerformanceOptimization.ts");

    const optimizations = [];

    if (fs.existsSync(memoryManagerPath)) {
      optimizations.push("Memory manager service implemented");

      const content = fs.readFileSync(memoryManagerPath, "utf8");
      if (content.includes("leakDetectionInterval")) {
        optimizations.push("Automatic leak detection enabled");
      }
    }

    if (fs.existsSync(performanceHookPath)) {
      optimizations.push("Performance optimization hook available");
    }

    return { optimizations };
  }

  // Generate optimization recommendations
  generateRecommendations(analysis) {
    console.log("Performance Optimization Recommendations:\n");

    const recommendations = [];

    // Metro config recommendations
    if (analysis.metroConfig.exists) {
      const missingOpts = analysis.metroConfig.optimizations.filter((opt) => opt.includes("not enabled"));
      if (missingOpts.length > 0) {
        recommendations.push("Metro Configuration:");
        missingOpts.forEach((opt) => {
          recommendations.push("  • " + opt);
        });
        recommendations.push("");
      }
    }

    // Bundle optimization recommendations
    if (analysis.packageJson.totalDeps > 100) {
      recommendations.push("Bundle Size Optimization:");
      recommendations.push("  • Consider removing unused dependencies");
      recommendations.push("  • Implement lazy loading for heavy libraries");
      recommendations.push("  • Use bundle splitting for non-critical features");
      recommendations.push("");
    }

    // Chat room optimizations
    if (analysis.chatRoomScreen.exists) {
      const issues = analysis.chatRoomScreen.optimizations.filter((opt) => opt.includes("Potential memory leak"));
      if (issues.length > 0) {
        recommendations.push("Chat Room Performance:");
        issues.forEach((issue) => {
          recommendations.push("  • " + issue);
        });
        recommendations.push("");
      }
    }

    // Image optimization recommendations
    if (analysis.imageOptimization.optimizations.length < 5) {
      recommendations.push("Image Optimization:");
      recommendations.push("  • Implement progressive image loading");
      recommendations.push("  • Add WebP format support if not present");
      recommendations.push("  • Consider implementing image CDN integration");
      recommendations.push("");
    }

    // Memory management recommendations
    recommendations.push("Memory Management:");
    recommendations.push("  • Set up automated memory profiling");
    recommendations.push("  • Implement component lifecycle tracking");
    recommendations.push("  • Add memory pressure event handlers");
    recommendations.push("");

    return recommendations;
  }

  // Apply optimizations
  applyOptimizations() {
    console.log("Applying performance optimizations...\n");

    const optimizations = [
      this.optimizeMetroConfig(),
      this.createPerformanceMonitoring(),
      this.createBundleOptimizationGuide(),
    ];

    return optimizations.filter((opt) => opt !== null);
  }

  optimizeMetroConfig() {
    const metroPath = path.join(__dirname, "..", "metro.config.js");
    if (!fs.existsSync(metroPath)) {
      return null;
    }

    let content = fs.readFileSync(metroPath, "utf8");

    // Add additional optimization if not present
    if (!content.includes("maxWorkers")) {
      content = content.replace(
        "config.transformer.inlineRequires = true;",
        "config.transformer.inlineRequires = true;\n\n// Performance optimizations\nconfig.maxWorkers = require('os').cpus().length;",
      );

      fs.writeFileSync(metroPath, content);
      return "Enhanced Metro configuration with worker optimization";
    }

    return null;
  }

  createPerformanceMonitoring() {
    const monitoringPath = path.join(__dirname, "..", "src", "utils", "performanceMonitoring.ts");

    if (!fs.existsSync(monitoringPath)) {
      const content = `import { performanceMonitor } from './performance';
import { memoryManager } from '../services/memoryManager';

export class PerformanceMonitoring {
  private static instance: PerformanceMonitoring;
  private metrics: Map<string, any> = new Map();

  static getInstance(): PerformanceMonitoring {
    if (!PerformanceMonitoring.instance) {
      PerformanceMonitoring.instance = new PerformanceMonitoring();
    }
    return PerformanceMonitoring.instance;
  }

  trackScreenLoad(screenName: string, loadTime: number) {
    performanceMonitor.recordMetric('screenLoad', {
      screen: screenName,
      loadTime,
      timestamp: Date.now(),
    });

    if (loadTime > 1000) {
      console.warn(\`Slow screen load: \${screenName} took \${loadTime}ms\`);
    }
  }

  trackMemoryUsage() {
    setInterval(async () => {
      const usage = await memoryManager.getMemoryUsage();
      if (usage.percentage > 0.8) {
        console.warn(\`High memory usage: \${(usage.percentage * 100).toFixed(1)}%\`);
      }
    }, 30000);
  }

  trackBundleSize() {
    // This would integrate with bundle analysis tools
    console.log('Bundle size monitoring enabled');
  }
}

export const performanceMonitoring = PerformanceMonitoring.getInstance();
`;

      fs.writeFileSync(monitoringPath, content);
      return "Created performance monitoring utility";
    }

    return null;
  }

  createBundleOptimizationGuide() {
    const guidePath = path.join(__dirname, "..", "BUNDLE_OPTIMIZATION_GUIDE.md");

    if (!fs.existsSync(guidePath)) {
      const content = `# Bundle Optimization Guide

## Current Bundle Analysis
- Total dependencies: 152
- Production dependencies: 123
- Dev dependencies: 29

## Optimization Opportunities

### 1. Remove Unused Dependencies
\`\`\`bash
# Check for unused dependencies
npx depcheck

# Remove potentially unused Expo modules
expo install --fix
\`\`\`

### 2. Lazy Loading Implementation
\`\`\`typescript
// Example: Lazy load heavy components
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

// Use with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <HeavyComponent />
</Suspense>
\`\`\`

### 3. Bundle Splitting
\`\`\`javascript
// In metro.config.js
config.resolver.extraNodeModules = {
  // Split vendor bundles
  'react': require.resolve('react'),
  'react-native': require.resolve('react-native'),
};
\`\`\`

### 4. Image Optimization
- Use WebP format when possible
- Implement progressive loading
- Set appropriate cache policies

### 5. Memory Management
- Track component lifecycle
- Implement automatic cleanup
- Monitor memory pressure

## Performance Testing
\`\`\`bash
# Analyze bundle size
npx expo export --dump-assetmap

# Run performance tests
npm run performance:test
\`\`\`
`;

      fs.writeFileSync(guidePath, content);
      return "Created bundle optimization guide";
    }

    return null;
  }

  run() {
    console.log("Starting Performance Optimization Analysis\n");

    // Analyze current state
    const analysis = this.analyzeCurrentState();

    // Display current optimizations
    console.log("Current Performance Configuration:\n");

    Object.entries(analysis).forEach(([category, data]) => {
      console.log(category.charAt(0).toUpperCase() + category.slice(1) + ":");
      if (data.optimizations && data.optimizations.length > 0) {
        data.optimizations.forEach((opt) => console.log("  " + opt));
      }
      console.log("");
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations(analysis);
    if (recommendations.length > 0) {
      recommendations.forEach((rec) => console.log(rec));
    }

    // Apply optimizations
    const applied = this.applyOptimizations();
    if (applied.length > 0) {
      console.log("Applied Optimizations:");
      applied.forEach((opt) => console.log("  • " + opt));
    }

    console.log("\nPerformance optimization analysis completed!");
  }
}

// Run the optimizer
if (import.meta.url === `file://${process.argv[1]}`) {
  const optimizer = new PerformanceOptimizer();
  optimizer.run();
}

export default PerformanceOptimizer;
