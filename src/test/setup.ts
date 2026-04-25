Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Fake localStorage because this keeps stuff on the tracks (in-memory)
const store: Record<string, string> = {};

const localStorageMock = {
  getItem: (key: string) => {
    return key in store ? store[key] : null;
  },

  setItem: (key: string, value: string) => {
    store[key] = String(value);
  },

  removeItem: (key: string) => {
    delete store[key];
  },

  clear: () => {
    Object.keys(store).forEach((key) => delete store[key]);
  },
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

globalThis.localStorage = window.localStorage;