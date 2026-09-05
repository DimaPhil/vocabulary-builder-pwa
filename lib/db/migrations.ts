import { initializeAppState } from "@/lib/storage/indexedDb";

export async function runMigrations() {
  await initializeAppState();
}
