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

export type PracticeSessionConfig = {
  categoryIds: number[];
  mode: PracticeMode;
  showImageHints: boolean;
  showExamples: boolean;
};

export type PracticeCard = VocabularyItem & {
  maskedExamples: string[];
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
  state: PersistedAppState;
};
