const { expo } = require('./app.json');

const resolvedApiBaseUrl =
  process.env.EXPO_PUBLIC_BASE_URL ||
  process.env.BASE_URL ||
  expo.extra?.BASE_URL ||
  '';

module.exports = () => ({
  expo: {
    ...expo,
    extra: {
      ...(expo.extra || {}),
      BASE_URL: resolvedApiBaseUrl,
      EXPO_PUBLIC_BASE_URL: resolvedApiBaseUrl,
    },
  },
});
