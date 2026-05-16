const fs = require("fs");
const path = require("path");
const { expo } = require("./app.json");

const DEFAULT_ANDROID_PACKAGE = process.env.ANDROID_PACKAGE || expo.android?.package || "com.rpm.app";
const defaultGoogleServicesPath = "./google-services.json";
const configuredGoogleServicesPath = process.env.GOOGLE_SERVICES_FILE || defaultGoogleServicesPath;
const resolvedGoogleServicesPath = path.resolve(__dirname, configuredGoogleServicesPath);
const hasGoogleServicesFile = fs.existsSync(resolvedGoogleServicesPath);

const resolvedApiBaseUrl =
  process.env.EXPO_PUBLIC_BASE_URL ||
  process.env.BASE_URL ||
  expo.extra?.BASE_URL;

module.exports = () => {
  const androidPermissions = Array.isArray(expo.android?.permissions) ? [...expo.android.permissions] : [];
  if (!androidPermissions.includes("android.permission.POST_NOTIFICATIONS")) {
    androidPermissions.push("android.permission.POST_NOTIFICATIONS");
  }
  const androidConfig = {
    ...(expo.android || {}),
    package: DEFAULT_ANDROID_PACKAGE,
    permissions: androidPermissions,
    ...(hasGoogleServicesFile ? { googleServicesFile: configuredGoogleServicesPath } : {}),
  };
  
  const iosConfig = {
    ...(expo.ios || {}),
    bundleIdentifier: "com.rpm.app",
  };
  
  const existingPlugins = Array.isArray(expo.plugins) ? [...expo.plugins] : [];
  const plugins = existingPlugins.some((plugin) => Array.isArray(plugin) ? plugin[0] === "expo-notifications" : plugin === "expo-notifications")
    ? existingPlugins
    : [...existingPlugins, ["expo-notifications", { icon: "./src/assets/adaptive-icon.png", color: "#ffffff", defaultChannel: "default" }]];
  return {
    expo: {
      ...expo,
      android: androidConfig,
      ios: iosConfig,
      extra: { 
        ...(expo.extra || {}), 
        API_BASE_URL: resolvedApiBaseUrl, 
        BASE_URL: resolvedApiBaseUrl,
        EXPO_PUBLIC_BASE_URL: resolvedApiBaseUrl
      },
      plugins,
    },
  };
};
