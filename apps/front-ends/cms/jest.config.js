module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom', // For frontend testing
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleNameMapper: {
    // Handle Next.js and project imports
    '^@/(.*)$': '<rootDir>/$1',
    '^@keystone/(.*)$': '<rootDir>/../../../packages/$1/src',
    
    // Handle CSS modules
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
};
