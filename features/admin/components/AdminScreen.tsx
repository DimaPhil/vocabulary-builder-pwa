import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Image, Modal, View } from "react-native";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CategoryPicker } from "@/components/ui/CategoryPicker";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Page } from "@/components/ui/Page";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import {
  DEFAULT_SOURCE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
} from "@/lib/constants/app";
import { queryKeys } from "@/lib/constants/queryKeys";
import {
  appStateBackupSchema,
  appSettingsSchema,
  categoryInputSchema,
  vocabularyItemSchema,
} from "@/lib/db/schemas";
import type { Category, VocabularyItem } from "@/lib/types";
import {
  copyImageToAppStorage,
  readLocalImage,
  validateRemoteImageUrl,
} from "@/lib/images/service";
import { useAppTheme } from "@/lib/theme";
import {
  commitImportPayload,
  exportAppState,
  previewImportPayload,
  restoreAppState,
  type ImportPreview,
} from "@/features/admin/schemas/import";
import {
  useCategoriesQuery,
  useCreateCategoryMutation,
  useCreateVocabularyItemMutation,
  useDeleteCategoryMutation,
  useDeleteVocabularyItemMutation,
  useSettingsQuery,
  useUpdateCategoryMutation,
  useUpdateSettingsMutation,
  useUpdateVocabularyItemMutation,
  useVocabularyItemsQuery,
} from "@/hooks/useVocabularyData";

const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "Category name is required."),
  slug: z.string().trim().optional(),
});

const itemFormSchema = z.object({
  categoryId: z.number().int().positive("Select a category."),
  sourceText: z.string().trim().min(1, "Source text is required."),
  targetText: z
    .string()
    .trim()
    .min(1, "Translation or explanation is required."),
  sourceLanguage: z.string().trim().min(2),
  targetLanguage: z.string().trim().min(2),
  examplesText: z.string(),
  synonymsText: z.string(),
  imageMode: z.enum(["none", "remote", "local"]),
  imageUri: z.string(),
});

