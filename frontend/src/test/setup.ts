// ============================================================
// Vitest global setup — runs before every test file.
//
// - Loads jest-dom matchers (toBeInTheDocument, etc.)
// - Polyfills browser APIs jsdom lacks but MUI relies on
//   (matchMedia for useMediaQuery, ResizeObserver for layout).
// ============================================================
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmount React trees between tests so the DOM stays isolated.
afterEach(() => {
  cleanup();
});

// matchMedia — MUI useMediaQuery / responsive hooks need it.
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

// ResizeObserver — used by some MUI/x components.
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
