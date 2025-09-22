import analytics from "@react-native-firebase/analytics";

export const logEvent = (eventName: string, parameters?: { [key: string]: any }) => {
  if (analytics) {
    analytics().logEvent(eventName, parameters);
  }
};

export const logScreenView = (screenName: string) => {
  if (analytics) {
    analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenName,
    });
  }
};
