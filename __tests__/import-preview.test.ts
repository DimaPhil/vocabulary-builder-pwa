import {
  commitImportPayload,
  previewImportPayload,
} from "@/features/admin/schemas/import";

const mockImportVocabularyData = jest.fn();

jest.mock("@/lib/db/repositories", () => ({
  importVocabularyData: (...args: unknown[]) => mockImportVocabularyData(...args),
}));

describe("import preview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockImportVocabularyData.mockResolvedValue(undefined);
  });

  it("rejects malformed JSON", async () => {
    await expect(previewImportPayload("{")).resolves.toEqual({
      errors: ["Import must be valid JSON."],
      payload: null,
    });
  });

  it("flags duplicate category slugs", async () => {
    const preview = await previewImportPayload(
      JSON.stringify({
        categories: [
          { slug: "kitchen", name: "Kitchen" },
          { slug: "kitchen", name: "Kitchen 2" },
        ],
        items: [],
      })
    );

    expect(preview.errors[0]).toContain('duplicate slug "kitchen"');
  });

  it("keeps supplied image URLs and leaves missing images blank", async () => {
    const preview = await previewImportPayload(
      JSON.stringify({
        categories: [{ slug: "kitchen", name: "Kitchen" }],
        items: [
          {
            category: "kitchen",
            sourceText: "whisk",
            targetText: "венчик",
            sourceLanguage: "en",
            targetLanguage: "ru",
            imageUrl: "https://example.com/whisk.png",
          },
          {
            category: "kitchen",
            sourceText: "ladle",
            targetText: "половник",
            sourceLanguage: "en",
            targetLanguage: "ru",
          },
        ],
      })
    );

    expect(preview.errors).toEqual([]);
    expect(preview.payload?.items[0].imageUrl).toBe("https://example.com/whisk.png");
    expect(preview.payload?.items[1].imageUrl).toBeUndefined();
  });

  it("commits the validated payload atomically", async () => {
    const payload = {
      categories: [{ slug: "kitchen", name: "Kitchen" }],
      items: [
        {
          category: "kitchen",
          sourceText: "whisk",
          targetText: "венчик",
          sourceLanguage: "en",
          targetLanguage: "ru",
          examples: [],
          synonyms: [],
        },
      ],
    };

    await commitImportPayload(payload);
    expect(mockImportVocabularyData).toHaveBeenCalledWith(payload);
  });
});
