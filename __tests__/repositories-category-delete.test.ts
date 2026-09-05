import { deleteCategory } from "@/lib/db/repositories";
import { getAppState, restoreAppState } from "@/lib/storage/indexedDb";

function backup() {
  const now = "2026-01-01T00:00:00.000Z";
  return JSON.stringify({
    format: "vocabulary-builder-backup",
    exportedAt: now,
    state: {
      version: 1,
      nextCategoryId: 10,
      nextItemId: 2,
      categories: [
        { id: 7, slug: "old", name: "Old", createdAt: now, updatedAt: now },
        { id: 9, slug: "new", name: "New", createdAt: now, updatedAt: now },
      ],
      items: [
        {
          id: 1,
          categoryId: 7,
          sourceText: "word",
          targetText: "слово",
          sourceLanguage: "en",
          targetLanguage: "ru",
          examples: [],
          synonyms: [],
          imageKind: "none",
          imageUri: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
      settings: {
        defaultSourceLanguage: "en",
        defaultTargetLanguage: "ru",
        rotationHours: 1,
        rotationSeed: "seed",
      },
    },
  });
}

describe("deleteCategory", () => {
  it("deletes category items when requested", async () => {
    await restoreAppState(backup());
    await deleteCategory(7, { deleteItems: true });

    const state = await getAppState();
    expect(state.categories.map(({ id }) => id)).toEqual([9]);
    expect(state.items).toEqual([]);
  });

  it("reassigns items before deleting their category", async () => {
    await restoreAppState(backup());
    await deleteCategory(7, { reassignToCategoryId: 9 });

    const state = await getAppState();
    expect(state.categories.map(({ id }) => id)).toEqual([9]);
    expect(state.items[0].categoryId).toBe(9);
  });
});
