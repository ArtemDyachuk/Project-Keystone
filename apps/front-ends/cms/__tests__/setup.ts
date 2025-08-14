// Frontend test setup
import 'jest-environment-jsdom';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock fetch globally
global.fetch = jest.fn();

// Skip location mocking for now - jsdom has issues with it
// Tests don't need window.location for security logic testing

// Mock document.cookie
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: '',
});

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  // Filter out expected errors during tests
  if (args[0] && typeof args[0] === 'string') {
    if (args[0].includes('Failed to extract user data from JWT') ||
        args[0].includes('Unauthorized tenant access attempt')) {
      return; // Suppress expected security-related errors
    }
  }
  originalConsoleError(...args);
};

console.warn = (...args) => {
  // Filter out expected warnings during tests
  if (args[0] && typeof args[0] === 'string') {
    if (args[0].includes('Unauthorized tenant access blocked')) {
      return; // Suppress expected security warnings
    }
  }
  originalConsoleWarn(...args);
};
