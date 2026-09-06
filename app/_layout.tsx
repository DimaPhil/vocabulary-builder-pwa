import { Redirect, Stack, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Provider as JotaiProvider } from "jotai";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "@/lib/auth";
import { runMigrations } from "@/lib/db/migrations";
import { queryClient } from "@/lib/query/client";
import { ThemeProvider } from "@/lib/theme";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <JotaiProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <AuthProvider>
                <InitializedApp />
              </AuthProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </JotaiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function InitializedApp() {
  const { ready: authReady, user } = useAuth();
  const segments = useSegments();
  const [error, setError] = useState<unknown>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) {
      setReady(false);
      return;
    }

    void runMigrations().then(
      () => setReady(true),
      (reason) => setError(reason),
    );
  }, [user]);

  if (error) {
    throw error;
  }
  if (!authReady) {
    return null;
  }
  if (!user && segments[0] !== "login") return <Redirect href="/login" />;
  if (user && !ready) return null;
  if (user && segments[0] === "login") return <Redirect href="/" />;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen
          name="practice/session"
          options={{
            presentation: "card",
          }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}
