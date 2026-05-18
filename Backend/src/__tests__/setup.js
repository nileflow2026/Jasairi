// @ts-nocheck
// Test setup file for Jest
// This file runs before each test suite

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.PORT = "3001";
process.env.JWT_SECRET = "test-jwt-secret-key-min-32-characters!!";
process.env.JWT_EXPIRES_IN = "1h";
process.env.JWT_REFRESH_SECRET = "test-jwt-refresh-secret-key-min-32-chars!!";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";
process.env.APPWRITE_ENDPOINT = "https://cloud.appwrite.io/v1";
process.env.APPWRITE_PROJECT_ID = "test-project-id";
process.env.APPWRITE_API_KEY = "test-api-key";
process.env.APPWRITE_DATABASE_ID = "test-database-id";
process.env.CORS_ORIGIN = "http://localhost:3000";
process.env.APPWRITE_COLLECTION_GAMES = "test-games-collection";
process.env.APPWRITE_GAME_SESSIONS_COLLECTION = "test-game-sessions-collection";
process.env.APPWRITE_GAME_ATTEMPTS_COLLECTION = "test-game-attempts-collection";
process.env.APPWRITE_AUDIT_COLLECTION = "test-audit-collection";
process.env.APPWRITE_COLLECTION_CHILDREN = "test-children-collection";

// Mock external services for testing
jest.mock("../utils/logger", () => ({
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
  console.log("🧪 Test environment initialized");
});

afterAll(async () => {
  // Global test cleanup
  console.log("🧪 Test environment cleaned up");
});

// Global test utilities
global.testHelper = {
  mockAuthToken: "mock-jwt-token",
  mockGuardian: {
    id: "1",
    email: "test@example.com",
    name: "Test Guardian",
    role: "parent",
  },
  mockChild: {
    id: "1",
    name: "Test Child",
    age: 8,
    guardianIds: ["1"],
  },
};
function beforeAll(arg0) {
  throw new Error("Function not implemented.");
}

function beforeAll(arg0) {
  throw new Error("Function not implemented.");
}

function beforeAll(arg0) {
  throw new Error("Function not implemented.");
}

function beforeAll(arg0) {
  throw new Error("Function not implemented.");
}

function afterAll(arg0) {
  throw new Error("Function not implemented.");
}
