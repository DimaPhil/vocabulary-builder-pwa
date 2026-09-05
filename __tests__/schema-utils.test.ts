import { appSettingsSchema, categoryInputSchema, importPayloadSchema } from "@/lib/db/schemas";
import { createSeed, hashString } from "@/lib/utils/random";
import { normalizeList, slugify, splitCommaList } from "@/lib/utils/strings";

describe("schemas and utilities", () => {
  it("normalizes category input by generating a slug", () => {
    expect(
      categoryInputSchema.parse({
        name: "Phrasal Verbs",
        slug: "",
      })
    ).toEqual({
      name: "Phrasal Verbs",
      slug: "phrasal-verbs",
    });
  });

  it("parses valid import payloads", () => {
    expect(
      importPayloadSchema.parse({
        categories: [{ slug: "kitchen", name: "Kitchen" }],
        items: [
          {
            category: "kitchen",
            sourceText: "whisk",
            targetText: "a kitchen tool",
            sourceLanguage: "en",
            targetLanguage: "en",
          },
        ],
      }).items
    ).toHaveLength(1);
  });

  it("validates rotating-word settings range", () => {
    expect(() =>
      appSettingsSchema.parse({
        defaultSourceLanguage: "en",
        defaultTargetLanguage: "ru",
        rotationHours: 0,
        rotationSeed: "seed",
      })
    ).toThrow();
  });

  it("handles common string utilities", () => {
    expect(slugify("  Kitchen Sink  ")).toBe("kitchen-sink");
    expect(normalizeList("one\n\ntwo")).toEqual(["one", "two"]);
    expect(splitCommaList("a, b, c")).toEqual(["a", "b", "c"]);
  });

  it("creates stable hash outputs and non-empty seeds", () => {
    expect(hashString("rotation-slot")).toBe(hashString("rotation-slot"));
    expect(createSeed()).toContain("-");
  });
});
