import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Page } from "@/components/ui/Page";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/lib/auth";
import { useAppTheme } from "@/lib/theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const theme = useAppTheme();
  const [username, setUsername] = useState("dima");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!username.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await login(username, password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
      <View
        style={{ alignSelf: "center", gap: 18, maxWidth: 440, width: "100%" }}
      >
        <View
          style={{
            alignItems: "center",
            alignSelf: "center",
            backgroundColor: theme.colors.primary,
            borderRadius: 24,
            height: 72,
            justifyContent: "center",
            width: 72,
          }}
        >
          <Ionicons color={theme.colors.white} name="book-outline" size={34} />
        </View>
        <View style={{ alignItems: "center", gap: 6 }}>
          <Text variant="title">Vocabulary Builder</Text>
          <Text color={theme.colors.textMuted}>
            Sign in to your learning space.
          </Text>
        </View>
        <Card>
          <TextField
            autoCapitalize="none"
            autoComplete="username"
            label="Username"
            onChangeText={setUsername}
            value={username}
          />
          <TextField
            autoComplete="current-password"
            error={error || undefined}
            label="Password"
            onChangeText={setPassword}
            onSubmitEditing={() => void submit()}
            returnKeyType="go"
            secureTextEntry
            value={password}
          />
          <Button
            disabled={submitting}
            label={submitting ? "Signing in…" : "Sign in"}
            onPress={() => void submit()}
          />
        </Card>
        <Text
          color={theme.colors.textMuted}
          style={{ textAlign: "center" }}
          variant="caption"
        >
          Progress stays on this device and is kept separate for each account.
        </Text>
      </View>
    </Page>
  );
}
