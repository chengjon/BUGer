// jest.config.cjs
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.js'],
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  transform: {
    '^.+\.js$': 'babel-jest',
  },
  moduleNameMapper: {},
  testTimeout: 30000,
  verbose: true,
  bail: false,
  detectOpenHandles: true,
};