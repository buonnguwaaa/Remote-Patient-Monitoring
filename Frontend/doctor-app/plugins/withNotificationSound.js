const { withAndroidManifest } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withNotificationSound = (config) => {
  // Android configuration
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    
    // Ensure the application tag exists
    if (!androidManifest.manifest.application) {
      androidManifest.manifest.application = [{}];
    }
    
    const application = androidManifest.manifest.application[0];
    
    // Add notification sound metadata
    if (!application['meta-data']) {
      application['meta-data'] = [];
    }
    
    // Add default notification sound
    application['meta-data'].push({
      $: {
        'android:name': 'com.google.firebase.messaging.default_notification_sound',
        'android:resource': '@raw/rpm_notification'
      }
    });
    
    return config;
  });

  // Copy sound files during build
  config = withAndroidManifest(config, async (config) => {
    const projectRoot = config._internal?.projectRoot || process.cwd();
    const soundSourcePath = path.join(projectRoot, 'assets', 'sounds', 'rpm_notification.wav');
    const androidResPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'raw');
    const androidSoundPath = path.join(androidResPath, 'rpm_notification.wav');
    
    try {
      // Create raw directory if it doesn't exist
      if (!fs.existsSync(androidResPath)) {
        fs.mkdirSync(androidResPath, { recursive: true });
      }
      
      // Copy sound file if source exists
      if (fs.existsSync(soundSourcePath)) {
        fs.copyFileSync(soundSourcePath, androidSoundPath);
        console.log('✅ Copied notification sound to Android raw resources');
      } else {
        console.log('⚠️  Notification sound file not found at:', soundSourcePath);
        console.log('   Please add rpm_notification.wav to assets/sounds/ directory');
      }
    } catch (error) {
      console.log('⚠️  Could not copy notification sound:', error.message);
    }
    
    return config;
  });

  return config;
};

module.exports = withNotificationSound;
