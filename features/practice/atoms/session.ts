import { atomWithStorage } from "jotai/utils";

import type { PracticeSessionConfig } from "@/lib/types";
import { createMmkvStorage } from "@/lib/storage/jotai";

export const DEFAULT_PRACTICE_CONFIG: PracticeSessionConfig = {
  categoryIds: [],
  focus: "daily",
  mode: "source_to_target",
  sessionSize: 20,
  showExamples: false,
  showImageHints: false,
};

const draftStorage = createMmkvStorage<PracticeSessionConfig>();

export const practiceDraftAtom = atomWithStorage<PracticeSessionConfig>(
  "practice-draft",
  DEFAULT_PRACTICE_CONFIG,
  {
    ...draftStorage,
    getItem: (key, initialValue) => ({
      ...initialValue,
      ...draftStorage.getItem(key, initialValue),
    }),
  },
);

export const currentPracticeSessionAtom = atomWithStorage<{
  cardIds: number[];
  config: PracticeSessionConfig;
  index: number;
} | null>("practice-session", null, createMmkvStorage());
