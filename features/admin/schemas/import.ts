import { z } from "zod";

import { importPayloadSchema } from "@/lib/db/schemas";
import { importVocabularyData } from "@/lib/db/repositories";
export { exportAppState, restoreAppState } from "@/lib/storage/indexedDb";

export type ImportPreview = {
  errors: string[];
  payload: z.infer<typeof importPayloadSchema> | null;
};

export async function previewImportPayload(rawValue: string): Promise<ImportPreview> {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(rawValue);
  } catch {
    return {
      errors: ["Import must be valid JSON."],
      payload: null,
    };
  }

  const result = importPayloadSchema.safeParse(parsedJson);

  if (!result.success) {
    return {
      errors: result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
      payload: null,
    };
  }

  const duplicateCategorySlugs = findDuplicates(
    result.data.categories.map((category) => category.slug)
  );

  const errors = [
    ...duplicateCategorySlugs.map(
      (slug) => `categories: duplicate slug "${slug}" appears more than once.`
    ),
  ] as string[];

  return {
    errors,
    payload: errors.length ? null : result.data,
  };
}

export async function commitImportPayload(
  payload: z.infer<typeof importPayloadSchema>
) {
  await importVocabularyData(payload);
}

function findDuplicates(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  values.forEach((value) => {
    if (seen.has(value)) {
      duplicates.add(value);
      return;
    }

    seen.add(value);
  });

  return [...duplicates];
}
