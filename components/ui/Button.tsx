import { Pressable, StyleSheet, View } from "react-native";

import { useAppTheme } from "@/lib/theme";
import { Text } from "@/components/ui/Text";

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
};

export function Button({
  disabled,
  label,
  onPress,
  variant = "primary",
}: ButtonProps) {
  const theme = useAppTheme();
  const variantStyles = {
    primary: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
      textColor: theme.colors.white,
    },
    secondary: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.borderStrong,
      textColor: theme.colors.text,
    },
    ghost: {
      backgroundColor: "transparent",
      borderColor: "transparent",
      textColor: theme.colors.primary,
    },
    danger: {
      backgroundColor: theme.colors.danger,
      borderColor: theme.colors.danger,
      textColor: theme.colors.white,
    },
  }[variant];

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <View>
        <Text color={variantStyles.textColor} variant="bodyStrong">
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
  },
});
