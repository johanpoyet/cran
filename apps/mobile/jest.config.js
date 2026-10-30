/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // jest-expo resolves the "react-native" export condition, which points lucide to an .mjs file
  // Jest does not transform; its CommonJS build renders the same components.
  moduleNameMapper: {
    '^lucide-react-native$': require.resolve('lucide-react-native'),
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  // pnpm stores packages under node_modules/.pnpm/<name>@<version>/node_modules/<name>.
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm/[^/]+/node_modules/)?(standard-navigation|(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|react-native-svg|lucide-react-native|@cran/.*))',
  ],
};
