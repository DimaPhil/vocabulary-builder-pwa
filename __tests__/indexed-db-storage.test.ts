import { importPayloadSchema, persistedAppStateSchema } from "@/lib/db/schemas";
import {
  getLearningProgress,
  importVocabularyData,
  recordVocabularyReview,
  resetVocabularyProgress,
} from "@/lib/db/repositories";
import {
  createInitialState,
  exportAppState,
  getAppState,
  initializeAppState,
  restoreAppState,
} from "@/lib/storage/indexedDb";
import seed from "@/public/data/seed/all.json";

const payload = importPayloadSchema.parse(seed);

describe("IndexedDB app state", () => {
  beforeAll(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
  });

  it("builds the complete, valid bundled seed", () => {
    const state = createInitialState(payload, "2026-01-01T00:00:00.000Z");

    expect(state.categories).toHaveLength(511);
    expect(state.items).toHaveLength(7_360);
    expect(persistedAppStateSchema.safeParse(state).success).toBe(true);
  });

  it("initializes once and keeps a failed import atomic", async () => {
    await Promise.all([initializeAppState(), initializeAppState()]);
    const before = await getAppState();

    await expect(
      importVocabularyData({
        categories: [],
        items: [
          {
            category: "missing",
            sourceText: "broken",
            targetText: "сломанный",
            sourceLanguage: "en",
            targetLanguage: "ru",
            examples: [],
            synonyms: [],
          },
        ],
      }),
    ).rejects.toThrow('Category "missing" does not exist.');

    const after = await getAppState();
    expect(after.categories).toHaveLength(before.categories.length);
    expect(after.items).toHaveLength(before.items.length);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("round-trips a validated backup", async () => {
    await recordVocabularyReview(
      1,
      "missed",
      new Date("2026-09-05T12:00:00.000Z"),
    );
    const backup = await exportAppState();
    await resetVocabularyProgress([1]);
    await restoreAppState(backup);

    expect((await getAppState()).items).toHaveLength(7_360);
    expect(await getLearningProgress()).toMatchObject([
      { itemId: 1, needsWork: true, totalMisses: 1 },
    ]);
    await expect(restoreAppState("not json")).rejects.toThrow(
      "Backup must be valid JSON.",
    );
  });
});
