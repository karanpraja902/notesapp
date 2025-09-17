// Test setup file
// This file is run before each test file

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/multitenantnotesapp_test';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test utilities
global.testUtils = {
  // Add any global test utilities here
  generateTestId: () => Math.random().toString(36).substr(2, 9),
  generateTestEmail: (prefix = 'test') => `${prefix}-${Date.now()}@test.com`,
  generateTestSlug: (prefix = 'test') => `${prefix}-${Date.now()}`,
};

// Setup and teardown for each test file
beforeAll(async () => {
  // Global setup for all tests
  console.log('Setting up test environment...');
});

afterAll(async () => {
  // Global cleanup for all tests
  console.log('Cleaning up test environment...');
});

// Setup and teardown for each test
beforeEach(() => {
  // Setup before each test
});

afterEach(() => {
  // Cleanup after each test
  jest.clearAllMocks();
});
