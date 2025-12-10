const { expo } = require('./app.json');

// This file exposes runtime config to Expo via `expo.extra`.
// Start Expo with dotenv so `process.env` is populated:
// npx dotenv -e .env -- expo start

module.exports = () => {
  return {
    expo: {
      ...expo,
      extra: {
        ...(expo.extra || {}),
        BASE_URL: process.env.BASE_URL || 'http://localhost:8080',
      },
    },
  };
};
