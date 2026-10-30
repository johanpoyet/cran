// Sentry's Expo config wraps Expo's default (monorepo-aware) Metro config and adds debug ids.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
