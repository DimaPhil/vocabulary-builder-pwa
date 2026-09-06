export type Category = {
  id: number;
  slug: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type VocabularyImageKind = "none" | "remote" | "local";

export type VocabularyItem = {
  id: number;
  categoryId: number;
  categoryName?: string;
  categorySlug?: string;
  sourceText: string;
  targetText: string;
  sourceLanguage: string;
  targetLanguage: string;
  examples: string[];
  synonyms: string[];
  imageKind: VocabularyImageKind;
  imageUri: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PracticeMode = "source_to_target" | "target_to_source";

export type PracticeFocus = "daily" | "new" | "needs_work" | "categories";

export type PracticeSessionConfig = {
  categoryIds: number[];
  focus: PracticeFocus;
  mode: PracticeMode;
  sessionSize: number;
  showImageHints: boolean;
  showExamples: boolean;
};

export type PracticeCard = VocabularyItem & {
  maskedExamples: string[];
};

export type ReviewResult = "remembered" | "missed";

export type ReviewEvent = {
  reviewedAt: string;
  result: ReviewResult;
};

export type VocabularyProgress = {
  itemId: number;
  status: "learning" | "mastered";
  dueAt: string;
  intervalStep: number;
  successfulSessions: number;
  totalAttempts: number;
  totalMisses: number;
  needsWork: boolean;
  lastReviewedAt: string;
  lastSuccessfulAt: string | null;
  reviewEvents: ReviewEvent[];
};

export type RotatingWordItem = {
  id: number;
  sourceText: string;
  targetText: string;
};

export type RotatingWordSnapshot = {
  rotationHours: number;
  seed: string;
  items: RotatingWordItem[];
};

export type AppSettings = {
  defaultSourceLanguage: string;
  defaultTargetLanguage: string;
  rotationHours: number;
  rotationSeed: string;
};

export type DashboardStats = {
  totalItems: number;
  totalCategories: number;
  withImages: number;
};

export type StoredVocabularyItem = Omit<
  VocabularyItem,
  "categoryName" | "categorySlug"
>;

export type PersistedAppState = {
  version: 1;
  nextCategoryId: number;
  nextItemId: number;
  categories: Category[];
  items: StoredVocabularyItem[];
  settings: AppSettings;
};

export type AppStateBackup = {
  format: "vocabulary-builder-backup";
  exportedAt: string;
  progress: VocabularyProgress[];
  state: PersistedAppState;
};
