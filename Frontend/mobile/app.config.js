const { expo } = require('./app.json');

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
