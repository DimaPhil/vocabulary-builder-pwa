import { useAtom } from "jotai";
import { useDeferredValue, useMemo, useState } from "react";
import { Image, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CategoryPicker } from "@/components/ui/CategoryPicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { Page } from "@/components/ui/Page";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { libraryFiltersAtom } from "@/features/library/atoms/filters";
import {
  useCategoriesQuery,
  useVocabularyItemsQuery,
} from "@/hooks/useVocabularyData";
import { useAppTheme } from "@/lib/theme";

export function LibraryScreen() {
  const theme = useAppTheme();
  const { data: categories = [] } = useCategoriesQuery();
  const { data: items = [] } = useVocabularyItemsQuery();
  const [filters, setFilters] = useAtom(libraryFiltersAtom);
  const [visibleCount, setVisibleCount] = useState(30);
  const deferredSearch = useDeferredValue(filters.search);

  const filteredItems = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return items.filter(
      (item) =>
        (filters.categoryIds.length === 0 ||
          filters.categoryIds.includes(item.categoryId)) &&
        (!query ||
          item.sourceText.toLowerCase().includes(query) ||
          item.targetText.toLowerCase().includes(query)),
    );
  }, [deferredSearch, filters.categoryIds, items]);
  const visibleItems = filteredItems.slice(0, visibleCount);

  return (
    <Page>
      <SectionHeader
        eyebrow="Library"
        title="Search the full vocabulary set"
        description="Filter by category, inspect examples, and confirm what will show up in practice and Word of the moment."
      />

      <TextField
        label="Search"
        onChangeText={(search) => {
          setFilters((current) => ({ ...current, search }));
          setVisibleCount(30);
        }}
        placeholder="Search source text or translation"
        value={filters.search}
      />

      <CategoryPicker
        categories={categories}
        label="library categories"
        onToggle={(categoryId) => {
          setFilters((current) => ({
            ...current,
            categoryIds: current.categoryIds.includes(categoryId)
              ? current.categoryIds.filter((id) => id !== categoryId)
              : [...current.categoryIds, categoryId],
          }));
          setVisibleCount(30);
        }}
        selectedIds={filters.categoryIds}
      />
      {filters.search || filters.categoryIds.length ? (
        <Button
          label="Clear filters"
          onPress={() => {
            setFilters({ search: "", categoryIds: [] });
            setVisibleCount(30);
          }}
          variant="ghost"
        />
      ) : null}

      {filteredItems.length ? (
        <View style={{ gap: 12 }}>
          <Text color={theme.colors.textMuted} variant="caption">
            Showing {visibleItems.length} of {filteredItems.length} items
          </Text>
          {visibleItems.map((item) => (
            <Card key={item.id}>
              <Text variant="heading">{item.sourceText}</Text>
              <Text>{item.targetText}</Text>
              <Text color={theme.colors.textMuted} variant="caption">
                {item.categoryName} • {item.sourceLanguage} →{" "}
                {item.targetLanguage}
              </Text>
              {item.synonyms.length ? (
                <Text color={theme.colors.textMuted}>
                  Synonyms: {item.synonyms.join(", ")}
                </Text>
              ) : null}
              {item.examples.length ? (
                <View style={{ gap: 4 }}>
                  <Text variant="label">Examples</Text>
                  {item.examples.map((example) => (
                    <Text key={example} color={theme.colors.textMuted}>
                      {example}
                    </Text>
                  ))}
                </View>
              ) : null}
              {item.imageUri ? (
                <Image
                  accessibilityLabel={`Image for ${item.sourceText}`}
                  source={{ uri: item.imageUri }}
                  style={{
                    borderRadius: 18,
                    height: 160,
                    width: "100%",
                  }}
                />
              ) : null}
            </Card>
          ))}
          {visibleItems.length < filteredItems.length ? (
            <Button
              label={`Show ${Math.min(30, filteredItems.length - visibleItems.length)} more`}
              onPress={() => setVisibleCount((count) => count + 30)}
              variant="secondary"
            />
          ) : null}
        </View>
      ) : (
        <EmptyState
          title="No matches"
          description="Try clearing filters or add more vocabulary items from the Admin screen."
        />
      )}
    </Page>
  );
}
