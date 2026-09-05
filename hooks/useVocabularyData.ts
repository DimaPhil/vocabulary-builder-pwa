import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/constants/queryKeys";
import {
  type AppSettingsInput,
  type CategoryInput,
  type VocabularyItemInput,
} from "@/lib/db/schemas";
import {
  createCategory,
  createVocabularyItem,
  deleteCategory,
  deleteVocabularyItem,
  getAppSettings,
  getCategories,
  getCategoryUsage,
  getDashboardStats,
  getAllVocabularyItems,
  updateAppSettings,
  updateCategory,
  updateVocabularyItem,
} from "@/lib/db/repositories";

export function useCategoriesQuery() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: getCategories,
  });
}

export function useVocabularyItemsQuery() {
  return useQuery({
    queryKey: queryKeys.items,
    queryFn: getAllVocabularyItems,
  });
}

export function useSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: getAppSettings,
  });
}

export function useStatsQuery() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: getDashboardStats,
  });
}

function useInvalidateVocabularyData() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
      queryClient.invalidateQueries({ queryKey: queryKeys.items }),
      queryClient.invalidateQueries({ queryKey: queryKeys.settings }),
      queryClient.invalidateQueries({ queryKey: queryKeys.stats }),
    ]);
  };
}

export function useCreateCategoryMutation() {
  const invalidate = useInvalidateVocabularyData();

  return useMutation({
    mutationFn: (input: CategoryInput) => createCategory(input),
    onSuccess: invalidate,
  });
}

export function useUpdateCategoryMutation() {
  const invalidate = useInvalidateVocabularyData();

  return useMutation({
    mutationFn: async ({
      categoryId,
      input,
    }: {
      categoryId: number;
      input: CategoryInput;
    }) => updateCategory(categoryId, input),
    onSuccess: invalidate,
  });
}

export function useDeleteCategoryMutation() {
  const invalidate = useInvalidateVocabularyData();

  return useMutation({
    mutationFn: async ({
      categoryId,
      options,
    }: {
      categoryId: number;
      options?: {
        reassignToCategoryId?: number;
        deleteItems?: boolean;
      };
    }) => deleteCategory(categoryId, options),
    onSuccess: invalidate,
  });
}

export function useCreateVocabularyItemMutation() {
  const invalidate = useInvalidateVocabularyData();

  return useMutation({
    mutationFn: (input: VocabularyItemInput) => createVocabularyItem(input),
    onSuccess: invalidate,
  });
}

export function useUpdateVocabularyItemMutation() {
  const invalidate = useInvalidateVocabularyData();

  return useMutation({
    mutationFn: async ({
      itemId,
      input,
    }: {
      itemId: number;
      input: VocabularyItemInput;
    }) => updateVocabularyItem(itemId, input),
    onSuccess: invalidate,
  });
}

export function useDeleteVocabularyItemMutation() {
  const invalidate = useInvalidateVocabularyData();

  return useMutation({
    mutationFn: (itemId: number) => deleteVocabularyItem(itemId),
    onSuccess: invalidate,
  });
}

export function useUpdateSettingsMutation() {
  const invalidate = useInvalidateVocabularyData();

  return useMutation({
    mutationFn: (input: AppSettingsInput) => updateAppSettings(input),
    onSuccess: invalidate,
  });
}

export function useCategoryUsageQuery(categoryId?: number) {
  return useQuery({
    enabled: Boolean(categoryId),
    queryKey: [...queryKeys.categories, "usage", categoryId],
    queryFn: () => getCategoryUsage(categoryId ?? 0),
  });
}
