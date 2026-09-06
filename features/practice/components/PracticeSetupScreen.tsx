import { useAtom } from "jotai";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CategoryPicker } from "@/components/ui/CategoryPicker";
import { Checkbox } from "@/components/ui/Checkbox";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Page } from "@/components/ui/Page";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Text } from "@/components/ui/Text";
import {
  currentPracticeSessionAtom,
  practiceDraftAtom,
} from "@/features/practice/atoms/session";
import {
  buildPracticeQueue,
  summarizeLearning,
} from "@/features/practice/services/learning";
import {
  useCategoriesQuery,
  useClearNeedsWorkMutation,
  useLearningProgressQuery,
  useRelearnVocabularyItemsMutation,
  useResetVocabularyProgressMutation,
  useVocabularyItemsQuery,
} from "@/hooks/useVocabularyData";
import type { PracticeFocus } from "@/lib/types";

const FOCUS_OPTIONS: {
  description: string;
  label: string;
  value: PracticeFocus;
}[] = [
  {
    value: "daily",
    label: "Daily review",
    description: "Due words first, then new words.",
  },
  {
    value: "needs_work",
    label: "Needs work",
    description: "Only words you marked as missed.",
  },
  {
    value: "new",
    label: "New words",
    description: "Only words you have not practiced.",
  },
  {
    value: "categories",
    label: "Selected categories",
    description: "Practice the levels or topics you choose below.",
  },
];

export function PracticeSetupScreen() {
  const router = useRouter();
  const { data: categories = [] } = useCategoriesQuery();
  const { data: items = [] } = useVocabularyItemsQuery();
  const { data: progress = [] } = useLearningProgressQuery();
  const [draft, setDraft] = useAtom(practiceDraftAtom);
  const [, setCurrentSession] = useAtom(currentPracticeSessionAtom);
  const [confirmReset, setConfirmReset] = useState(false);
  const relearn = useRelearnVocabularyItemsMutation();
  const clearNeedsWork = useClearNeedsWorkMutation();
  const resetProgress = useResetVocabularyProgressMutation();

  const scopedItems = useMemo(
    () =>
      draft.categoryIds.length
        ? items.filter((item) => draft.categoryIds.includes(item.categoryId))
        : items,
    [draft.categoryIds, items],
  );
  const summary = useMemo(
    () => summarizeLearning(scopedItems, progress),
    [progress, scopedItems],
  );
  const queue = useMemo(
    () => buildPracticeQueue(items, progress, draft),
    [draft, items, progress],
  );
  const scopedIds = scopedItems.map((item) => item.id);
  const scopedNeedsWorkIds = progress
    .filter((entry) => entry.needsWork && scopedIds.includes(entry.itemId))
    .map((entry) => entry.itemId);
  const categoriesRequired =
    draft.focus === "categories" && draft.categoryIds.length === 0;

  return (
    <Page>
      <SectionHeader
        eyebrow="Practice"
        title="Review what matters now"
        description="Choose a ready-made session or narrow it by level and topic. Rate every answer yourself; missed words return later in the session and stay in Needs work."
      />

      {items.length === 0 ? (
        <EmptyState
          title="No vocabulary yet"
          description="Add categories and words in Admin before starting your first session."
        />
      ) : (
        <>
          <Card>
            <Text variant="heading">Your progress</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              <ProgressStat label="Due" value={summary.due} />
              <ProgressStat label="Needs work" value={summary.needsWork} />
              <ProgressStat label="Mastered" value={summary.mastered} />
              <ProgressStat label="Started" value={summary.started} />
            </View>
            <Text variant="caption">
              7-day recall:{" "}
              {summary.recall7 === null ? "No data" : `${summary.recall7}%`}
            </Text>
          </Card>

          <Card>
            <Text variant="heading">What do you want to practice?</Text>
            <View style={{ gap: 10 }}>
              {FOCUS_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  label={`${option.label} · ${option.description}`}
                  onPress={() =>
                    setDraft((current) => ({
                      ...current,
                      focus: option.value,
                    }))
                  }
                  variant={
                    draft.focus === option.value ? "primary" : "secondary"
                  }
                />
              ))}
            </View>
          </Card>

          <Card>
            <Text variant="heading">Levels and categories</Text>
            <Text>
              Tap a level to select it. Search only when you need several
              specific topics.
            </Text>
            <CategoryPicker
              categories={categories}
              label="practice categories"
              onChange={(categoryIds) =>
                setDraft((current) => ({ ...current, categoryIds }))
              }
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
              {draft.categoryIds.length
                ? `${summary.total} words in selected categories.`
                : "No category filter. Daily, New, and Needs work use all levels."}
            </Text>
          </Card>

          <Card>
            <Text variant="heading">Session size</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {[10, 20, 30].map((size) => (
                <Chip
                  key={size}
                  active={draft.sessionSize === size}
                  label={`${size} words`}
                  onPress={() =>
                    setDraft((current) => ({ ...current, sessionSize: size }))
                  }
                />
              ))}
            </View>
            <Text variant="caption">
              Ready now: {queue.length} · Due: {summary.due} · New:{" "}
              {summary.newItems} · Needs work: {summary.needsWork}
            </Text>
          </Card>

          <Card>
            <Text variant="heading">Direction</Text>
            <View style={{ gap: 10 }}>
              <Button
                label="English → translation"
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
                label="Translation → English"
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

          {draft.mode === "target_to_source" ? (
            <Card>
              <Text variant="heading">Front-side hints</Text>
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
            disabled={!queue.length || categoriesRequired}
            label={
              categoriesRequired
                ? "Select a level or category"
                : queue.length
                  ? `Start ${queue.length}-word session`
                  : "Nothing is ready in this view"
            }
            onPress={() => {
              setCurrentSession({ cardIds: queue, config: draft, index: 0 });
              router.push("/practice/session");
            }}
          />

          <Card>
            <Text variant="heading">Relearn or reset</Text>
            <Text>
              {draft.categoryIds.length
                ? "These actions apply to the selected categories."
                : "Select categories above to unlock scoped progress controls."}
            </Text>
            <View style={{ gap: 10 }}>
              <Button
                disabled={!draft.categoryIds.length || !scopedIds.length}
                label="Relearn now (keep history)"
                onPress={() => relearn.mutate(scopedIds)}
                variant="secondary"
              />
              <Button
                disabled={
                  !draft.categoryIds.length || !scopedNeedsWorkIds.length
                }
                label="Clear Needs work marks"
                onPress={() => clearNeedsWork.mutate(scopedNeedsWorkIds)}
                variant="secondary"
              />
              {confirmReset ? (
                <Button
                  disabled={!draft.categoryIds.length || !scopedIds.length}
                  label="Confirm: erase selected progress"
                  onPress={() => {
                    resetProgress.mutate(scopedIds);
                    setConfirmReset(false);
                  }}
                  variant="danger"
                />
              ) : (
                <Button
                  disabled={!draft.categoryIds.length || !scopedIds.length}
                  label="Reset selected progress"
                  onPress={() => setConfirmReset(true)}
                  variant="ghost"
                />
              )}
            </View>
          </Card>

          <Text variant="caption">
            Progress and review history stay on this device and are included in
            backups.
          </Text>
        </>
      )}
    </Page>
  );
}

function ProgressStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ minWidth: 64 }}>
      <Text variant="display">{value}</Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
}
