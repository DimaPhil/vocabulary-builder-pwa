import type {
  AppSettingsInput,
  CategoryInput,
  ImportPayload,
  VocabularyItemInput,
} from "@/lib/db/schemas";
import { getAppState, updateAppState } from "@/lib/storage/indexedDb";
import type { AppSettings, Category, DashboardStats, VocabularyItem } from "@/lib/types";
import { isoNow } from "@/lib/utils/date";

function withCategory(
  item: Omit<VocabularyItem, "categoryName" | "categorySlug">,
  categories: Map<number, Category>
) {
  const category = categories.get(item.categoryId);

  return {
    ...item,
    categoryName: category?.name,
    categorySlug: category?.slug,
  };
}

export async function getCategories(): Promise<Category[]> {
  const { categories } = await getAppState();
  return [...categories].sort((left, right) => left.name.localeCompare(right.name));
}

export async function createCategory(input: CategoryInput) {
  return updateAppState((state) => {
    if (state.categories.some((category) => category.slug === input.slug)) {
      throw new Error(`Category slug "${input.slug}" already exists.`);
    }

    const now = isoNow();
    state.categories.push({
      id: state.nextCategoryId++,
      slug: input.slug,
      name: input.name,
      createdAt: now,
      updatedAt: now,
    });
  });
}

export async function updateCategory(categoryId: number, input: CategoryInput) {
  return updateAppState((state) => {
    const category = state.categories.find((candidate) => candidate.id === categoryId);

    if (!category) {
      throw new Error("Category does not exist.");
    }
    if (
      state.categories.some(
        (candidate) => candidate.id !== categoryId && candidate.slug === input.slug
      )
    ) {
      throw new Error(`Category slug "${input.slug}" already exists.`);
    }

    category.slug = input.slug;
    category.name = input.name;
    category.updatedAt = isoNow();
  });
}

export async function getCategoryUsage(categoryId: number) {
  const { items } = await getAppState();
  return items.filter((item) => item.categoryId === categoryId).length;
}

export async function deleteCategory(
  categoryId: number,
  options?: {
    reassignToCategoryId?: number;
    deleteItems?: boolean;
  }
) {
  return updateAppState((state) => {
    if (!state.categories.some((category) => category.id === categoryId)) {
      return;
    }

    const used = state.items.some((item) => item.categoryId === categoryId);

    if (used && !options?.deleteItems && !options?.reassignToCategoryId) {
      throw new Error("Choose whether to delete or reassign this category's items.");
    }

    if (options?.deleteItems) {
      state.items = state.items.filter((item) => item.categoryId !== categoryId);
    } else if (options?.reassignToCategoryId) {
      if (
        options.reassignToCategoryId === categoryId ||
        !state.categories.some((category) => category.id === options.reassignToCategoryId)
      ) {
        throw new Error("Reassignment category does not exist.");
      }

      const now = isoNow();
      state.items.forEach((item) => {
        if (item.categoryId === categoryId) {
          item.categoryId = options.reassignToCategoryId!;
          item.updatedAt = now;
        }
      });
    }

    state.categories = state.categories.filter((category) => category.id !== categoryId);
  });
}

export async function getAllVocabularyItems(): Promise<VocabularyItem[]> {
  const { categories, items } = await getAppState();
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  return items
    .map((item) => withCategory(item, categoryById))
    .sort((left, right) => left.sourceText.localeCompare(right.sourceText));
}

export async function getVocabularyItemById(itemId: number) {
  const { categories, items } = await getAppState();
  const item = items.find((candidate) => candidate.id === itemId);
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  return item ? withCategory(item, categoryById) : null;
}

export async function createVocabularyItem(input: VocabularyItemInput) {
  return updateAppState((state) => {
    if (!state.categories.some((category) => category.id === input.categoryId)) {
      throw new Error("Category does not exist.");
    }

    const now = isoNow();
    state.items.push({
      id: state.nextItemId++,
      categoryId: input.categoryId,
      sourceText: input.sourceText,
      targetText: input.targetText,
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
      examples: input.examples,
      synonyms: input.synonyms,
      imageKind: input.image.kind,
      imageUri: input.image.uri,
      createdAt: now,
      updatedAt: now,
    });
  });
}

export async function updateVocabularyItem(itemId: number, input: VocabularyItemInput) {
  return updateAppState((state) => {
    const item = state.items.find((candidate) => candidate.id === itemId);

    if (!item) {
      throw new Error("Vocabulary item does not exist.");
    }
    if (!state.categories.some((category) => category.id === input.categoryId)) {
      throw new Error("Category does not exist.");
    }

    Object.assign(item, {
      categoryId: input.categoryId,
      sourceText: input.sourceText,
      targetText: input.targetText,
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
      examples: input.examples,
      synonyms: input.synonyms,
      imageKind: input.image.kind,
      imageUri: input.image.uri,
      updatedAt: isoNow(),
    });
  });
}

export async function deleteVocabularyItem(itemId: number) {
  return updateAppState((state) => {
    state.items = state.items.filter((item) => item.id !== itemId);
  });
}

export async function getAppSettings(): Promise<AppSettings> {
  return (await getAppState()).settings;
}

export async function updateAppSettings(settings: AppSettingsInput) {
  return updateAppState((state) => {
    state.settings = settings;
  });
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { categories, items } = await getAppState();

  return {
    totalItems: items.length,
    totalCategories: categories.length,
    withImages: items.filter((item) => item.imageKind !== "none").length,
  };
}

export async function importVocabularyData(payload: ImportPayload) {
  return updateAppState((state) => {
    const categoryIdBySlug = new Map(
      state.categories.map((category) => [category.slug, category.id])
    );
    const now = isoNow();

    payload.categories.forEach((category) => {
      if (categoryIdBySlug.has(category.slug)) {
        return;
      }

      const id = state.nextCategoryId++;
      state.categories.push({ ...category, id, createdAt: now, updatedAt: now });
      categoryIdBySlug.set(category.slug, id);
    });

    const importedItems = payload.items.map((item) => {
      const categoryId = categoryIdBySlug.get(item.category);

      if (!categoryId) {
        throw new Error(`Category "${item.category}" does not exist.`);
      }

      return {
        id: state.nextItemId++,
        categoryId,
        sourceText: item.sourceText,
        targetText: item.targetText,
        sourceLanguage: item.sourceLanguage,
        targetLanguage: item.targetLanguage,
        examples: item.examples,
        synonyms: item.synonyms,
        imageKind: item.imageUrl ? ("remote" as const) : ("none" as const),
        imageUri: item.imageUrl ?? null,
        createdAt: now,
        updatedAt: now,
      };
    });

    state.items.push(...importedItems);
  });
}
