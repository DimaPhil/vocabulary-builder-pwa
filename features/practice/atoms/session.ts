import { atomWithStorage } from "jotai/utils";

import type { PracticeSessionConfig } from "@/lib/types";
import { createMmkvStorage } from "@/lib/storage/jotai";

export const practiceDraftAtom = atomWithStorage<PracticeSessionConfig>(
  "practice-draft",
  {
    categoryIds: [],
    mode: "source_to_target",
    showExamples: false,
    showImageHints: false,
  },
  createMmkvStorage<PracticeSessionConfig>(),
);

export const currentPracticeSessionAtom = atomWithStorage<{
  cardIds: number[];
  config: PracticeSessionConfig;
  index: number;
} | null>("practice-session", null, createMmkvStorage());
