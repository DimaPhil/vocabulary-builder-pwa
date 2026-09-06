import type {
  PracticeSessionConfig,
  ReviewResult,
  VocabularyItem,
  VocabularyProgress,
} from "@/lib/types";
import { shuffleArray } from "@/lib/utils/random";

export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30, 60, 120] as const;
const MAX_REVIEW_EVENTS = 100;

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString();
}

function isSameUtcDay(left: string | null | undefined, right: Date) {
  return left?.slice(0, 10) === right.toISOString().slice(0, 10);
}

export function applyReviewResult(
  current: VocabularyProgress | undefined,
  itemId: number,
  result: ReviewResult,
  now = new Date(),
): VocabularyProgress {
  const reviewedAt = now.toISOString();
  const reviewEvents = [
    ...(current?.reviewEvents ?? []),
    { reviewedAt, result },
  ].slice(-MAX_REVIEW_EVENTS);

  if (result === "missed") {
    return {
      itemId,
      status: "learning",
      dueAt: addDays(now, 1),
      intervalStep: -1,
      successfulSessions: 0,
      totalAttempts: (current?.totalAttempts ?? 0) + 1,
      totalMisses: (current?.totalMisses ?? 0) + 1,
      needsWork: true,
      lastReviewedAt: reviewedAt,
      lastSuccessfulAt: current?.lastSuccessfulAt ?? null,
      reviewEvents,
    };
  }

  const countsAsSession =
    !isSameUtcDay(current?.lastSuccessfulAt, now) &&
    (!current || current.dueAt <= reviewedAt);
  const successfulSessions =
    (current?.successfulSessions ?? 0) + (countsAsSession ? 1 : 0);
  const intervalStep = countsAsSession
    ? Math.min(
        (current?.intervalStep ?? -1) + 1,
        REVIEW_INTERVAL_DAYS.length - 1,
      )
    : Math.max(current?.intervalStep ?? 0, 0);

  return {
    itemId,
    status: successfulSessions >= 4 ? "mastered" : "learning",
    dueAt: addDays(now, REVIEW_INTERVAL_DAYS[intervalStep]),
    intervalStep,
    successfulSessions,
    totalAttempts: (current?.totalAttempts ?? 0) + 1,
    totalMisses: current?.totalMisses ?? 0,
    needsWork: current?.needsWork ?? false,
    lastReviewedAt: reviewedAt,
    lastSuccessfulAt: countsAsSession
      ? reviewedAt
      : (current?.lastSuccessfulAt ?? reviewedAt),
    reviewEvents,
  };
}

function isDue(progress: VocabularyProgress | undefined, now: Date) {
  return Boolean(progress && progress.dueAt <= now.toISOString());
}

function queueRank(progress: VocabularyProgress | undefined, now: Date) {
  if (progress?.needsWork && isDue(progress, now)) return 0;
  if (isDue(progress, now)) return 1;
  if (!progress) return 2;
  if (progress.needsWork) return 3;
  return 4;
}

export function buildPracticeQueue(
  items: VocabularyItem[],
  progress: VocabularyProgress[],
  config: PracticeSessionConfig,
  now = new Date(),
  random = Math.random,
) {
  const progressByItemId = new Map(
    progress.map((entry) => [entry.itemId, entry]),
  );
  if (config.focus === "categories" && config.categoryIds.length === 0) {
    return [];
  }
  const scopedItems = config.categoryIds.length
    ? items.filter((item) => config.categoryIds.includes(item.categoryId))
    : items;
  const focus = config.focus ?? "daily";
  const eligible = scopedItems.filter((item) => {
    const entry = progressByItemId.get(item.id);

    if (focus === "new") return !entry;
    if (focus === "needs_work") return entry?.needsWork;
    if (focus === "daily") return !entry || isDue(entry, now);
    return true;
  });

  return shuffleArray(eligible, random)
    .sort(
      (left, right) =>
        queueRank(progressByItemId.get(left.id), now) -
        queueRank(progressByItemId.get(right.id), now),
    )
    .slice(0, config.sessionSize ?? 20)
    .map((item) => item.id);
}

export function requeueMissedCard(
  cardIds: number[],
  index: number,
  itemId: number,
) {
  const next = [...cardIds];
  next.splice(Math.min(index + 4, next.length), 0, itemId);
  return next;
}

function recallRate(events: VocabularyProgress["reviewEvents"], since: number) {
  const recent = events.filter(
    (event) => new Date(event.reviewedAt).getTime() >= since,
  );
  if (!recent.length) return null;
  return Math.round(
    (recent.filter((event) => event.result === "remembered").length /
      recent.length) *
      100,
  );
}

export function summarizeLearning(
  items: VocabularyItem[],
  progress: VocabularyProgress[],
  now = new Date(),
) {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const validProgress = progress.filter((entry) => itemById.has(entry.itemId));
  const events = validProgress.flatMap((entry) => entry.reviewEvents);
  const day = 24 * 60 * 60 * 1000;
  const categoryMap = new Map<
    number,
    {
      categoryId: number;
      categoryName: string;
      due: number;
      mastered: number;
      needsWork: number;
      events: VocabularyProgress["reviewEvents"];
    }
  >();

  validProgress.forEach((entry) => {
    const item = itemById.get(entry.itemId)!;
    const category = categoryMap.get(item.categoryId) ?? {
      categoryId: item.categoryId,
      categoryName: item.categoryName ?? item.categorySlug ?? "Uncategorized",
      due: 0,
      mastered: 0,
      needsWork: 0,
      events: [],
    };
    if (isDue(entry, now)) category.due += 1;
    if (entry.status === "mastered") category.mastered += 1;
    if (entry.needsWork) category.needsWork += 1;
    category.events.push(...entry.reviewEvents);
    categoryMap.set(item.categoryId, category);
  });

  const areasToImprove = [...categoryMap.values()]
    .map((category) => ({
      ...category,
      recall30: recallRate(category.events, now.getTime() - 30 * day),
      score:
        category.needsWork * 4 +
        category.due * 2 +
        category.events.filter((event) => event.result === "missed").length,
    }))
    .filter((category) => category.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);

  return {
    total: items.length,
    started: validProgress.length,
    newItems: Math.max(items.length - validProgress.length, 0),
    due: validProgress.filter((entry) => isDue(entry, now)).length,
    mastered: validProgress.filter((entry) => entry.status === "mastered")
      .length,
    needsWork: validProgress.filter((entry) => entry.needsWork).length,
    recall7: recallRate(events, now.getTime() - 7 * day),
    recall30: recallRate(events, now.getTime() - 30 * day),
    areasToImprove,
  };
}
