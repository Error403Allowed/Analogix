interface StorageInterface {
  getString(key: string): string | undefined;
  set(key: string, value: string | boolean | number): void;
  delete(key: string): void;
  contains(key: string): boolean;
  getAllKeys(): string[];
  clearAll(): void;
}

const instances = new Map<string, Map<string, string>>();

const PREFIX = "analogix.mmkv.";

export class MMKV implements StorageInterface {
  private id: string;

  constructor(config: { id: string }) {
    this.id = PREFIX + config.id;
    if (!instances.has(this.id)) {
      instances.set(this.id, new Map());
    }
  }

  private get store(): Map<string, string> {
    return instances.get(this.id)!;
  }

  getString(key: string): string | undefined {
    try {
      return localStorage.getItem(this.id + ":" + key) ?? undefined;
    } catch {
      return this.store.get(key);
    }
  }

  set(key: string, value: string | boolean | number): void {
    const str = String(value);
    try {
      localStorage.setItem(this.id + ":" + key, str);
    } catch {
      this.store.set(key, str);
    }
  }

  delete(key: string): void {
    try {
      localStorage.removeItem(this.id + ":" + key);
    } catch {
      this.store.delete(key);
    }
  }

  contains(key: string): boolean {
    try {
      return localStorage.getItem(this.id + ":" + key) !== null;
    } catch {
      return this.store.has(key);
    }
  }

  getAllKeys(): string[] {
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