const settingsFormSchema = z.object({
  defaultSourceLanguage: z.string().trim().min(2),
  defaultTargetLanguage: z.string().trim().min(2),
  rotationHours: z
    .string()
    .trim()
    .regex(/^\d+$/, "Rotation must be a whole number."),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;
type ItemFormValues = z.infer<typeof itemFormSchema>;
type SettingsFormValues = z.infer<typeof settingsFormSchema>;
const ADMIN_ITEMS_PAGE_SIZE = 20;
const ADMIN_CATEGORIES_PAGE_SIZE = 20;
const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

export function AdminScreen() {
  const theme = useAppTheme();
  const queryClient = useQueryClient();
  const { data: categories = [] } = useCategoriesQuery();
  const { data: items = [] } = useVocabularyItemsQuery();
  const { data: settings } = useSettingsQuery();
  const createCategoryMutation = useCreateCategoryMutation();
  const updateCategoryMutation = useUpdateCategoryMutation();
  const deleteCategoryMutation = useDeleteCategoryMutation();
  const createItemMutation = useCreateVocabularyItemMutation();
  const updateItemMutation = useUpdateVocabularyItemMutation();
  const deleteItemMutation = useDeleteVocabularyItemMutation();
  const updateSettingsMutation = useUpdateSettingsMutation();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingItem, setEditingItem] = useState<VocabularyItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [categoryPendingDeletion, setCategoryPendingDeletion] =
    useState<Category | null>(null);
  const [itemPendingDeletion, setItemPendingDeletion] =
    useState<VocabularyItem | null>(null);
  const [reassignCategoryId, setReassignCategoryId] = useState<number | null>(
    null,
  );
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryPage, setCategoryPage] = useState(0);
  const [itemSearch, setItemSearch] = useState("");
  const [itemCategoryFilter, setItemCategoryFilter] = useState<number | "all">(
    "all",
  );
  const [itemPage, setItemPage] = useState(0);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const [importText, setImportText] = useState("");
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(
    null,
  );
  const [importFileError, setImportFileError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [backupText, setBackupText] = useState("");
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backupReady, setBackupReady] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const deferredCategorySearch = useDeferredValue(categorySearch);
  const deferredItemSearch = useDeferredValue(itemSearch);

  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  const itemForm = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      categoryId: categories[0]?.id ?? 0,
      sourceText: "",
      targetText: "",
      sourceLanguage:
        settings?.defaultSourceLanguage ?? DEFAULT_SOURCE_LANGUAGE,
      targetLanguage:
        settings?.defaultTargetLanguage ?? DEFAULT_TARGET_LANGUAGE,
      examplesText: "",
      synonymsText: "",
      imageMode: "none",
      imageUri: "",
    },
  });

  const settingsForm = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    values: {
      defaultSourceLanguage:
        settings?.defaultSourceLanguage ?? DEFAULT_SOURCE_LANGUAGE,
      defaultTargetLanguage:
        settings?.defaultTargetLanguage ?? DEFAULT_TARGET_LANGUAGE,
      rotationHours: String(settings?.rotationHours ?? 1),
    },
  });

  const filteredItems = items.filter((item) => {
    const query = deferredItemSearch.trim().toLowerCase();
    const matchesCategory =
      itemCategoryFilter === "all" || item.categoryId === itemCategoryFilter;

    if (!matchesCategory) {
      return false;
    }

    if (!query) {
      return true;
    }

    return (
      item.sourceText.toLowerCase().includes(query) ||
      item.targetText.toLowerCase().includes(query) ||
      (item.categoryName ?? "").toLowerCase().includes(query)
    );
  });
  const totalItemPages = Math.max(
    1,
    Math.ceil(filteredItems.length / ADMIN_ITEMS_PAGE_SIZE),
  );
  const safeItemPage = Math.min(itemPage, totalItemPages - 1);
  const paginatedItems = filteredItems.slice(
    safeItemPage * ADMIN_ITEMS_PAGE_SIZE,
    (safeItemPage + 1) * ADMIN_ITEMS_PAGE_SIZE,
  );
  const itemCountsByCategory = useMemo(() => {
    const counts = new Map<number, number>();
    items.forEach((item) =>
      counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1),
    );
    return counts;
  }, [items]);
  const filteredCategories = categories.filter((category) => {
    const query = deferredCategorySearch.trim().toLowerCase();
    return (
      !query ||
      category.name.toLowerCase().includes(query) ||
      category.slug.toLowerCase().includes(query)
    );
  });
  const totalCategoryPages = Math.max(
    1,
    Math.ceil(filteredCategories.length / ADMIN_CATEGORIES_PAGE_SIZE),
  );
  const safeCategoryPage = Math.min(categoryPage, totalCategoryPages - 1);
  const paginatedCategories = filteredCategories.slice(
    safeCategoryPage * ADMIN_CATEGORIES_PAGE_SIZE,
    (safeCategoryPage + 1) * ADMIN_CATEGORIES_PAGE_SIZE,
  );

  async function handleCategorySubmit(values: CategoryFormValues) {
    const input = categoryInputSchema.parse(values);

    if (editingCategory) {
      await updateCategoryMutation.mutateAsync({
        categoryId: editingCategory.id,
        input,
      });
      setEditingCategory(null);
    } else {
      await createCategoryMutation.mutateAsync(input);
    }

    categoryForm.reset({
      name: "",
      slug: "",
    });
  }

  async function handleItemSubmit(values: ItemFormValues) {
    let image: {
      kind: "none" | "remote" | "local";
      uri: string | null;
    } = {
      kind: "none",
      uri: null,
    };

    if (values.imageMode === "remote" && values.imageUri.trim()) {
      image = {
        kind: "remote",
        uri: await validateRemoteImageUrl(values.imageUri.trim()),
      };
    }

    if (values.imageMode === "local" && values.imageUri.trim()) {
      image = {
        kind: "local",
        uri:
          editingItem?.imageKind === "local" &&
          editingItem.imageUri === values.imageUri
            ? values.imageUri
            : await copyImageToAppStorage(values.imageUri),
      };
    }

    const input = vocabularyItemSchema.parse({
      categoryId: values.categoryId,
      sourceText: values.sourceText,
      targetText: values.targetText,
      sourceLanguage: values.sourceLanguage,
      targetLanguage: values.targetLanguage,
      examples: values.examplesText
        .split("\n")
        .map((entry) => entry.trim())
        .filter(Boolean),
      synonyms: values.synonymsText
        .split("\n")
        .map((entry) => entry.trim())
        .filter(Boolean),
      image,
    });

    if (editingItem) {
      await updateItemMutation.mutateAsync({
        itemId: editingItem.id,
        input,
      });
    } else {
      await createItemMutation.mutateAsync(input);
    }

    closeItemModal();
  }

  async function handleSettingsSubmit(values: SettingsFormValues) {
    if (!settings) {
      return;
    }

    const input = appSettingsSchema.parse({
      defaultSourceLanguage: values.defaultSourceLanguage,
      defaultTargetLanguage: values.defaultTargetLanguage,
      rotationHours: Number(values.rotationHours),
      rotationSeed: settings.rotationSeed,
    });

    await updateSettingsMutation.mutateAsync(input);
  }

  async function handleLoadImportFile() {
    const file = await pickBrowserFile("application/json,.json");

    if (!file) {
      return;
    }

    if (file.size > MAX_IMPORT_BYTES) {
      setImportFileError("Import file must be 10 MB or smaller.");
      return;
    }

    setImportText(await file.text());
    setImportFileError(null);
    setImportPreview(null);
  }

  async function handlePreviewImport() {
    const preview = await previewImportPayload(importText);
    setImportPreview(preview);
  }

  async function handleCommitImport() {
    if (!importPreview?.payload) {
      return;
    }

    setImporting(true);

    try {
      await commitImportPayload(importPreview.payload);
      await refreshData();
      setImportText("");
      setImportPreview(null);
    } finally {
      setImporting(false);
    }
  }

  async function refreshData() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
      queryClient.invalidateQueries({ queryKey: queryKeys.items }),
      queryClient.invalidateQueries({ queryKey: queryKeys.settings }),
      queryClient.invalidateQueries({ queryKey: queryKeys.stats }),
    ]);
  }

  async function handleExportBackup() {
    const value = await exportAppState();
    setBackupText(value);
    setBackupError(null);
    setBackupReady(false);
    downloadBrowserText(
      value,
      `vocabulary-builder-${new Date().toISOString().slice(0, 10)}.json`,
    );
  }

  async function handleLoadBackupFile() {
    const file = await pickBrowserFile("application/json,.json");

    if (!file) {
      return;
    }

    if (file.size > MAX_IMPORT_BYTES) {
      setBackupError("Backup file must be 10 MB or smaller.");
      setBackupReady(false);
      return;
    }

    setBackupText(await file.text());
    setBackupError(null);
    setBackupReady(false);
  }

  function handlePreviewBackup() {
    try {
      const result = appStateBackupSchema.safeParse(JSON.parse(backupText));
      setBackupError(
        result.success
          ? null
          : result.error.issues.map((issue) => issue.message).join(" "),
      );
      setBackupReady(result.success);
    } catch {
      setBackupError("Backup must be valid JSON.");
      setBackupReady(false);
    }
  }

  async function handleRestoreBackup() {
    if (!backupReady) {
      return;
    }

    setRestoring(true);
    try {
      await restoreAppState(backupText);
      await refreshData();
      setBackupReady(false);
      setBackupError(null);
    } finally {
      setRestoring(false);
    }
  }

  function openCreateItemModal() {
    itemForm.reset({
      categoryId: categories[0]?.id ?? 0,
      sourceText: "",
      targetText: "",
      sourceLanguage:
        settings?.defaultSourceLanguage ?? DEFAULT_SOURCE_LANGUAGE,
      targetLanguage:
        settings?.defaultTargetLanguage ?? DEFAULT_TARGET_LANGUAGE,
      examplesText: "",
      synonymsText: "",
      imageMode: "none",
      imageUri: "",
    });
    setImageError(null);
    setEditingItem(null);
    setShowItemModal(true);
  }

  function openEditItemModal(item: VocabularyItem) {
    itemForm.reset({
      categoryId: item.categoryId,
      sourceText: item.sourceText,
      targetText: item.targetText,
      sourceLanguage: item.sourceLanguage,
      targetLanguage: item.targetLanguage,
      examplesText: item.examples.join("\n"),
      synonymsText: item.synonyms.join("\n"),
      imageMode: item.imageKind,
      imageUri: item.imageUri ?? "",
    });
    setImageError(null);
    setEditingItem(item);
    setShowItemModal(true);
  }

  function closeItemModal() {
    setShowItemModal(false);
    setEditingItem(null);
  }

  function closeCategoryDeletion() {
    setCategoryPendingDeletion(null);
    setReassignCategoryId(null);
  }

  async function pickLocalImage() {
    const file = await pickBrowserFile("image/*");

    if (!file) {
      return;
    }

    try {
      itemForm.setValue("imageMode", "local");
      itemForm.setValue("imageUri", await readLocalImage(file));
      setImageError(null);
    } catch (error) {
      itemForm.setValue("imageMode", "none");
      itemForm.setValue("imageUri", "");
      setImageError(
        error instanceof Error ? error.message : "Image could not be read.",
      );
    }
  }

  return (
    <Page>
      <SectionHeader
        eyebrow="Admin"
        title="Control categories, items, imports, and app settings"
        description="All writes are validated before they reach browser storage."
      />

      <Card>
        <Text variant="heading">Defaults and Word of the moment</Text>
        <View style={{ gap: 10 }}>
          <Controller
            control={settingsForm.control}
            name="defaultSourceLanguage"
            render={({ field, fieldState }) => (
              <TextField
                autoCapitalize="none"
                error={fieldState.error?.message}
                label="Default source language"
                onChangeText={field.onChange}
                value={field.value}
              />
            )}
          />
          <Controller
            control={settingsForm.control}
            name="defaultTargetLanguage"
            render={({ field, fieldState }) => (
              <TextField
                autoCapitalize="none"
                error={fieldState.error?.message}
                label="Default target language"
                onChangeText={field.onChange}
                value={field.value}
              />
            )}
          />
          <Controller
            control={settingsForm.control}
            name="rotationHours"
            render={({ field, fieldState }) => (
              <TextField
                error={fieldState.error?.message}
                keyboardType="number-pad"
                label="Word rotation hours"
                onChangeText={field.onChange}
                value={field.value}
              />
            )}
          />
          <Button
            label="Save settings"
            onPress={settingsForm.handleSubmit(handleSettingsSubmit)}
          />
        </View>
      </Card>

      <Card>
        <Text variant="heading">Categories</Text>
        <View style={{ gap: 10 }}>
          <Controller
            control={categoryForm.control}
            name="name"
            render={({ field, fieldState }) => (
              <TextField
                error={fieldState.error?.message}
                label="Category name"
                onChangeText={field.onChange}
                value={field.value}
              />
            )}
          />
          <Controller
            control={categoryForm.control}
            name="slug"
            render={({ field }) => (
              <TextField
                autoCapitalize="none"
                helperText="Optional. Leave blank to auto-generate from the name."
                label="Slug"
                onChangeText={field.onChange}
                value={field.value}
              />
            )}
          />
          <Button
            label={editingCategory ? "Update category" : "Add category"}
            onPress={categoryForm.handleSubmit(handleCategorySubmit)}
          />
          {editingCategory ? (
            <Button
              label="Cancel edit"
              onPress={() => {
                setEditingCategory(null);
                categoryForm.reset({
                  name: "",
                  slug: "",
                });
              }}
              variant="ghost"
            />
          ) : null}
        </View>

        <TextField
          label="Search categories"
          onChangeText={(value) => {
            setCategorySearch(value);
            setCategoryPage(0);
          }}
          placeholder="Level or topic"
          value={categorySearch}
        />
        {filteredCategories.length ? (
          <View style={{ gap: 10 }}>
            <Text color={theme.colors.textMuted} variant="caption">
              Showing {safeCategoryPage * ADMIN_CATEGORIES_PAGE_SIZE + 1}-
              {safeCategoryPage * ADMIN_CATEGORIES_PAGE_SIZE +
                paginatedCategories.length}{" "}
              of {filteredCategories.length} categories
            </Text>
            {paginatedCategories.map((category) => {
              const usageCount = itemCountsByCategory.get(category.id) ?? 0;

              return (
                <Card key={category.id} style={{ padding: 14 }}>
                  <Text variant="heading">{category.name}</Text>
                  <Text color={theme.colors.textMuted} variant="caption">
                    {category.slug} • {usageCount} item(s)
                  </Text>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Button
                      label="Edit"
                      onPress={() => {
                        setEditingCategory(category);
                        categoryForm.reset({
                          name: category.name,
                          slug: category.slug,
                        });
                      }}
                      variant="secondary"
                    />
                    <Button
                      label="Delete"
                      onPress={() => {
                        setCategoryPendingDeletion(category);
                        setReassignCategoryId(null);
                      }}
                      variant="danger"
                    />
                  </View>
                </Card>
              );
            })}
            {totalCategoryPages > 1 ? (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    disabled={safeCategoryPage === 0}
                    label="Previous categories"
                    onPress={() =>
                      setCategoryPage((page) => Math.max(0, page - 1))
                    }
                    variant="secondary"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    disabled={safeCategoryPage >= totalCategoryPages - 1}
                    label={`Next categories (${safeCategoryPage + 1}/${totalCategoryPages})`}
                    onPress={() =>
                      setCategoryPage((page) =>
                        Math.min(totalCategoryPages - 1, page + 1),
                      )
                    }
                  />
                </View>
              </View>
            ) : null}
          </View>
        ) : (
          <EmptyState
            title={
              categories.length ? "No categories match" : "No categories yet"
            }
            description={
              categories.length
                ? "Change the category search."
                : "Create the first category before adding vocabulary items."
            }
          />
        )}
      </Card>

      <Card>
        <Text variant="heading">Vocabulary items</Text>
        <TextField
          label="Search items"
          onChangeText={(value) => {
            setItemSearch(value);
            setItemPage(0);
            setExpandedItemId(null);
          }}
          placeholder="Search text or category"
          value={itemSearch}
        />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <Chip
            active={itemCategoryFilter === "all"}
            label={`All (${items.length})`}
            onPress={() => {
              setItemCategoryFilter("all");
              setItemPage(0);
              setExpandedItemId(null);
            }}
          />
        </View>
        <CategoryPicker
          categories={categories}
          label="item category filter"
          onToggle={(categoryId) => {
            setItemCategoryFilter((current) =>
              current === categoryId ? "all" : categoryId,
            );
            setItemPage(0);
            setExpandedItemId(null);
          }}
          selectedIds={itemCategoryFilter === "all" ? [] : [itemCategoryFilter]}
        />
        <Text color={theme.colors.textMuted} variant="caption">
          Showing{" "}
          {paginatedItems.length ? safeItemPage * ADMIN_ITEMS_PAGE_SIZE + 1 : 0}
          {paginatedItems.length
            ? `-${safeItemPage * ADMIN_ITEMS_PAGE_SIZE + paginatedItems.length}`
            : ""}{" "}
          of {filteredItems.length} item(s)
        </Text>
        <Button label="Add item" onPress={openCreateItemModal} />
        {filteredItems.length ? (
          <View style={{ gap: 10 }}>
            {paginatedItems.map((item) => {
              const expanded = expandedItemId === item.id;

              return (
                <Card key={item.id} style={{ padding: 14 }}>
                  <View style={{ gap: 6 }}>
                    <Text variant="heading">{item.sourceText}</Text>
                    <Text numberOfLines={expanded ? undefined : 1}>
                      {item.targetText}
                    </Text>
                    <Text color={theme.colors.textMuted} variant="caption">
                      {item.categoryName} • {item.sourceLanguage} →{" "}
                      {item.targetLanguage}
                    </Text>
                  </View>

                  {expanded ? (
                    <>
                      {item.examples.length ? (
                        <Text color={theme.colors.textMuted}>
                          Examples: {item.examples.join(" • ")}
                        </Text>
                      ) : null}
                      {item.synonyms.length ? (
                        <Text color={theme.colors.textMuted}>
                          Synonyms: {item.synonyms.join(", ")}
                        </Text>
                      ) : null}
                      {item.imageUri ? (
                        <Image
                          accessibilityLabel={`Image for ${item.sourceText}`}
                          source={{ uri: item.imageUri }}
                          style={{
                            borderRadius: 18,
                            height: 120,
                            width: "100%",
                          }}
                        />
                      ) : null}
                    </>
                  ) : null}

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Button
                      label={expanded ? "Collapse" : "Details"}
                      onPress={() =>
                        setExpandedItemId((current) =>
                          current === item.id ? null : item.id,
                        )
                      }
                      variant="secondary"
                    />
                    <Button
                      label="Edit"
                      onPress={() => openEditItemModal(item)}
                      variant="secondary"
                    />
                    <Button
                      label="Delete"
                      onPress={() => setItemPendingDeletion(item)}
                      variant="danger"
                    />
                  </View>
                </Card>
              );
            })}
            {totalItemPages > 1 ? (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    disabled={safeItemPage === 0}
                    label="Previous page"
                    onPress={() => {
                      setExpandedItemId(null);
                      setItemPage((value) => Math.max(0, value - 1));
                    }}
                    variant="secondary"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    disabled={safeItemPage >= totalItemPages - 1}
                    label={`Next page (${safeItemPage + 1}/${totalItemPages})`}
                    onPress={() => {
                      setExpandedItemId(null);
                      setItemPage((value) =>
                        Math.min(totalItemPages - 1, value + 1),
                      );
                    }}
                  />
                </View>
              </View>
            ) : null}
          </View>
        ) : (
          <EmptyState
            title="No items match"
            description="Change the search or create a new item."
          />
        )}
      </Card>

      <Card>
        <Text variant="heading">Batch import</Text>
        <TextField
          label="JSON payload"
          multiline
          onChangeText={(value) => {
            setImportText(value);
            setImportFileError(null);
            setImportPreview(null);
          }}
          placeholder='{"categories":[...],"items":[...]}'
          style={{ minHeight: 180, textAlignVertical: "top" }}
          value={importText}
        />
        {importFileError ? (
          <Text color={theme.colors.danger}>{importFileError}</Text>
        ) : null}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button
              label="Load JSON file"
              onPress={handleLoadImportFile}
              variant="secondary"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Preview import" onPress={handlePreviewImport} />
          </View>
        </View>
        {importPreview ? (
          <Card style={{ padding: 14 }}>
            {importPreview.errors.length ? (
              <View style={{ gap: 6 }}>
                <Text color={theme.colors.danger} variant="heading">
                  Validation errors
                </Text>
                {importPreview.errors.map((error) => (
                  <Text key={error} color={theme.colors.danger}>
                    {error}
                  </Text>
                ))}
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <Text variant="heading">Preview looks valid</Text>
                <Text>
                  {importPreview.payload?.categories.length ?? 0} categories and{" "}
                  {importPreview.payload?.items.length ?? 0} items will be
                  appended.
                </Text>
                <Button
                  disabled={importing}
                  label={importing ? "Importing..." : "Commit import"}
                  onPress={handleCommitImport}
                />
              </View>
            )}
          </Card>
        ) : null}
      </Card>

      <Card>
        <Text variant="heading">Data backup</Text>
        <Text>
          Download a complete backup, or preview one before replacing all
          current data.
        </Text>
        <Button label="Download backup" onPress={handleExportBackup} />
        <TextField
          label="Backup JSON"
          multiline
          onChangeText={(value) => {
            setBackupText(value);
            setBackupError(null);
            setBackupReady(false);
          }}
          placeholder='{"format":"vocabulary-builder-backup",...}'
          style={{ minHeight: 140, textAlignVertical: "top" }}
          value={backupText}
        />
        {backupError ? (
          <Text color={theme.colors.danger}>{backupError}</Text>
        ) : null}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button
              label="Choose backup file"
              onPress={handleLoadBackupFile}
              variant="secondary"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Preview backup" onPress={handlePreviewBackup} />
          </View>
        </View>
        {backupReady ? (
          <Card style={{ padding: 14 }}>
            <Text variant="heading">Backup is valid</Text>
            <Text>
              This will replace every current category, item, and setting.
            </Text>
            <Button
              disabled={restoring}
              label={
                restoring ? "Restoring..." : "Replace data with this backup"
              }
              onPress={handleRestoreBackup}
              variant="danger"
            />
          </Card>
        ) : null}
      </Card>

      <Modal
        animationType="slide"
        onRequestClose={closeItemModal}
        visible={showItemModal}
      >
        <View accessibilityViewIsModal style={{ flex: 1 }}>
          <Page>
            <SectionHeader
              title={
                editingItem ? "Edit vocabulary item" : "Create vocabulary item"
              }
            />
            <Controller
              control={itemForm.control}
              name="categoryId"
              render={({ field, fieldState }) => (
                <View style={{ gap: 8 }}>
                  <Text variant="heading">Category</Text>
                  <CategoryPicker
                    allowEmpty={false}
                    categories={categories}
                    label="item category"
                    onToggle={field.onChange}
                    selectedIds={field.value ? [field.value] : []}
                  />
                  {fieldState.error ? (
                    <Text color={theme.colors.danger}>
                      {fieldState.error.message}
                    </Text>
                  ) : null}
                </View>
              )}
            />
            <Controller
              control={itemForm.control}
              name="sourceText"
              render={({ field, fieldState }) => (
                <TextField
                  error={fieldState.error?.message}
                  label="Word or phrase"
                  onChangeText={field.onChange}
                  value={field.value}
                />
              )}
            />
            <Controller
              control={itemForm.control}
              name="targetText"
              render={({ field, fieldState }) => (
                <TextField
                  error={fieldState.error?.message}
                  label="Translation or explanation"
                  onChangeText={field.onChange}
                  value={field.value}
                />
              )}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Controller
                  control={itemForm.control}
                  name="sourceLanguage"
                  render={({ field, fieldState }) => (
                    <TextField
                      autoCapitalize="none"
                      error={fieldState.error?.message}
                      label="Source language"
                      onChangeText={field.onChange}
                      value={field.value}
                    />
                  )}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Controller
                  control={itemForm.control}
                  name="targetLanguage"
                  render={({ field, fieldState }) => (
                    <TextField
                      autoCapitalize="none"
                      error={fieldState.error?.message}
                      label="Target language"
                      onChangeText={field.onChange}
                      value={field.value}
                    />
                  )}
                />
              </View>
            </View>
            <Controller
              control={itemForm.control}
              name="examplesText"
              render={({ field }) => (
                <TextField
                  helperText="One example per line."
                  label="Examples"
                  multiline
                  onChangeText={field.onChange}
                  style={{ minHeight: 120, textAlignVertical: "top" }}
                  value={field.value}
                />
              )}
            />
            <Controller
              control={itemForm.control}
              name="synonymsText"
              render={({ field }) => (
                <TextField
                  helperText="One synonym per line."
                  label="Synonyms"
                  multiline
                  onChangeText={field.onChange}
                  style={{ minHeight: 120, textAlignVertical: "top" }}
                  value={field.value}
                />
              )}
            />
            <Card>
              <Text variant="heading">Image</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Button
                  label="No image"
                  onPress={() => {
                    itemForm.setValue("imageMode", "none");
                    itemForm.setValue("imageUri", "");
                    setImageError(null);
                  }}
                  variant="secondary"
                />
                <Button
                  label="Pick local image"
                  onPress={pickLocalImage}
                  variant="secondary"
                />
              </View>
              {itemForm.watch("imageMode") === "local" ? (
                <Text color={theme.colors.textMuted}>
                  Local image selected.
                </Text>
              ) : (
                <Controller
                  control={itemForm.control}
                  name="imageUri"
                  render={({ field }) => (
                    <TextField
                      autoCapitalize="none"
                      helperText="Optional. Remote image URLs must use HTTPS."
                      label="Remote image URL"
                      onChangeText={(value) => {
                        itemForm.setValue(
                          "imageMode",
                          value ? "remote" : "none",
                        );
                        field.onChange(value);
                        setImageError(null);
                      }}
                      value={field.value}
                    />
                  )}
                />
              )}
              {imageError ? (
                <Text color={theme.colors.danger}>{imageError}</Text>
              ) : null}
              {itemForm.watch("imageUri") ? (
                <Image
                  accessibilityLabel="Selected vocabulary image"
                  source={{ uri: itemForm.watch("imageUri") }}
                  style={{
                    borderRadius: 18,
                    height: 180,
                    width: "100%",
                  }}
                />
              ) : null}
            </Card>
            <View style={{ gap: 10 }}>
              <Button
                label={editingItem ? "Save item" : "Create item"}
                onPress={itemForm.handleSubmit(handleItemSubmit)}
              />
              <Button label="Cancel" onPress={closeItemModal} variant="ghost" />
            </View>
          </Page>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={closeCategoryDeletion}
        transparent
        visible={Boolean(categoryPendingDeletion)}
      >
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            flex: 1,
            justifyContent: "center",
            padding: theme.spacing.lg,
          }}
        >
          <Card>
            <Text variant="title">Delete category?</Text>
            <Text>
              {categoryPendingDeletion
                ? `${categoryPendingDeletion.name} contains ${itemCountsByCategory.get(categoryPendingDeletion.id) ?? 0} item(s).`
                : ""}
            </Text>
            {categoryPendingDeletion &&
            (itemCountsByCategory.get(categoryPendingDeletion.id) ?? 0) > 0 &&
            categories.length > 1 ? (
              <>
                <Text variant="heading">Move items to</Text>
                <CategoryPicker
                  allowEmpty={false}
                  categories={categories.filter(
                    (category) => category.id !== categoryPendingDeletion.id,
                  )}
                  label="replacement category"
                  onToggle={setReassignCategoryId}
                  selectedIds={reassignCategoryId ? [reassignCategoryId] : []}
                />
                <Button
                  disabled={!reassignCategoryId}
                  label="Move items and delete category"
                  onPress={() => {
                    if (!reassignCategoryId) {
                      return;
                    }
                    deleteCategoryMutation.mutate({
                      categoryId: categoryPendingDeletion.id,
                      options: { reassignToCategoryId: reassignCategoryId },
                    });
                    closeCategoryDeletion();
                  }}
                  variant="secondary"
                />
              </>
            ) : null}
            <Button
              label={
                categoryPendingDeletion &&
                (itemCountsByCategory.get(categoryPendingDeletion.id) ?? 0) > 0
                  ? "Delete category and its items"
                  : "Delete category"
              }
              onPress={() => {
                if (!categoryPendingDeletion) {
                  return;
                }
                const hasItems =
                  (itemCountsByCategory.get(categoryPendingDeletion.id) ?? 0) >
                  0;
                deleteCategoryMutation.mutate({
                  categoryId: categoryPendingDeletion.id,
                  options: hasItems ? { deleteItems: true } : undefined,
                });
                closeCategoryDeletion();
              }}
              variant="danger"
            />
            <Button
              label="Cancel"
              onPress={closeCategoryDeletion}
              variant="ghost"
            />
          </Card>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setItemPendingDeletion(null)}
        transparent
        visible={Boolean(itemPendingDeletion)}
      >
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            flex: 1,
            justifyContent: "center",
            padding: theme.spacing.lg,
          }}
        >
          <Card>
            <Text variant="title">Delete item?</Text>
            <Text>{itemPendingDeletion?.sourceText} will be removed.</Text>
            <Button
              label="Delete item"
              onPress={() => {
                if (itemPendingDeletion) {
                  deleteItemMutation.mutate(itemPendingDeletion.id);
                  setItemPendingDeletion(null);
                }
              }}
              variant="danger"
            />
            <Button
              label="Cancel"
              onPress={() => setItemPendingDeletion(null)}
              variant="ghost"
            />
          </Card>
        </View>
      </Modal>
    </Page>
  );
}

function pickBrowserFile(accept: string) {
  if (typeof document === "undefined") {
    return Promise.resolve<File | null>(null);
  }

  return new Promise<File | null>((resolve) => {
    const input = document.createElement("input");
    let settled = false;
    const finish = (file: File | null) => {
      if (!settled) {
        settled = true;
        input.remove();
        resolve(file);
      }
    };

    input.accept = accept;
    input.type = "file";
    input.style.display = "none";
    input.addEventListener("change", () => finish(input.files?.[0] ?? null), {
      once: true,
    });
    input.addEventListener("cancel", () => finish(null), { once: true });
    document.body.appendChild(input);
    input.click();
  });
}

function downloadBrowserText(value: string, fileName: string) {
  if (typeof document === "undefined") {
    return;
  }

  const url = URL.createObjectURL(
    new Blob([value], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.download = fileName;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
