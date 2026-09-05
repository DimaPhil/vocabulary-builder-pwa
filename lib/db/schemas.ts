import { z } from "zod";

import {
  DEFAULT_SOURCE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
  DEFAULT_ROTATION_HOURS,
  ROTATION_MAX_HOURS,
  ROTATION_MIN_HOURS,
} from "@/lib/constants/app";
import { slugify } from "@/lib/utils/strings";

const languageCodeSchema = z
  .string()
  .trim()
  .regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/, "Use a valid BCP-47 language tag.");

const textListSchema = z.array(z.string().trim().min(1)).default([]);

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required."),
  slug: z
    .string()
    .trim()
    .optional()
    .transform((value) => value ?? "")
    .transform((value) => slugify(value)),
});

export const categoryInputSchema = categorySchema.transform((value) => ({
  ...value,
  slug: value.slug || slugify(value.name),
}));

export const itemImageSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("none"),
    uri: z.null(),
  }),
  z.object({
    kind: z.literal("remote"),
    uri: z.string().url().startsWith("https://"),
  }),
  z.object({
    kind: z.literal("local"),
    uri: z.string().min(1),
  }),
]);

export const vocabularyItemSchema = z.object({
  categoryId: z.number().int().positive(),
  sourceText: z.string().trim().min(1, "Source text is required."),
  targetText: z.string().trim().min(1, "Translation or explanation is required."),
  sourceLanguage: languageCodeSchema.default(DEFAULT_SOURCE_LANGUAGE),
  targetLanguage: languageCodeSchema.default(DEFAULT_TARGET_LANGUAGE),
  examples: textListSchema,
  synonyms: textListSchema,
  image: itemImageSchema.default({
    kind: "none",
    uri: null,
  }),
});

export const appSettingsSchema = z.object({
  defaultSourceLanguage: languageCodeSchema.default(DEFAULT_SOURCE_LANGUAGE),
  defaultTargetLanguage: languageCodeSchema.default(DEFAULT_TARGET_LANGUAGE),
  rotationHours: z
    .number()
    .int()
    .min(ROTATION_MIN_HOURS)
    .max(ROTATION_MAX_HOURS)
    .default(DEFAULT_ROTATION_HOURS),
  rotationSeed: z.string().trim().min(1),
});

const importCategorySchema = z.object({
  slug: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

const importItemSchema = z.object({
  category: z.string().trim().min(1),
  sourceText: z.string().trim().min(1),
  targetText: z.string().trim().min(1),
  sourceLanguage: languageCodeSchema,
  targetLanguage: languageCodeSchema,
  examples: textListSchema.optional().default([]),
  synonyms: textListSchema.optional().default([]),
  imageUrl: z.string().url().startsWith("https://").optional(),
});

export const importPayloadSchema = z.object({
  categories: z.array(importCategorySchema),
  items: z.array(importItemSchema),
});

const storedCategorySchema = z.object({
  id: z.number().int().positive(),
  slug: z.string().trim().min(1),
  name: z.string().trim().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

const storedVocabularyItemSchema = z
  .object({
    id: z.number().int().positive(),
    categoryId: z.number().int().positive(),
    sourceText: z.string().trim().min(1),
    targetText: z.string().trim().min(1),
    sourceLanguage: languageCodeSchema,
    targetLanguage: languageCodeSchema,
    examples: textListSchema,
    synonyms: textListSchema,
    imageKind: z.enum(["none", "remote", "local"]),
    imageUri: z.string().nullable(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
  })
  .superRefine((item, context) => {
    if (item.imageKind === "none" && item.imageUri !== null) {
      context.addIssue({ code: "custom", message: "An item without an image cannot have an image URI." });
    }
    if (item.imageKind !== "none" && !item.imageUri) {
      context.addIssue({ code: "custom", message: "An image URI is required." });
    }
    if (item.imageKind === "remote" && item.imageUri && !item.imageUri.startsWith("https://")) {
      context.addIssue({ code: "custom", message: "Remote images must use HTTPS." });
    }
  });

export const persistedAppStateSchema = z
  .object({
    version: z.literal(1),
    nextCategoryId: z.number().int().positive(),
    nextItemId: z.number().int().positive(),
    categories: z.array(storedCategorySchema),
    items: z.array(storedVocabularyItemSchema),
    settings: appSettingsSchema,
  })
  .superRefine((state, context) => {
    const categoryIds = new Set<number>();
    const categorySlugs = new Set<string>();
    const itemIds = new Set<number>();

    state.categories.forEach((category, index) => {
      if (categoryIds.has(category.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate category id ${category.id}.`,
          path: ["categories", index, "id"],
        });
      }
      if (categorySlugs.has(category.slug)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate category slug "${category.slug}".`,
          path: ["categories", index, "slug"],
        });
      }
      categoryIds.add(category.id);
      categorySlugs.add(category.slug);
    });

    state.items.forEach((item, index) => {
      if (itemIds.has(item.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate item id ${item.id}.`,
          path: ["items", index, "id"],
        });
      }
      if (!categoryIds.has(item.categoryId)) {
        context.addIssue({
          code: "custom",
          message: `Unknown category id ${item.categoryId}.`,
          path: ["items", index, "categoryId"],
        });
      }
      itemIds.add(item.id);
    });

    if (state.categories.some((category) => category.id >= state.nextCategoryId)) {
      context.addIssue({
        code: "custom",
        message: "Next category id must exceed every stored category id.",
        path: ["nextCategoryId"],
      });
    }
    if (state.items.some((item) => item.id >= state.nextItemId)) {
      context.addIssue({
        code: "custom",
        message: "Next item id must exceed every stored item id.",
        path: ["nextItemId"],
      });
    }
  });

export const appStateBackupSchema = z.object({
  format: z.literal("vocabulary-builder-backup"),
  exportedAt: z.string().min(1),
  state: persistedAppStateSchema,
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type VocabularyItemInput = z.infer<typeof vocabularyItemSchema>;
export type AppSettingsInput = z.infer<typeof appSettingsSchema>;
export type ImportPayload = z.infer<typeof importPayloadSchema>;
