import { appStateBackupSchema, importPayloadSchema, persistedAppStateSchema } from "@/lib/db/schemas";
import type {
  AppStateBackup,
  PersistedAppState,
  StoredVocabularyItem,
} from "@/lib/types";
import { createSeed } from "@/lib/utils/random";
import {
  DEFAULT_SOURCE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
  DEFAULT_ROTATION_HOURS,
} from "@/lib/constants/app";

const DATABASE_NAME = "vocabulary-builder";
const DATABASE_VERSION = 1;
const STORE_NAME = "app";
const STATE_KEY = "state";
const SEED_URL = "/data/seed/all.json";

let databasePromise: Promise<IDBDatabase | null> | null = null;
let initializationPromise: Promise<PersistedAppState> | null = null;
let writeQueue: Promise<void> = Promise.resolve();
let memoryState: PersistedAppState | null = null;

function clone<T>(value: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T);
}

function openDatabase() {
  if (databasePromise) {
    return databasePromise;
  }

  if (typeof indexedDB === "undefined") {
    databasePromise = Promise.resolve(null);
    return databasePromise;
  }

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local storage."));
  });

  return databasePromise;
}

async function readStoredState(): Promise<PersistedAppState | null> {
  if (memoryState) {
    return clone(memoryState);
  }

  const database = await openDatabase();

  if (!database) {
    return null;
  }

  const value = await new Promise<unknown>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(STATE_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not read local data."));
  });

  if (value === undefined) {
    return null;
  }

  memoryState = persistedAppStateSchema.parse(value);
  return clone(memoryState);
}

async function writeStoredState(state: PersistedAppState) {
  const database = await openDatabase();

  if (!database) {
    memoryState = clone(state);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(state, STATE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save local data."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Local data write was aborted."));
  });

  memoryState = clone(state);
}

function serialize<T>(operation: () => Promise<T>) {
  const result = writeQueue.then(operation);
  writeQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

async function loadSeed() {
  const response = await fetch(SEED_URL);

  if (!response.ok) {
    throw new Error(`Could not load bundled vocabulary (${response.status}).`);
  }

  return importPayloadSchema.parse(await response.json());
}

export function createInitialState(
  seed: ReturnType<typeof importPayloadSchema.parse>,
  now = new Date().toISOString()
): PersistedAppState {
  const categories = seed.categories.map((category, index) => ({
    ...category,
    id: index + 1,
    createdAt: now,
    updatedAt: now,
  }));
  const categoryIdBySlug = new Map(categories.map((category) => [category.slug, category.id]));
  const items: StoredVocabularyItem[] = seed.items.map((item, index) => {
    const categoryId = categoryIdBySlug.get(item.category);

    if (!categoryId) {
      throw new Error(`Seed item references missing category "${item.category}".`);
    }

    return {
      id: index + 1,
      categoryId,
      sourceText: item.sourceText,
      targetText: item.targetText,
      sourceLanguage: item.sourceLanguage,
      targetLanguage: item.targetLanguage,
      examples: item.examples,
      synonyms: item.synonyms,
      imageKind: item.imageUrl ? "remote" : "none",
      imageUri: item.imageUrl ?? null,
      createdAt: now,
      updatedAt: now,
    };
  });

  return {
    version: 1,
    nextCategoryId: categories.length + 1,
    nextItemId: items.length + 1,
    categories,
    items,
    settings: {
      defaultSourceLanguage: DEFAULT_SOURCE_LANGUAGE,
      defaultTargetLanguage: DEFAULT_TARGET_LANGUAGE,
      rotationHours: DEFAULT_ROTATION_HOURS,
      rotationSeed: createSeed(),
    },
  };
}

async function readOrCreateState() {
  const existing = await readStoredState();

  if (existing) {
    return existing;
  }

  const initial = persistedAppStateSchema.parse(createInitialState(await loadSeed()));
  await writeStoredState(initial);
  return initial;
}

export function initializeAppState() {
  if (initializationPromise) {
    return initializationPromise;
  }

  const attempt = serialize(readOrCreateState);
  initializationPromise = attempt.catch((error) => {
    initializationPromise = null;
    throw error;
  });

  if (typeof navigator !== "undefined" && navigator.storage?.persist) {
    void navigator.storage.persist().catch(() => false);
  }

  return initializationPromise;
}

export async function getAppState() {
  await initializeAppState();
  const state = await readStoredState();

  if (!state) {
    throw new Error("Local data was not initialized.");
  }

  return state;
}

export function updateAppState<T>(mutate: (draft: PersistedAppState) => T) {
  return serialize(async () => {
    const current = await readOrCreateState();
    const draft = clone(current);
    const result = mutate(draft);
    const validated = persistedAppStateSchema.parse(draft);
    await writeStoredState(validated);
    return result;
  });
}

export async function exportAppState() {
  const backup: AppStateBackup = {
    format: "vocabulary-builder-backup",
    exportedAt: new Date().toISOString(),
    state: await getAppState(),
  };

  return JSON.stringify(backup, null, 2);
}

export async function restoreAppState(rawValue: string) {
  let value: unknown;

  try {
    value = JSON.parse(rawValue);
  } catch {
    throw new Error("Backup must be valid JSON.");
  }

  const backup = appStateBackupSchema.parse(value);

  await serialize(async () => {
    await writeStoredState(backup.state);
  });
}
