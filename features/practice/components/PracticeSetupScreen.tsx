import { useAtom } from "jotai";
import { useRouter } from "expo-router";
import { View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CategoryPicker } from "@/components/ui/CategoryPicker";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { Page } from "@/components/ui/Page";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Text } from "@/components/ui/Text";
import {
  currentPracticeSessionAtom,
  practiceDraftAtom,
} from "@/features/practice/atoms/session";
import { buildPracticeCards } from "@/features/practice/schemas/session";
import {
  useCategoriesQuery,
  useVocabularyItemsQuery,
} from "@/hooks/useVocabularyData";

export function PracticeSetupScreen() {
  const router = useRouter();
  const { data: categories = [] } = useCategoriesQuery();
  const { data: items = [] } = useVocabularyItemsQuery();
  const [draft, setDraft] = useAtom(practiceDraftAtom);
  const [, setCurrentSession] = useAtom(currentPracticeSessionAtom);

  const selectedItemsCount =
    draft.categoryIds.length === 0
      ? items.length
      : items.filter((item) => draft.categoryIds.includes(item.categoryId))
          .length;

  const canStart = selectedItemsCount > 0;

  return (
    <Page>
      <SectionHeader
        eyebrow="Practice"
        title="Assemble a focused session"
        description="Select the mode, narrow the category scope if needed, and decide whether translation-first practice should reveal examples or images."
      />

      {items.length === 0 ? (
        <EmptyState
          title="No vocabulary yet"
          description="Add categories and words in Admin before starting your first session."
        />
      ) : (
        <>
          <Card>
            <Text variant="heading">Mode</Text>
            <View style={{ gap: 10 }}>
              <Button
                label="Source → translation"
                onPress={() =>
                  setDraft((current) => ({
                    ...current,
                    mode: "source_to_target",
                  }))
                }
                variant={
                  draft.mode === "source_to_target" ? "primary" : "secondary"
                }
              />
              <Button
                label="Translation → source"
                onPress={() =>
                  setDraft((current) => ({
                    ...current,
                    mode: "target_to_source",
                  }))
                }
                variant={
                  draft.mode === "target_to_source" ? "primary" : "secondary"
                }
              />
            </View>
          </Card>

          <Card>
            <Text variant="heading">Scope</Text>
            <Text>
              Leave all categories unselected to practice the entire vocabulary
              set.
            </Text>
            <CategoryPicker
              categories={categories}
              label="practice categories"
              onToggle={(categoryId) =>
                setDraft((current) => ({
                  ...current,
                  categoryIds: current.categoryIds.includes(categoryId)
                    ? current.categoryIds.filter((id) => id !== categoryId)
                    : [...current.categoryIds, categoryId],
                }))
              }
              selectedIds={draft.categoryIds}
            />
            <Text variant="caption">
              {selectedItemsCount} item(s) will be included.
            </Text>
          </Card>

          {draft.mode === "target_to_source" ? (
            <Card>
              <Text variant="heading">Hints on the front side</Text>
              <View style={{ gap: 12 }}>
                <Checkbox
                  checked={draft.showImageHints}
                  label="Show image hints"
                  onPress={() =>
                    setDraft((current) => ({
                      ...current,
                      showImageHints: !current.showImageHints,
                    }))
                  }
                />
                <Checkbox
                  checked={draft.showExamples}
                  label="Show masked examples"
                  onPress={() =>
                    setDraft((current) => ({
                      ...current,
                      showExamples: !current.showExamples,
                    }))
                  }
                />
              </View>
            </Card>
          ) : null}

          <Button
            disabled={!canStart}
            label={canStart ? "Start session" : "Add words to practice"}
            onPress={() => {
              const cards = buildPracticeCards(items, draft);

              setCurrentSession({
                cardIds: cards.map((card) => card.id),
                config: draft,
                index: 0,
              });
              router.push("/practice/session");
            }}
          />
        </>
      )}
    </Page>
  );
}
