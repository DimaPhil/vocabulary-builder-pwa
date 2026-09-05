import { useMemo, useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import type { Category } from "@/lib/types";

const CEFR_LEVELS = ["B1", "B2", "C1", "C2", "Other"] as const;

function getLevel(category: Category): (typeof CEFR_LEVELS)[number] {
  const level = category.slug
    .match(/^(b1|b2|c1|c2)(?:-|$)/i)?.[1]
    ?.toUpperCase();
  return level === "B1" || level === "B2" || level === "C1" || level === "C2"
    ? level
    : "Other";
}

export function CategoryPicker({
  allowEmpty = true,
  categories,
  label = "Categories",
  onToggle,
  selectedIds,
}: {
  allowEmpty?: boolean;
  categories: Category[];
  label?: string;
  onToggle: (categoryId: number) => void;
  selectedIds: number[];
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);
  const normalizedQuery = query.trim().toLowerCase();
  const groups = useMemo(
    () =>
      CEFR_LEVELS.map((level) => ({
        level,
        categories: categories.filter(
          (category) =>
            getLevel(category) === level &&
            (!normalizedQuery ||
              category.name.toLowerCase().includes(normalizedQuery) ||
              category.slug.toLowerCase().includes(normalizedQuery)),
        ),
      })).filter((group) => group.categories.length),
    [categories, normalizedQuery],
  );

  return (
    <View style={{ gap: 10 }}>
      <TextField
        label={`Search ${label.toLowerCase()}`}
        onChangeText={setQuery}
        placeholder="Level or topic"
        value={query}
      />
      {selectedIds.length ? (
        <Text variant="caption">{selectedIds.length} selected</Text>
      ) : allowEmpty ? (
        <Text variant="caption">None selected</Text>
      ) : null}
      {groups.map((group) => {
        const isExpanded =
          Boolean(normalizedQuery) || expanded.includes(group.level);
        const selectedCount = group.categories.filter((category) =>
          selectedIds.includes(category.id),
        ).length;

        return (
          <View key={group.level} style={{ gap: 8 }}>
            {normalizedQuery ? (
              <Text variant="heading">
                {group.level} ({selectedCount}/{group.categories.length})
              </Text>
            ) : (
              <Button
                label={`${isExpanded ? "Hide" : "Show"} ${group.level} (${selectedCount}/${group.categories.length})`}
                onPress={() =>
                  setExpanded((current) =>
                    current.includes(group.level)
                      ? current.filter((level) => level !== group.level)
                      : [...current, group.level],
                  )
                }
                variant="secondary"
              />
            )}
            {isExpanded ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {group.categories.map((category) => {
                  const active = selectedIds.includes(category.id);

                  return (
                    <Chip
                      key={category.id}
                      active={active}
                      label={category.name.replace(/^(B1|B2|C1|C2) · /, "")}
                      onPress={() => {
                        if (allowEmpty || !active) {
                          onToggle(category.id);
                        }
                      }}
                    />
                  );
                })}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
