import "@testing-library/jest-dom";

// Silence Next.js-internal fetch warnings in jsdom
if (typeof window !== "undefined") {
  // Browser environment: ensure fetch is defined for component tests
  if (!window.fetch) {
    window.fetch = vi.fn();
  }
}

// Reset any global stubs between tests
afterEach(() => {
  vi.unstubAllGlobals();
});
