import { Platform } from "react-native";

interface StorageInterface {
  getString(key: string): string | undefined;
  set(key: string, value: string | boolean | number): void;
  delete(key: string): void;
  contains(key: string): boolean;
  getAllKeys(): string[];
  clearAll(): void;
}

let createNativeMMKV: ((config: { id: string }) => StorageInterface) | null = null;

try {
  if (Platform.OS !== "web") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mmkv = require("react-native-mmkv");
    createNativeMMKV = (config: { id: string }) => {
      const instance = mmkv.createMMKV(config);
      return {
        getString: (k: string) => instance.getString(k),
        set: (k: string, v: string | boolean | number) => instance.set(k, v),
        delete: (k: string) => instance.delete(k),
        contains: (k: string) => instance.contains(k),
        getAllKeys: () => instance.getAllKeys(),
        clearAll: () => instance.clearAll(),
      };
    };
  }
} catch { /* noop */ }

const instances = new Map<string, Map<string, string>>();
const PREFIX = "analogix.mmkv.";

export class MMKV implements StorageInterface {
  private native: StorageInterface | null = null;
  private id: string;

  constructor(config: { id: string }) {
    this.id = PREFIX + config.id;
    if (createNativeMMKV) {
      try {
        this.native = createNativeMMKV(config);
      } catch { /* noop */ }
    }
    if (!instances.has(this.id)) {
      instances.set(this.id, new Map());
    }
  }

  private get store(): Map<string, string> {
    return instances.get(this.id)!;
  }

  getString(key: string): string | undefined {
    if (this.native) {
      try { return this.native.getString(key); } catch { /* noop */ }
    }
    try {
      return localStorage.getItem(this.id + ":" + key) ?? undefined;
    } catch {
      return this.store.get(key);
    }
  }

  set(key: string, value: string | boolean | number): void {
    if (this.native) {
      try { this.native.set(key, value); return; } catch { /* noop */ }
    }
    const str = String(value);
    try {
      localStorage.setItem(this.id + ":" + key, str);
    } catch {
      this.store.set(key, str);
    }
  }

  delete(key: string): void {
    if (this.native) {
      try { this.native.delete(key); return; } catch { /* noop */ }
    }
    try {
      localStorage.removeItem(this.id + ":" + key);
    } catch {
      this.store.delete(key);
    }
  }

  contains(key: string): boolean {
    if (this.native) {
      try { return this.native.contains(key); } catch { /* noop */ }
    }
    try {
      return localStorage.getItem(this.id + ":" + key) !== null;
    } catch {
      return this.store.has(key);
    }
  }

  getAllKeys(): string[] {
    if (this.native) {
      try { return this.native.getAllKeys(); } catch { /* noop */ }
    }
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(this.id + ":")) {
          keys.push(k.slice(this.id.length + 1));
        }
      }
      return keys;
    } catch {
      return Array.from(this.store.keys());
    }
  }

  clearAll(): void {
    if (this.native) {
      try { this.native.clearAll(); return; } catch { /* noop */ }
    }
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(this.id + ":")) {
          toRemove.push(k);
        }
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      this.store.clear();
    }
  }
}
