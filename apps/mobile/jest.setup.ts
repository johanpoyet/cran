import '@testing-library/react-native/matchers';
import './src/i18n';

// expo-sqlite is native: the app's database is replaced by an empty object. Tests of the local
// database use sql.js (src/test/local-database.ts).
jest.mock('./src/db/client', () => ({ localDb: {} }));

// The Sentry SDK ships ES modules Jest does not load; Sentry is disabled in tests anyway.
jest.mock('./src/lib/sentry', () => ({
  initSentry: jest.fn(),
  Sentry: { wrap: <T>(component: T) => component, captureException: jest.fn() },
}));
