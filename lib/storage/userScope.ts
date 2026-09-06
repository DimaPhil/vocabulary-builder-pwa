let activeUsername = "dima";

export function configureStorageUser(username: string) {
  activeUsername = username.toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

export function databaseName() {
  return activeUsername === "dima"
    ? "vocabulary-builder"
    : `vocabulary-builder-${activeUsername}`;
}

export function storageKey(key: string) {
  return activeUsername === "dima" ? key : `${activeUsername}:${key}`;
}
