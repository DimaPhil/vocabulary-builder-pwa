import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Provider as JotaiProvider } from "jotai";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { runMigrations } from "@/lib/db/migrations";
import { queryClient } from "@/lib/query/client";
import { ThemeProvider } from "@/lib/theme";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <JotaiProvider>
          <QueryClientProvider client={queryClient}>
            <InitializedApp />
          </QueryClientProvider>
        </JotaiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function InitializedApp() {
  const [error, setError] = useState<unknown>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void runMigrations().then(
      () => setReady(true),
      (reason) => setError(reason)
    );
  }, []);

  if (error) {
    throw error;
  }
  if (!ready) {
    return null;
  }

  return (
    <ThemeProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="practice/session"
          options={{
            presentation: "card",
          }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ThemeProvider>
  );
}
