const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withCleartextTraffic(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const mainApplication = androidManifest.manifest.application[0];
    
    // Add usesCleartextTraffic="true" to application tag
    mainApplication.$['android:usesCleartextTraffic'] = 'true';
    
    return config;
  });
};