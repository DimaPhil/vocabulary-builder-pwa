import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Alert, Pressable, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Page } from "@/components/ui/Page";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Text } from "@/components/ui/Text";
import {
  useLearningProgressQuery,
  useSettingsQuery,
  useStatsQuery,
  useVocabularyItemsQuery,
} from "@/hooks/useVocabularyData";
import { summarizeLearning } from "@/features/practice/services/learning";
import { useAuth } from "@/lib/auth";
import { selectRotatingWord } from "@/lib/rotation/selection";
import { useAppTheme } from "@/lib/theme";

export function HomeScreen() {
  const { user, logout } = useAuth();
  const theme = useAppTheme();
  const statsQuery = useStatsQuery();
  const itemsQuery = useVocabularyItemsQuery();
  const progressQuery = useLearningProgressQuery();
  const settingsQuery = useSettingsQuery();
  const learning = summarizeLearning(
    itemsQuery.data ?? [],
    progressQuery.data ?? [],
  );

  const wordOfTheMoment =
    itemsQuery.data && settingsQuery.data
      ? selectRotatingWord(
          {
            rotationHours: settingsQuery.data.rotationHours,
            seed: settingsQuery.data.rotationSeed,
            items: itemsQuery.data.map((item) => ({
              id: item.id,
              sourceText: item.sourceText,
              targetText: item.targetText,
            })),
          },
          new Date(),
        )
      : null;

  return (
    <Page>
      <SectionHeader
        eyebrow="Vocabulary Builder"
        title="Train your own words, without the overhead."
        description="Everything stays on-device, Word of the moment rotates automatically, and practice stays fast even with a large vocabulary set."
      />

      {user ? (
        <Card>
          <View style={{ alignItems: "center", flexDirection: "row", gap: 12 }}>
            <View
              style={{
                alignItems: "center",
                backgroundColor: theme.colors.primarySoft,
                borderRadius: 18,
                height: 44,
                justifyContent: "center",
                width: 44,
              }}
            >
              <Text color={theme.colors.primary} variant="heading">
                {user.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{user.displayName}</Text>
              <Text color={theme.colors.textMuted} variant="caption">
                @{user.username} · Your learning space
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Log out"
              accessibilityRole="button"
              onPress={() =>
                void logout().catch(() =>
                  Alert.alert(
                    "Could not log out",
                    "Check your connection and try again.",
                  ),
                )
              }
              style={{
                alignItems: "center",
                flexDirection: "row",
                gap: 5,
                padding: 8,
              }}
            >
              <Ionicons
                color={theme.colors.primary}
                name="log-out-outline"
                size={20}
              />
              <Text color={theme.colors.primary} variant="label">
                Log out
              </Text>
            </Pressable>
          </View>
        </Card>
      ) : null}

      <View style={{ flexDirection: "row", gap: 12 }}>
        <StatCard label="Words" value={statsQuery.data?.totalItems ?? 0} />
        <StatCard
          label="Categories"
          value={statsQuery.data?.totalCategories ?? 0}
        />
        <StatCard
          label="With images"
          value={statsQuery.data?.withImages ?? 0}
        />
      </View>

      <Card>
        <Text variant="heading">Quick actions</Text>
        <View style={{ gap: 10 }}>
          <Link href="/(tabs)/practice" asChild>
            <Button label="Start practice" />
          </Link>
          <Link href="/(tabs)/admin" asChild>
            <Button label="Manage vocabulary" variant="secondary" />
          </Link>
          <Link href="/(tabs)/library" asChild>
            <Button label="Browse library" variant="ghost" />
          </Link>
        </View>
      </Card>

      {wordOfTheMoment ? (
        <Card>
          <Text variant="heading">Word of the moment</Text>
          <Text variant="label">Current rotation</Text>
          <Text variant="display">{wordOfTheMoment.sourceText}</Text>
          <Text>{wordOfTheMoment.targetText}</Text>
          <Text variant="caption">
            Rotates every {settingsQuery.data?.rotationHours ?? 1} hour(s).
          </Text>
        </Card>
      ) : (
        <EmptyState
          title="Word of the moment is empty"
          description="Add at least one vocabulary item from Admin to start the rotation."
        />
      )}

      <Card>
        <Text variant="heading">Learning progress</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
          <ProgressStat label="Due" value={learning.due} />
          <ProgressStat label="Needs work" value={learning.needsWork} />
          <ProgressStat label="Mastered" value={learning.mastered} />
          <ProgressStat label="Started" value={learning.started} />
        </View>
        <Text>
          Coverage: {learning.started} of {learning.total} words
        </Text>
        <Text variant="caption">
          Self-rated recall · 7 days: {formatRecall(learning.recall7)} · 30
          days: {formatRecall(learning.recall30)}
        </Text>
      </Card>

      {learning.areasToImprove.length ? (
        <Card>
          <Text variant="heading">Areas to improve</Text>
          <View style={{ gap: 10 }}>
            {learning.areasToImprove.map((area) => (
              <View key={area.categoryId} style={{ gap: 2 }}>
                <Text variant="bodyStrong">{area.categoryName}</Text>
                <Text variant="caption">
                  {area.needsWork} needs work · {area.due} due · 30-day recall{" "}
                  {formatRecall(area.recall30)}
                </Text>
              </View>
            ))}
          </View>
          <Link href="/(tabs)/practice" asChild>
            <Button label="Practice weak areas" variant="secondary" />
          </Link>
        </Card>
      ) : null}
    </Page>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card style={{ flex: 1 }}>
      <Text variant="label">{label}</Text>
      <Text variant="display">{value}</Text>
    </Card>
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

function formatRecall(value: number | null) {
  return value === null ? "No data" : `${value}%`;
}
