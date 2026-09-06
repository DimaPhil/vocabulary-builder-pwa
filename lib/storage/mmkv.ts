import { storageKey } from "@/lib/storage/userScope";

const memory = new Map<string, string>();

function browserStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export const storage = {
  getString(key: string) {
    const scopedKey = storageKey(key);
    try {
      return browserStorage()?.getItem(scopedKey) ?? memory.get(scopedKey);
    } catch {
      return memory.get(scopedKey);
    }
  },
  set(key: string, value: string) {
    const scopedKey = storageKey(key);
    try {
      const target = browserStorage();

      if (target) {
        target.setItem(scopedKey, value);
        return;
      }
    } catch {
      // Fall back to memory when storage is unavailable or full.
    }

    memory.set(scopedKey, value);
  },
  remove(key: string) {
    const scopedKey = storageKey(key);
    try {
      browserStorage()?.removeItem(scopedKey);
    } catch {
      // Keep removing the fallback value.
    }

    memory.delete(scopedKey);
  },
};
