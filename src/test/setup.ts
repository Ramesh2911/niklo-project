import '@testing-library/jest-dom';

// On this Node/jsdom combination, jsdom leaves window.localStorage as
// `undefined` (it defers to Node's own experimental webstorage, which itself
// needs a --localstorage-file backing it) — so tests get a real in-memory
// Storage implementation instead.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  clear() { this.store.clear(); }
  getItem(key: string) { return this.store.has(key) ? this.store.get(key)! : null; }
  key(index: number) { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string) { this.store.delete(key); }
  setItem(key: string, value: string) { this.store.set(key, String(value)); }
}

const memoryStorage = new MemoryStorage();
window.localStorage = memoryStorage;
globalThis.localStorage = memoryStorage;

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
