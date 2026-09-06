import { useAtomValue, useSetAtom } from "jotai";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Page } from "@/components/ui/Page";
import { Text } from "@/components/ui/Text";
import { currentPracticeSessionAtom } from "@/features/practice/atoms/session";
import { preparePracticeCard } from "@/features/practice/schemas/session";
import { requeueMissedCard } from "@/features/practice/services/learning";
import {
  useRecordVocabularyReviewMutation,
  useVocabularyItemsQuery,
} from "@/hooks/useVocabularyData";
import { useAppTheme } from "@/lib/theme";
import type { ReviewResult } from "@/lib/types";
import { shuffleArray } from "@/lib/utils/random";

export function PracticeSessionScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const session = useAtomValue(currentPracticeSessionAtom);
  const setSession = useSetAtom(currentPracticeSessionAtom);
  const { data: items = [] } = useVocabularyItemsQuery();
  const recordReview = useRecordVocabularyReviewMutation();
  const [revealed, setRevealed] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const itemsById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );
  const index = session
    ? Math.min(session.index, Math.max(session.cardIds.length - 1, 0))
    : 0;
  const currentItem = session
    ? itemsById.get(session.cardIds[index])
    : undefined;
  const config = session?.config;
  const currentCard = useMemo(
    () =>
      currentItem && config ? preparePracticeCard(currentItem, config) : null,
    [config, currentItem],
  );

  function leaveSession(destination: "/" | "/practice") {
    setSession(null);
    router.replace(destination);
  }

  async function rateAnswer(result: ReviewResult) {
    if (!session || !currentCard || advancing) return;

    setAdvancing(true);
    setRevealed(false);
    setError(null);

    try {
      await recordReview.mutateAsync({ itemId: currentCard.id, result });
      const cardIds =
        result === "missed"
          ? requeueMissedCard(session.cardIds, index, currentCard.id)
          : session.cardIds;

      if (index >= cardIds.length - 1) {
        leaveSession("/practice");
      } else {
        setSession({ ...session, cardIds, index: index + 1 });
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save your answer.",
      );
      setRevealed(true);
    } finally {
      setAdvancing(false);
    }
  }

  if (!session || !currentCard) {
    return (
      <Page contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <View style={{ gap: 18 }}>
          <EmptyState
            title="No active session"
            description="Go back to Practice and start a new session."
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button
                label="Practice"
                variant="secondary"
                onPress={() => leaveSession("/practice")}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Home" onPress={() => leaveSession("/")} />
            </View>
          </View>
        </View>
      </Page>
    );
  }

  return (
    <Page>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button
            label="Back to practice"
            variant="secondary"
            onPress={() => leaveSession("/practice")}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Home"
            variant="ghost"
            onPress={() => leaveSession("/")}
          />
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <Text variant="label">
          Card {index + 1} of {session.cardIds.length}
        </Text>
        <Text variant="title">
          {session.config.mode === "source_to_target"
            ? "English → translation"
            : "Translation → English"}
        </Text>
      </View>

      {advancing ? (
        <Card
          accessibilityLabel="Loading next word"
          style={{
            alignItems: "center",
            justifyContent: "center",
            minHeight: 320,
          }}
        >
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text variant="heading">Loading next word…</Text>
        </Card>
      ) : (
        <FlipCard
          backContent={
            <View style={{ gap: 12 }}>
              <Text variant="caption">Answer</Text>
              <Text variant="display">
                {session.config.mode === "source_to_target"
                  ? currentCard.targetText
                  : currentCard.sourceText}
              </Text>
              {session.config.mode === "target_to_source" &&
              currentCard.synonyms.length ? (
                <Text color={theme.colors.textMuted}>
                  Synonyms: {currentCard.synonyms.join(", ")}
                </Text>
              ) : null}
            </View>
          }
          frontContent={
            session.config.mode === "source_to_target" ? (
              <View style={{ gap: 12 }}>
                <Text variant="caption">Prompt</Text>
                <Text variant="display">{currentCard.sourceText}</Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <Text variant="caption">Prompt</Text>
                <Text variant="display">{currentCard.targetText}</Text>
                {session.config.showImageHints && currentCard.imageUri ? (
                  <Image
                    accessibilityLabel={`Hint for ${currentCard.targetText}`}
                    source={{ uri: currentCard.imageUri }}
                    style={{ borderRadius: 18, height: 180, width: "100%" }}
                  />
                ) : null}
                {session.config.showExamples &&
                currentCard.maskedExamples.length ? (
                  <View style={{ gap: 6 }}>
                    {currentCard.maskedExamples.map((example) => (
                      <Text key={example} color={theme.colors.textMuted}>
                        {example}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            )
          }
          key={currentCard.id}
          revealed={revealed}
          onToggle={() => setRevealed((value) => !value)}
        />
      )}

      {error ? <Text color={theme.colors.danger}>{error}</Text> : null}

      <View style={{ gap: 10 }}>
        {!revealed ? (
          <Button
            disabled={advancing}
            label={advancing ? "Loading next word…" : "Reveal answer"}
            onPress={() => setRevealed(true)}
          />
        ) : (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button
                disabled={advancing}
                label="Missed it"
                onPress={() => rateAnswer("missed")}
                variant="secondary"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                disabled={advancing}
                label="Remembered"
                onPress={() => rateAnswer("remembered")}
              />
            </View>
          </View>
        )}
        <Button
          disabled={advancing}
          label="Reshuffle remaining"
          variant="secondary"
          onPress={() => {
            setSession({
              ...session,
              cardIds: [
                ...session.cardIds.slice(0, index),
                ...shuffleArray(session.cardIds.slice(index)),
              ],
            });
            setRevealed(false);
          }}
        />
        <Button
          disabled={advancing}
          label="End session"
          variant="ghost"
          onPress={() => leaveSession("/practice")}
        />
      </View>
    </Page>
  );
}

function FlipCard({
  backContent,
  frontContent,
  revealed,
  onToggle,
}: {
  backContent: React.ReactNode;
  frontContent: React.ReactNode;
  revealed: boolean;
  onToggle: () => void;
}) {
  const rotation = useSharedValue(revealed ? 180 : 0);

  rotation.value = withTiming(revealed ? 180 : 0, { duration: 260 });

  const frontStyle = useAnimatedStyle(() => ({
    backfaceVisibility: "hidden",
    transform: [{ rotateY: `${rotation.value}deg` }],
  }));

  const backStyle = useAnimatedStyle(() => ({
    backfaceVisibility: "hidden",
    position: "absolute",
    transform: [{ rotateY: `${rotation.value + 180}deg` }],
    width: "100%",
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1_000 }],
    opacity: interpolate(rotation.value, [0, 180], [1, 1]),
  }));

  return (
    <Pressable
      accessibilityHint="Shows or hides the answer"
      accessibilityLabel={revealed ? "Hide answer" : "Reveal answer"}
      accessibilityRole="button"
      accessibilityState={{ expanded: revealed }}
      onPress={onToggle}
    >
      <Animated.View style={containerStyle}>
        <Card style={{ minHeight: 320 }}>
          <Animated.View
            accessibilityElementsHidden={revealed}
            importantForAccessibility={
              revealed ? "no-hide-descendants" : "auto"
            }
            style={frontStyle}
          >
            {frontContent}
          </Animated.View>
          <Animated.View
            accessibilityElementsHidden={!revealed}
            importantForAccessibility={
              revealed ? "auto" : "no-hide-descendants"
            }
            style={backStyle}
          >
            {backContent}
          </Animated.View>
        </Card>
      </Animated.View>
    </Pressable>
  );
}
