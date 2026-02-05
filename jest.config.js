export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js', 'mjs'],
  testMatch: ['**/__tests__/**/*.test.js'],
  verbose: true,
  injectGlobals: true,
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/index.js'
  ]
};
