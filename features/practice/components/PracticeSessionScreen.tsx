import { useAtomValue, useSetAtom } from "jotai";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, View } from "react-native";
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
import {
  buildPracticeCards,
  preparePracticeCard,
} from "@/features/practice/schemas/session";
import { useVocabularyItemsQuery } from "@/hooks/useVocabularyData";
import { useAppTheme } from "@/lib/theme";

export function PracticeSessionScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const session = useAtomValue(currentPracticeSessionAtom);
  const setSession = useSetAtom(currentPracticeSessionAtom);
  const { data: items = [] } = useVocabularyItemsQuery();
  const [revealed, setRevealed] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cards = useMemo(() => {
    if (!session) {
      return [];
    }

    const itemsById = new Map(items.map((item) => [item.id, item]));
    return session.cardIds.flatMap((id) => {
      const item = itemsById.get(id);
      return item ? [preparePracticeCard(item, session.config)] : [];
    });
  }, [items, session]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) {
        clearTimeout(advanceTimerRef.current);
      }
    };
  }, []);

  function leaveSession(destination: "/" | "/practice") {
    setSession(null);
    router.replace(destination);
  }

  if (!session || cards.length === 0) {
    return (
      <Page contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <View style={{ gap: 18 }}>
          <EmptyState
            title="No active session"
            description="Go back to Practice and start a new shuffled session."
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

  const index = Math.min(session.index, cards.length - 1);
  const currentCard = cards[index];
  const isFinished = index >= cards.length - 1;

  function advanceToNextCard() {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
    }

    setAdvancing(true);
    setRevealed(false);
    advanceTimerRef.current = setTimeout(() => {
      setSession((current) =>
        current ? { ...current, index: current.index + 1 } : current,
      );
      setAdvancing(false);
      advanceTimerRef.current = null;
    }, 240);
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
          Card {index + 1} of {cards.length}
        </Text>
        <Text variant="title">
          {session.config.mode === "source_to_target"
            ? "Source → translation"
            : "Translation → source"}
        </Text>
      </View>

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
                  style={{
                    borderRadius: 18,
                    height: 180,
                    width: "100%",
                  }}
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
        disabled={advancing}
        key={currentCard.id}
        revealed={revealed}
        onToggle={() => setRevealed((value) => !value)}
      />

      <View style={{ gap: 10 }}>
        <Button
          disabled={advancing}
          label={
            advancing
              ? "Loading next card..."
              : revealed
                ? isFinished
                  ? "Finish session"
                  : "Next card"
                : "Reveal answer"
          }
          onPress={() => {
            if (advancing) {
              return;
            }

            if (!revealed) {
              setRevealed(true);
              return;
            }

            if (isFinished) {
              leaveSession("/practice");
              return;
            }

            advanceToNextCard();
          }}
        />
        <Button
          disabled={advancing}
          label="Reshuffle"
          variant="secondary"
          onPress={() => {
            if (advanceTimerRef.current) {
              clearTimeout(advanceTimerRef.current);
              advanceTimerRef.current = null;
            }
            setSession({
              cardIds: buildPracticeCards(items, session.config).map(
                (card) => card.id,
              ),
              config: session.config,
              index: 0,
            });
            setRevealed(false);
            setAdvancing(false);
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
  disabled = false,
  frontContent,
  revealed,
  onToggle,
}: {
  backContent: React.ReactNode;
  disabled?: boolean;
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
      accessibilityState={{ disabled, expanded: revealed }}
      disabled={disabled}
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
