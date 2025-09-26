const { withAppDelegate } = require("@expo/config-plugins");

module.exports = function withFirebaseConfig(config) {
  return withAppDelegate(config, (configProps) => {
    let appDelegate = configProps.contents;

    if (!appDelegate) {
      console.warn("AppDelegate contents undefined, skipping Firebase configuration");
      return configProps;
    }

    // Import Firebase
    if (!appDelegate.includes("#import <Firebase/Firebase.h>")) {
      appDelegate = appDelegate.replace(
        "#import <React/RCTRootView.h>",
        "#import <React/RCTRootView.h>\n#import <Firebase/Firebase.h>"
      );
    }

    // Configure Firebase
    if (!appDelegate.includes("[FIRApp configure]")) {
      appDelegate = appDelegate.replace(
        "- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions",
        "- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions\n{\n  [FIRApp configure];"
      );
    }

    configProps.contents = appDelegate;
    return configProps;
  });
};