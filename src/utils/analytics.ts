// Firebase Analytics removed - using stub implementation for now
// You can replace this with Web Analytics, Expo Analytics, or other analytics solution

export const logEvent = (eventName: string, parameters?: { [key: string]: any }) => {
  // Stub implementation - replace with your preferred analytics solution
  console.log('Analytics Event:', eventName, parameters);
};

export const logScreenView = (screenName: string) => {
  // Stub implementation - replace with your preferred analytics solution
  console.log('Screen View:', screenName);
};
