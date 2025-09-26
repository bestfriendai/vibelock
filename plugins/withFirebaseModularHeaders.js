const { withPodfile } = require("@expo/config-plugins");

const podsToModularize = [
  "GoogleUtilities",
  "FirebaseCore",
  "FirebaseInstallations",
  "GoogleDataTransport",
  "nanopb",
  "FirebaseCoreExtension",
  "PromisesObjC",
  "PromisesSwift",
];

module.exports = function withFirebaseModularHeaders(config) {
  return withPodfile(config, async (configProps) => {
    let podfile = configProps.podfile;

    if (!podfile) {
      console.warn("Podfile is undefined, skipping Firebase modular headers modification");
      return configProps;
    }

    podsToModularize.forEach((pod) => {
      const regex = new RegExp(`pod '${pod}'(, :[^)]+)?`);
      podfile = podfile.replace(regex, (match, options) => {
        if (match.includes("modular_headers")) return match;
        const opts = options ? options.trim() : "";
        const newOpts = opts ? `${opts}, :modular_headers => true` : " :modular_headers => true";
        return `pod '${pod}',${newOpts}`;
      });
    });

    configProps.podfile = podfile;
    return configProps;
  });
};
