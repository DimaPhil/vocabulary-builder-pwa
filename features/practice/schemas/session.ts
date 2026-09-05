import type {
  PracticeCard,
  PracticeSessionConfig,
  VocabularyItem,
} from "@/lib/types";
import { maskExampleAnswer } from "@/features/practice/services/exampleMasking";
import { shuffleArray } from "@/lib/utils/random";

export function buildPracticeCards(
  items: VocabularyItem[],
  config: PracticeSessionConfig,
): PracticeCard[] {
  const filteredItems =
    config.categoryIds.length === 0
      ? items
      : items.filter((item) => config.categoryIds.includes(item.categoryId));

  const preparedItems = filteredItems.map((item) =>
    preparePracticeCard(item, config),
  );

  return shuffleArray(preparedItems);
}

export function preparePracticeCard(
  item: VocabularyItem,
  config: PracticeSessionConfig,
): PracticeCard {
  return {
    ...item,
    maskedExamples: item.examples.map((example) =>
      maskExampleAnswer(
        example,
        config.mode === "target_to_source" ? item.sourceText : item.targetText,
      ),
    ),
  };
}
