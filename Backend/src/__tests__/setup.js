// Test setup file for Jest
// This file runs before each test suite

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-min-32-characters';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/jasiri_test';

// Mock external services for testing
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Set up test database or other global test configuration here
beforeAll(async () => {
  // Global test setup
  console.log('🧪 Test environment initialized');
});

afterAll(async () => {
  // Global test cleanup
  console.log('🧪 Test environment cleaned up');
});

// Global test utilities
global.testHelper = {
  mockAuthToken: 'mock-jwt-token',
  mockGuardian: {
    id: '1',
    email: 'test@example.com',
    name: 'Test Guardian',
    role: 'parent',
  },
  mockChild: {
    id: '1',
    name: 'Test Child',
    age: 8,
    guardianIds: ['1'],
  },
};
