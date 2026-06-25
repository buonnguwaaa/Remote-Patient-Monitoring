const fs = require("fs");
const path = require("path");
const { expo } = require("./app.json");

const resolvedApiBaseUrl =
  process.env.EXPO_PUBLIC_BASE_URL ||
  process.env.BASE_URL ||
  expo.extra?.BASE_URL ||
  "";

// Include google-services.json if present (required for FCM on Android)
const googleServicesPath = path.resolve(__dirname, "./google-services.json");
const hasGoogleServices = fs.existsSync(googleServicesPath);

module.exports = () => {
  const androidConfig = {
    ...(expo.android || {}),
    ...(hasGoogleServices ? { googleServicesFile: "./google-services.json" } : {}),
  };

  return {
    expo: {
      ...expo,
      android: androidConfig,
      extra: {
        ...(expo.extra || {}),
        BASE_URL: resolvedApiBaseUrl,
        EXPO_PUBLIC_BASE_URL: resolvedApiBaseUrl,
      },
    },
  };
};
