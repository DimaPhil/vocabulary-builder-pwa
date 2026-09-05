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
    try {
      return browserStorage()?.getItem(key) ?? memory.get(key);
    } catch {
      return memory.get(key);
    }
  },
  set(key: string, value: string) {
    try {
      const target = browserStorage();

      if (target) {
        target.setItem(key, value);
        return;
      }
    } catch {
      // Fall back to memory when storage is unavailable or full.
    }

    memory.set(key, value);
  },
  remove(key: string) {
    try {
      browserStorage()?.removeItem(key);
    } catch {
      // Keep removing the fallback value.
    }

    memory.delete(key);
  },
};
